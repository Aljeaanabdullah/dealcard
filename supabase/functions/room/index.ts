// دالة الخادم (Supabase Edge Function): الخادم هو الحكم.
// كل حركة توصل هنا، تتحقق بنفس المحرك، ثم تنحفظ وتنبث لكل لاعب بلقطته (يده فقط).
//
// تنبيه: هذا الملف ما انختبر، يحتاج مشروع Supabase حقيقي. منطق الغرفة نفسه مختبر في src/net/__tests__.
// قبل النشر: npm run build:server  (يولّد ../_shared/game.js)
// مفتاح service_role يجي من متغيرات بيئة الخادم فقط، وما ينحط داخل التطبيق أبداً.

import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  createRng,
  createRoom,
  generateRoomCode,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick,
} from '../_shared/game.js';

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
  readonly seats: readonly { readonly playerId: string | null }[];
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
  const now = Date.now();

  /** يحفظ الغرفة (مع فحص النسخة) ويكتب لقطة كل لاعب بشري. */
  async function save(room: RoomLike, version: number | null): Promise<boolean> {
    if (version === null) {
      const { error } = await admin.from('rooms').insert({ code: room.code, state: room, version: 1 });
      if (error) return false;
    } else {
      const { data, error } = await admin
        .from('rooms')
        .update({ state: room, version: version + 1, updated_at: new Date(now).toISOString() })
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
      const created = createRoom(code, playerId, String(body.name ?? ''));
      if (!created.ok) return json(created);
      if (await save(created.room, null)) return json({ ok: true, snapshot: snapshotFor(created.room, playerId) });
    }
    return json({ ok: false, error: 'network' }, 500);
  }

  const code = String(body.code ?? '').toUpperCase();

  // نعيد المحاولة إذا لاعب ثاني حفظ بنفس اللحظة (فحص النسخة).
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row } = await admin.from('rooms').select('state, version').eq('code', code).maybeSingle();
    if (!row) return json({ ok: false, error: 'notInRoom' }, 404);
    const room = row.state as RoomLike;

    let result: ActionResult;
    switch (action) {
      case 'join':
        result = joinRoom(room, playerId, String(body.name ?? ''));
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
