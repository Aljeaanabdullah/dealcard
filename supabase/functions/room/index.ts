// دالة الخادم (Supabase Edge Function): الخادم هو الحكم.
// كل حركة توصل هنا، تتحقق بنفس المحرك، ثم تنحفظ وتنبث لكل لاعب بلقطته (يده فقط).
//
// حزمة المحرك (supabase/functions/_shared/game.js) تنستورد من المستودع مثبتة على رقم commit،
// عشان النشر ما يحتاج رفع الحزمة باليد. إذا تغيّر المحرك: npm run build:server، ارفع، وحدّث الرقم هنا ثم انشر.
// مفتاح service_role يجي من متغيرات بيئة الخادم فقط، وما ينحط داخل التطبيق أبداً.

import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  createMatchRoom,
  createRng,
  createRoom,
  generateRoomCode,
  isOpenMatch,
  joinMatchRoom,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick,
} from 'https://raw.githubusercontent.com/Aljeaanabdullah/dealcard/98f9418e969d0eaca6dceaaa79f1f9c72fe43661/supabase/functions/_shared/game.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** أقل شكل نحتاجه من الغرفة هنا. التفاصيل الكاملة داخل الحزمة المختبرة. */
interface RoomLike {
  readonly code: string;
  readonly status: string;
  readonly winTarget?: number;
  readonly seats: readonly { readonly playerId: string | null }[];
  /** غرفة لعب عشوائي */
  readonly match?: unknown;
}

interface ActionResult {
  readonly ok: boolean;
  readonly room?: RoomLike;
  readonly error?: string;
  readonly unchanged?: boolean;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // هوية اللاعب من توكن الدخول (ضيف)، مو من اللي يرسله التطبيق.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: auth } = await admin.auth.getUser(token);
  const playerId = auth?.user?.id;
  if (!playerId) return json({ ok: false, error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  // رقم الشخصية اللي اختارها اللاعب؛ المحرك يرجّع أي قيمة غلط للافتراضية.
  const avatar = Number(body.avatar);
  const now = Date.now();

  /** يحفظ الغرفة (مع فحص النسخة) ويكتب لقطة كل لاعب بشري. */
  async function save(room: RoomLike, version: number | null): Promise<boolean> {
    // أعمدة مساعدة للطابور العشوائي ولمعرفة غرفة اللاعب الحالية.
    const columns = {
      state: room,
      status: room.status,
      matchmaking: Boolean(room.match),
      seat_count: room.seats.length,
      player_ids: room.seats.map((seat) => seat.playerId).filter((id) => id !== null),
    };
    if (version === null) {
      const { error } = await admin.from('rooms').insert({ code: room.code, version: 1, ...columns });
      if (error) return false;
    } else {
      const { data, error } = await admin
        .from('rooms')
        .update({ ...columns, version: version + 1, updated_at: new Date(now).toISOString() })
        .eq('code', room.code)
        .eq('version', version)
        .select('code');
      if (error || !data || data.length === 0) return false;
    }
    const rows = room.seats
      .filter((seat) => seat.playerId !== null)
      .map((seat) => ({
        room_code: room.code,
        user_id: seat.playerId,
        snapshot: snapshotFor(room, seat.playerId),
        version: (version ?? 0) + 1,
        updated_at: new Date(now).toISOString(),
      }));
    if (rows.length > 0) await admin.from('player_views').upsert(rows);
    return true;
  }

  if (action === 'create') {
    // نجرب أكثر من كود لين نلقى واحد مو مستخدم.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode(createRng(randomSeed()));
      const created = createRoom(code, playerId, String(body.name ?? ''), avatar);
      if (!created.ok) return json(created);
      if (await save(created.room, null)) return json({ ok: true, snapshot: snapshotFor(created.room, playerId) });
    }
    return json({ ok: false, error: 'network' }, 500);
  }

  // اللعب العشوائي: طابور يجمع اللاعبين في غرف من 4.
  if (action === 'random') {
    const name = String(body.name ?? '');
    // شرط الفوز يختاره اللاعب قبل البحث (6 أو 8)، وينحط مع لاعبين اختاروا نفس الشرط.
    const winTarget = Number(body.winTarget);
    for (let attempt = 0; attempt < 5; attempt++) {
      // لاعب ما يدخل مباراتين بنفس الوقت: إذا هو داخل غرفة ما انتهت يرجع لها.
      const { data: mine } = await admin
        .from('rooms')
        .select('state')
        .contains('player_ids', [playerId])
        .in('status', ['lobby', 'playing'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mine) return json({ ok: true, snapshot: snapshotFor(mine.state, playerId) });

      // أقدم غرفة عشوائية مفتوحة وفيها مكان. الغرف اللي خلصت مهلتها وما بدأت تنتجاهل.
      const { data: candidates } = await admin
        .from('rooms')
        .select('state, version')
        .eq('matchmaking', true)
        .eq('status', 'lobby')
        .gt('seat_count', 0)
        .lt('seat_count', 4)
        .order('updated_at', { ascending: false })
        .limit(40);
      const open = (candidates ?? [])
        .filter((row) => isOpenMatch(row.state, now) && (row.state as RoomLike).winTarget === winTarget)
        .pop();

      if (open) {
        const joined: ActionResult = joinMatchRoom(open.state, playerId, name, now, avatar);
        if (!joined.ok) return json(joined);
        if (!joined.room) return json({ ok: false, error: 'network' }, 500);
        // إذا لاعب ثاني دخل بنفس اللحظة نعيد المحاولة.
        if (await save(joined.room, open.version)) return json({ ok: true, snapshot: snapshotFor(joined.room, playerId) });
        continue;
      }

      const created: ActionResult = createMatchRoom(generateRoomCode(createRng(randomSeed())), playerId, name, winTarget, randomSeed(), now, avatar);
      if (!created.ok) return json(created);
      if (!created.room) return json({ ok: false, error: 'network' }, 500);
      if (await save(created.room, null)) return json({ ok: true, snapshot: snapshotFor(created.room, playerId) });
    }
    return json({ ok: false, error: 'network' }, 409);
  }

  const code = String(body.code ?? '').toUpperCase();

  // نعيد المحاولة إذا لاعب ثاني حفظ بنفس اللحظة (فحص النسخة).
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row } = await admin.from('rooms').select('state, version').eq('code', code).maybeSingle();
    // أخطاء اللعب ترجع بحالة 200 مع ok: false عشان التطبيق يقرأ سببها (غير 200 = خطأ اتصال).
    if (!row) return json({ ok: false, error: 'notInRoom' });
    const room = row.state as RoomLike;

    let result: ActionResult;
    switch (action) {
      case 'join':
        result = joinRoom(room, playerId, String(body.name ?? ''), avatar);
        break;
      case 'setWinTarget':
        result = setWinTarget(room, playerId, Number(body.winTarget));
        break;
      case 'start':
        result = startRoom(room, playerId, randomSeed(), now);
        break;
      case 'move':
        result = submitMove(room, playerId, body.move, now);
        break;
      case 'leave':
        result = leaveRoom(room, playerId);
        break;
      case 'tick': {
        const next = tick(room, now);
        result = { ok: true, room: next, unchanged: next === room };
        break;
      }
      case 'view':
        result = { ok: true, room, unchanged: true };
        break;
      default:
        return json({ ok: false, error: 'unknownAction' }, 400);
    }

    if (!result.ok) return json(result);
    if (!result.room) return json({ ok: false, error: 'network' }, 500);
    if (result.unchanged || (await save(result.room, row.version))) {
      // اللاعب اللي طلع ما له لقطة بعدها.
      if (action === 'leave') await admin.from('player_views').delete().eq('room_code', code).eq('user_id', playerId);
      return json({ ok: true, snapshot: snapshotFor(result.room, playerId) });
    }
  }
  return json({ ok: false, error: 'network' }, 409);
});
