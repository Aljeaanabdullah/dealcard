// اختبارات اللعب العشوائي — plan.md المرحلة 9
// تنختبر هنا على خادم داخل الذاكرة (نفس منطق الغرفة). تجربة 4 أجهزة حقيقية تبقى على صاحب المشروع.
import { MATCH_WAIT_SECONDS } from '../../data/rules';
import { allCards } from '../../engine/state';
import { joinRandomMatch } from '../matchmaking';
import { createMemoryHost, type MemoryHost } from '../memoryHost';
import {
  createMatchRoom,
  createRoom,
  isOpenMatch,
  setWinTarget,
  startRoom,
  tick,
  type Room,
  type RoomSnapshot,
} from '../room';
import type { NetResult } from '../transport';

const WAIT_MS = MATCH_WAIT_SECONDS * 1000;

function snapshot(result: NetResult): RoomSnapshot {
  if (!result.ok || !result.snapshot) throw new Error(`انرفض: ${result.ok ? 'بدون لقطة' : result.error}`);
  return result.snapshot;
}

/** خادم بوقت نتحكم فيه. */
function host(): { readonly server: MemoryHost; advance(ms: number): void; now(): number } {
  let clock = 1000;
  return {
    server: createMemoryHost(7, () => clock),
    advance: (ms) => {
      clock += ms;
    },
    now: () => clock,
  };
}

async function joinAll(server: MemoryHost, ids: readonly string[], winTarget = 6): Promise<RoomSnapshot[]> {
  const results: RoomSnapshot[] = [];
  for (const id of ids) {
    results.push(snapshot(await server.transportFor(id).joinRandom(`لاعب ${id}`, winTarget)));
  }
  return results;
}

describe('طابور اللعب العشوائي', () => {
  it('4 لاعبين يضغطون "لعب عشوائي" ويدخلون نفس المباراة، وتبدأ مباشرة بدون بوتات', async () => {
    const { server } = host();
    const joined = await joinAll(server, ['a', 'b', 'c', 'd']);

    const codes = new Set(joined.map((s) => s.code));
    expect(codes.size).toBe(1);
    // أول ثلاثة كانوا ينتظرون، والرابع كمّل العدد فبدأت
    expect(joined.map((s) => s.status)).toEqual(['lobby', 'lobby', 'lobby', 'playing']);
    expect(joined.map((s) => s.mySeat)).toEqual([0, 1, 2, 3]);

    const room = server.roomOf(joined[0]?.code ?? '');
    expect(room?.status).toBe('playing');
    expect(room?.seats.map((s) => s.isBot)).toEqual([false, false, false, false]);
    expect(room?.seats.map((s) => s.playerId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('اللاعب يختار شرط الفوز قبل البحث (6 أو 8)، وما يتغير بعدها وما تبدأ اللعبة يدوياً', async () => {
    const { server, now } = host();
    const [first] = await joinAll(server, ['a'], 8);
    expect(first?.winTarget).toBe(8);
    expect(first?.matchmaking).toBe(true);

    const room = server.roomOf(first?.code ?? '');
    if (!room) throw new Error('ما فيه غرفة');
    expect(setWinTarget(room, 'a', 6)).toEqual({ ok: false, error: 'fixedWinTarget' });
    expect(startRoom(room, 'a', 1, now())).toEqual({ ok: false, error: 'notHost' });

    await joinAll(server, ['b', 'c', 'd'], 8);
    expect(server.roomOf(first?.code ?? '')?.game?.winTarget).toBe(8);
  });

  it('اللي اختار 6 ما ينحط مع اللي اختار 8: كل شرط له غرفته', async () => {
    const { server } = host();
    const [six] = await joinAll(server, ['a'], 6);
    const [eight] = await joinAll(server, ['b'], 8);
    expect(eight?.code).not.toBe(six?.code);
    expect(six?.winTarget).toBe(6);
    expect(eight?.winTarget).toBe(8);

    const [sixAgain] = await joinAll(server, ['c'], 6);
    const [eightAgain] = await joinAll(server, ['d'], 8);
    expect(sixAgain?.code).toBe(six?.code);
    expect(eightAgain?.code).toBe(eight?.code);
  });

  it('شرط فوز غير 6 أو 8 ينرفض', async () => {
    const { server } = host();
    expect(await server.transportFor('a').joinRandom('لاعب', 7)).toEqual({ ok: false, error: 'invalidWinTarget' });
  });

  it('جهاز واحد لوحده: بعد 30 ثانية تبدأ المباراة مع 3 بوتات', async () => {
    const { server, now } = host();
    const [mine] = await joinAll(server, ['solo']);
    const code = mine?.code ?? '';
    expect(mine?.status).toBe('lobby');
    expect(mine?.matchDeadline).toBe(now() + WAIT_MS);

    const waiting = server.roomOf(code);
    if (!waiting) throw new Error('ما فيه غرفة');
    // قبل 30 ثانية: ما يبدأ
    expect(tick(waiting, now() + WAIT_MS - 1)).toBe(waiting);
    // عند 30 ثانية: يبدأ والبوتات تكمل العدد
    const started = tick(waiting, now() + WAIT_MS);
    expect(started.status).toBe('playing');
    expect(started.seats.map((s) => s.isBot)).toEqual([false, true, true, true]);
    expect(started.game?.winTarget).toBe(6);
    if (!started.game) throw new Error('ما فيه لعبة');
    expect(new Set(allCards(started.game).map((c) => c.id)).size).toBe(132);
  });

  it('لاعبين ينتظرون: بعد 30 ثانية من فتح الغرفة تبدأ مع بوتين', async () => {
    const { server, advance, now } = host();
    const [first] = await joinAll(server, ['a']);
    advance(20000);
    await joinAll(server, ['b']);
    const room = server.roomOf(first?.code ?? '');
    if (!room) throw new Error('ما فيه غرفة');
    // المهلة من فتح الغرفة (أول لاعب)، مو من آخر واحد دخل
    expect(tick(room, now() + 9999)).toBe(room);
    const started = tick(room, now() + 10000);
    expect(started.status).toBe('playing');
    expect(started.seats.map((s) => s.isBot)).toEqual([false, false, true, true]);
  });

  it('5 لاعبين بالطابور: 4 يدخلون مباراة والخامس يكمل انتظاره صح', async () => {
    const { server, now } = host();
    const joined = await joinAll(server, ['a', 'b', 'c', 'd', 'e']);

    const firstCode = joined[0]?.code ?? '';
    const fifth = joined[4];
    expect(joined.slice(0, 4).every((s) => s.code === firstCode)).toBe(true);
    expect(server.roomOf(firstCode)?.status).toBe('playing');

    // الخامس بغرفة جديدة ينتظر
    expect(fifth?.code).not.toBe(firstCode);
    expect(fifth?.status).toBe('lobby');
    expect(fifth?.mySeat).toBe(0);
    const waiting = server.roomOf(fifth?.code ?? '');
    expect(waiting?.seats.map((s) => s.playerId)).toEqual(['e']);

    // لاعب سادس يدخل مع الخامس، مو بالمباراة اللي بدأت
    const [sixth] = await joinAll(server, ['f']);
    expect(sixth?.code).toBe(fifth?.code);

    // وبعد المهلة يبدأون مع بوتين
    const room = server.roomOf(fifth?.code ?? '');
    if (!room) throw new Error('ما فيه غرفة');
    expect(tick(room, now() + WAIT_MS).seats.map((s) => s.isBot)).toEqual([false, false, true, true]);
  });

  it('إلغاء البحث يطلّع اللاعب من الطابور وما يدخل مباراة', async () => {
    const { server } = host();
    const [first] = await joinAll(server, ['a']);
    const code = first?.code ?? '';
    await joinAll(server, ['b']);

    // b يلغي
    const left = await server.transportFor('b').leave(code);
    expect(left.ok && left.snapshot).toBeNull();
    expect(server.roomOf(code)?.seats.map((s) => s.playerId)).toEqual(['a']);

    // تكتمل الغرفة بثلاثة غيره، و b مو منهم
    await joinAll(server, ['c', 'd', 'e']);
    const room = server.roomOf(code);
    expect(room?.status).toBe('playing');
    expect(room?.seats.map((s) => s.playerId)).toEqual(['a', 'c', 'd', 'e']);
    expect(room?.game?.players).toHaveLength(4);
  });

  it('إذا كل اللي بالغرفة ألغوا: الغرفة الفاضية ما تبدأ وما يدخلها أحد', async () => {
    const { server, now } = host();
    const [first] = await joinAll(server, ['a']);
    const code = first?.code ?? '';
    await server.transportFor('a').leave(code);

    const empty = server.roomOf(code);
    if (!empty) throw new Error('ما فيه غرفة');
    expect(empty.seats).toHaveLength(0);
    expect(isOpenMatch(empty, now())).toBe(false);
    expect(tick(empty, now() + WAIT_MS * 10)).toBe(empty);

    // لاعب جديد تنفتح له غرفة جديدة بمهلة كاملة
    const [next] = await joinAll(server, ['z']);
    expect(next?.code).not.toBe(code);
    expect(next?.matchDeadline).toBe(now() + WAIT_MS);
  });

  it('لاعب ما يدخل مباراتين بنفس الوقت: الضغط مرة ثانية يرجّعه لنفس الغرفة', async () => {
    const { server } = host();
    const [first] = await joinAll(server, ['a']);
    const [again] = await joinAll(server, ['a']);
    expect(again?.code).toBe(first?.code);
    expect(server.roomOf(first?.code ?? '')?.seats).toHaveLength(1);

    // وبعد ما تبدأ المباراة: يرجع لنفس مباراته، وما تنفتح له غرفة ثانية
    await joinAll(server, ['b', 'c', 'd']);
    const [during] = await joinAll(server, ['a']);
    expect(during?.code).toBe(first?.code);
    expect(during?.status).toBe('playing');
    expect(during?.mySeat).toBe(0);
  });

  it('اللاعب اللي داخل غرفة خاصة ما ينحط بمباراة عشوائية بعد', async () => {
    const { server } = host();
    const privateRoom = snapshot(await server.transportFor('a').createRoom('صاحب غرفة'));
    const [random] = await joinAll(server, ['a']);
    expect(random?.code).toBe(privateRoom.code);
    expect(random?.matchmaking).toBe(false);
  });

  it('الغرفة الخاصة بكود ما تدخل بالطابور العشوائي', async () => {
    const { server } = host();
    const privateRoom = snapshot(await server.transportFor('host').createRoom('صاحب غرفة'));
    const [random] = await joinAll(server, ['a']);
    expect(random?.code).not.toBe(privateRoom.code);
    expect(server.roomOf(privateRoom.code)?.seats).toHaveLength(1);
  });

  it('غرفة خلصت مهلتها وما بدأت (لاعبها سكّر التطبيق): اللاعب الجديد ما يدخلها', async () => {
    const { server, advance, now } = host();
    const [ghost] = await joinAll(server, ['ghost']);
    const stale = server.roomOf(ghost?.code ?? '');
    if (!stale) throw new Error('ما فيه غرفة');

    // قبل المهلة الغرفة مفتوحة، وبعدها لا
    expect(isOpenMatch(stale, now() + WAIT_MS - 1)).toBe(true);
    expect(isOpenMatch(stale, now() + WAIT_MS)).toBe(false);

    // مرت دقيقتين وما أحد حرّك الغرفة: اللاعب الجديد تنفتح له غرفة جديدة
    advance(120000);
    const [fresh] = await joinAll(server, ['new']);
    expect(fresh?.code).not.toBe(ghost?.code);
    expect(fresh?.matchDeadline).toBe(now() + WAIT_MS);
    expect(server.roomOf(ghost?.code ?? '')?.seats.map((s) => s.playerId)).toEqual(['ghost']);
  });

  it('بدون اسم ينرفض', async () => {
    const { server } = host();
    expect(await server.transportFor('a').joinRandom('  ', 6)).toEqual({ ok: false, error: 'nameRequired' });
  });
});

describe('اختيار الغرفة', () => {
  function matchRoom(code: string, playerId: string, openedAt: number): Room {
    const created = createMatchRoom(code, playerId, 'لاعب', 6, 5, openedAt);
    if (!created.ok) throw new Error(created.error);
    return created.room;
  }

  it('اللاعب يدخل أقدم غرفة مفتوحة', () => {
    const rooms = [matchRoom('NEWER', 'x', 9000), matchRoom('OLDER', 'y', 1000)];
    const result = joinRandomMatch(rooms, 'me', 'أنا', 6, 'FRESH', 1, 10000);
    expect(result.ok && result.room.code).toBe('OLDER');
    expect(result.ok && result.changed).toBe(true);
  });

  it('إذا ما فيه غرفة مفتوحة تنفتح غرفة جديدة بالكود المعطى', () => {
    const privateRoom = createRoom('PRIV8', 'host', 'صاحب');
    if (!privateRoom.ok) throw new Error(privateRoom.error);
    const result = joinRandomMatch([privateRoom.room], 'me', 'أنا', 6, 'FRESH', 1, 10000);
    expect(result.ok && result.room.code).toBe('FRESH');
    expect(result.ok && result.room.match).toEqual({ openedAt: 10000, seed: 1 });
  });

  it('اللاعب الموجود بغرفة ما انتهت يرجع لها بدون تغيير', () => {
    const mine = matchRoom('MINE1', 'me', 1000);
    const result = joinRandomMatch([matchRoom('OTHER', 'x', 500), mine], 'me', 'أنا', 6, 'FRESH', 1, 10000);
    expect(result).toEqual({ ok: true, room: mine, changed: false });
  });
});
