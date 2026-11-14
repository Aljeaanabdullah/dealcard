// تجربة فعلية للخادم على Supabase: لاعبين ضيوف، غرفة بكود، ومباراة كاملة مع بوتين.
// التشغيل: node --env-file=.env scripts/online-check.mjs
// يستخدم المفاتيح العامة من .env فقط، نفس اللي يستخدمها التطبيق.
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('عبّ .env أول');

async function guest(label) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`دخول الضيف ${label} فشل: ${error.message}`);
  const call = async (body) => {
    const { data: result, error: callError } = await client.functions.invoke('room', { body });
    if (callError) {
      const text = await callError.context?.text?.().catch(() => '');
      return { ok: false, error: `http: ${callError.message} ${text ?? ''}` };
    }
    return result;
  };
  return { client, id: data.user.id, call };
}

function check(condition, message) {
  if (!condition) throw new Error(`فشل: ${message}`);
  console.log(`  ok  ${message}`);
}

const a = await guest('A');
const b = await guest('B');
const c = await guest('C');
console.log('دخول 3 ضيوف نجح');

// إنشاء غرفة ودخول بالكود
const created = await a.call({ action: 'create', name: 'لاعب أ' });
check(created.ok && created.snapshot.status === 'lobby', `إنشاء غرفة: ${JSON.stringify(created.error ?? created.snapshot.code)}`);
const code = created.snapshot.code;
check((await b.call({ action: 'join', code: code.toLowerCase(), name: 'لاعب ب' })).ok, 'دخول لاعب ثاني بالكود');
check((await b.call({ action: 'join', code: 'ZZZZZ', name: 'x' })).error === 'notInRoom', 'كود غلط ينرفض');

// الصلاحيات
check((await b.call({ action: 'setWinTarget', code, winTarget: 8 })).error === 'notHost', 'غير صاحب الغرفة ما يغيّر شرط الفوز');
check((await b.call({ action: 'start', code })).error === 'notHost', 'غير صاحب الغرفة ما يبدأ اللعبة');
check((await c.call({ action: 'view', code })).snapshot === null, 'لاعب مو بالغرفة ما يستلم لقطة');

// RLS: التطبيق ما يقرأ حالة الغرفة الكاملة، ويقرأ لقطته فقط
const rooms = await a.client.from('rooms').select('code');
check((rooms.data ?? []).length === 0, 'جدول rooms (الحالة الكاملة) مقفول على التطبيق');
const views = await a.client.from('player_views').select('user_id');
check(views.data?.length === 1 && views.data[0].user_id === a.id, 'اللاعب يقرأ صف لقطته فقط');

// بدء اللعبة
const started = await a.call({ action: 'start', code });
check(started.ok && started.snapshot.status === 'playing', 'صاحب الغرفة يبدأ اللعبة');
check(started.snapshot.seats.map((s) => s.isBot).join() === 'false,false,true,true', 'البوتات تكمل العدد إلى 4');

// إخفاء الأيدي
const mine = started.snapshot;
const others = mine.state.players.filter((p) => p.seat !== mine.mySeat);
check(mine.state.players[mine.mySeat].hand.every((card) => !card.id.startsWith('hidden:')), 'يدي واصلة كاملة');
check(others.every((p) => p.hand.every((card) => card.id.startsWith('hidden:'))), 'أيدي الباقين مخفية');
check(mine.state.drawPile.every((card) => card.id.startsWith('hidden:')), 'كومة السحب مخفية');

// حركة مخالفة مرسلة مباشرة للخادم
const illegal = await a.call({ action: 'move', code, move: { type: 'bankMoney', seat: 0, cardId: 'money:10:1' } });
check(illegal.ok === false, `حركة مخالفة تنرفض (${illegal.error})`);

// مباراة كاملة: اللاعبين يلعبون من الحركات اللي يرسلها الخادم، والنبضات تحرك البوتات
let status = 'playing';
let steps = 0;
let moves = 0;
const startedAt = Date.now();
while (status === 'playing' && steps < 4000) {
  steps++;
  let moved = false;
  for (const player of [a, b]) {
    const view = await player.call({ action: 'view', code });
    if (!view.ok) throw new Error(`view: ${view.error}`);
    status = view.snapshot.status;
    if (status !== 'playing') break;
    const options = view.snapshot.moves;
    if (options.length === 0) continue;
    // أفضلية بسيطة عشان المباراة تخلص: عقار، ثم أي حركة غير الحرق
    const pick =
      options.find((m) => m.type === 'draw') ??
      options.find((m) => m.type === 'playProperty') ??
      options.find((m) => m.type === 'pay') ??
      options.find((m) => m.type === 'bankMoney') ??
      options.find((m) => m.type === 'endTurn') ??
      options.find((m) => m.type === 'discard') ??
      options[0];
    const result = await player.call({ action: 'move', code, move: pick });
    if (!result.ok) throw new Error(`حركة قانونية انرفضت: ${result.error} ${JSON.stringify(pick)}`);
    moves++;
    moved = true;
    status = result.snapshot.status;
    break;
  }
  if (!moved && status === 'playing') {
    const ticked = await a.call({ action: 'tick', code });
    if (!ticked.ok) throw new Error(`tick: ${ticked.error}`);
    status = ticked.snapshot.status;
    // البوت يلعب حركة كل 700 ملي ثانية
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (steps % 100 === 0) console.log(`  ... خطوة ${steps}، حركات اللاعبين ${moves}، ${Math.round((Date.now() - startedAt) / 1000)} ثانية`);
  if (Date.now() - startedAt > 8 * 60 * 1000) break;
}

const final = await a.call({ action: 'view', code });
console.log(`الحالة النهائية: ${final.snapshot.status} — الفائز مقعد ${final.snapshot.state.winner} — خطوات ${steps} — حركات اللاعبين ${moves}`);

// خروج لاعب: البوت يستلم مكانه
const left = await b.call({ action: 'leave', code });
check(left.ok, 'خروج لاعب من الغرفة');
const after = await a.call({ action: 'view', code });
check(after.snapshot.seats[1].isBot === true, 'البوت استلم مكان اللاعب اللي طلع');
console.log('انتهت تجربة الغرفة الخاصة');

// ---------------- اللعب العشوائي (المرحلة 9) ----------------
console.log('اللعب العشوائي:');
const r1 = await guest('R1');
const r2 = await guest('R2');

const first = await r1.call({ action: 'random', name: 'عشوائي 1' });
check(first.ok && first.snapshot.status === 'lobby' && first.snapshot.matchmaking === true, 'أول لاعب يدخل الطابور وينتظر');
check(first.snapshot.winTarget === 6, 'شرط الفوز الثابت 6 أطقم');
const matchCode = first.snapshot.code;
const openedAt = Date.now();

const second = await r2.call({ action: 'random', name: 'عشوائي 2' });
check(second.ok && second.snapshot.code === matchCode, 'اللاعب الثاني يدخل نفس الغرفة');
check(second.snapshot.seats.length === 2, 'الغرفة فيها لاعبين');

const again = await r1.call({ action: 'random', name: 'عشوائي 1' });
check(again.ok && again.snapshot.code === matchCode && again.snapshot.seats.length === 2, 'الضغط مرة ثانية يرجّع لنفس الغرفة (ما يدخل مباراتين)');

check((await r1.call({ action: 'setWinTarget', code: matchCode, winTarget: 8 })).error === 'fixedWinTarget', 'شرط الفوز ما يتغير بالعشوائي');
check((await r1.call({ action: 'start', code: matchCode })).error === 'notHost', 'اللعبة ما تبدأ يدوياً بالعشوائي');

// إلغاء البحث
check((await r2.call({ action: 'leave', code: matchCode })).ok, 'اللاعب الثاني يلغي البحث');
const afterCancel = await r1.call({ action: 'view', code: matchCode });
check(afterCancel.snapshot.seats.length === 1, 'اللاعب اللي ألغى طلع من الطابور');

// قبل 30 ثانية ما تبدأ
const early = await r1.call({ action: 'tick', code: matchCode });
check(early.snapshot.status === 'lobby', 'قبل 30 ثانية المباراة ما تبدأ');

// ننتظر لين تخلص المهلة ثم نبضة
const waitMs = Math.max(0, 31000 - (Date.now() - openedAt));
console.log(`  ... ننتظر ${Math.round(waitMs / 1000)} ثانية لين تخلص مهلة الطابور`);
await new Promise((resolve) => setTimeout(resolve, waitMs));
const begun = await r1.call({ action: 'tick', code: matchCode });
check(begun.ok && begun.snapshot.status === 'playing', 'بعد 30 ثانية المباراة تبدأ');
check(begun.snapshot.seats.map((s) => s.isBot).join() === 'false,true,true,true', 'البوتات كملت العدد: لاعب واحد و3 بوتات');
check(begun.snapshot.state.winTarget === 6, 'المباراة شرطها 6 أطقم');

const during = await r1.call({ action: 'random', name: 'عشوائي 1' });
check(during.ok && during.snapshot.code === matchCode && during.snapshot.status === 'playing', 'اللاعب اللي بمباراة يرجع لمباراته');

// اللاعب اللي ألغى يدخل غرفة جديدة، مو المباراة اللي بدأت
const fresh = await r2.call({ action: 'random', name: 'عشوائي 2' });
check(fresh.ok && fresh.snapshot.code !== matchCode && fresh.snapshot.status === 'lobby', 'اللاعب الجديد تنفتح له غرفة جديدة');

// تنظيف: نطلع من الغرف عشان ما تبقى معلّقة
await r2.call({ action: 'leave', code: fresh.snapshot.code });
await r1.call({ action: 'leave', code: matchCode });
console.log('انتهت التجربة');
