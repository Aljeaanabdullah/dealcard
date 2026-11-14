// اختبارات منطق الغرفة والحكم — plan.md المرحلة 8
// تنختبر هنا كدوال خالصة (بدون شبكة). التجربة على 4 أجهزة حقيقية ومع Supabase تبقى على صاحب المشروع.
import { buildDeck } from '../../data/cards';
import { TURN_SECONDS } from '../../data/rules';
import type { Move } from '../../engine/moves';
import { createRng, randomInt } from '../../engine/rng';
import { allCards } from '../../engine/state';
import { giveFullSet, place, placeAll, readyState } from '../../testing/helpers';
import { isHiddenCard } from '../mask';
import {
  BOT_DELAY_MS,
  createRoom,
  generateRoomCode,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick,
  type Room,
  type RoomResult,
} from '../room';

function ok(result: RoomResult): Room {
  if (!result.ok) throw new Error(`انرفض: ${result.error}`);
  return result.room;
}

function errorOf(result: RoomResult): string | null {
  return result.ok ? null : result.error;
}

function lobby(players: readonly string[]): Room {
  let room = ok(createRoom('ABCDE', players[0] ?? 'p0', 'لاعب 0'));
  players.slice(1).forEach((id, index) => {
    room = ok(joinRoom(room, id, `لاعب ${index + 1}`));
  });
  return room;
}

function started(players: readonly string[], seed = 7): Room {
  return ok(startRoom(lobby(players), players[0] ?? 'p0', seed, 1000));
}

describe('كود الغرفة', () => {
  it('5 خانات بدون الحروف والأرقام المتشابهة، ونفس البذرة تعطي نفس الكود', () => {
    const code = generateRoomCode(createRng(3));
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
    expect(generateRoomCode(createRng(3))).toBe(code);
    expect(generateRoomCode(createRng(4))).not.toBe(code);
  });
});

describe('غرفة الانتظار', () => {
  it('إنشاء غرفة ودخول بالكود لين 4 لاعبين، والخامس ينرفض', () => {
    const room = lobby(['p0', 'p1', 'p2', 'p3']);
    expect(room.seats.map((s) => s.name)).toEqual(['لاعب 0', 'لاعب 1', 'لاعب 2', 'لاعب 3']);
    expect(room.status).toBe('lobby');
    expect(errorOf(joinRoom(room, 'p4', 'خامس'))).toBe('roomFull');
  });

  it('الدخول ينرفض بدون اسم، أو إذا اللاعب داخل أصلاً، أو بعد ما بدأت اللعبة', () => {
    const room = lobby(['p0', 'p1']);
    expect(errorOf(createRoom('ABCDE', 'p0', '  '))).toBe('nameRequired');
    expect(errorOf(joinRoom(room, 'p2', ''))).toBe('nameRequired');
    expect(errorOf(joinRoom(room, 'p1', 'مكرر'))).toBe('alreadyJoined');
    expect(errorOf(joinRoom(started(['p0', 'p1']), 'p2', 'متأخر'))).toBe('alreadyStarted');
  });

  it('شرط الفوز يختاره صاحب الغرفة فقط: 6 أو 8', () => {
    const room = lobby(['p0', 'p1']);
    expect(room.winTarget).toBe(6);
    expect(ok(setWinTarget(room, 'p0', 8)).winTarget).toBe(8);
    expect(errorOf(setWinTarget(room, 'p1', 8))).toBe('notHost');
    expect(errorOf(setWinTarget(room, 'p0', 7))).toBe('invalidWinTarget');
  });

  it('صاحب الغرفة فقط يبدأ اللعبة، وما تبدأ مرتين', () => {
    const room = lobby(['p0', 'p1']);
    expect(errorOf(startRoom(room, 'p1', 1, 0))).toBe('notHost');
    expect(errorOf(startRoom(started(['p0', 'p1']), 'p0', 1, 0))).toBe('alreadyStarted');
  });

  it('لاعب يطلع قبل البداية ينشال، وإذا هو صاحب الغرفة تنتقل للي بعده', () => {
    const room = ok(leaveRoom(lobby(['p0', 'p1', 'p2']), 'p0'));
    expect(room.seats.map((s) => s.playerId)).toEqual(['p1', 'p2']);
    expect(room.hostId).toBe('p1');
  });
});

describe('بدء اللعبة', () => {
  it('البوتات تكمل العدد إلى 4 عند البدء', () => {
    const room = started(['p0', 'p1']);
    expect(room.status).toBe('playing');
    expect(room.seats.map((s) => s.isBot)).toEqual([false, false, true, true]);
    expect(room.game?.players).toHaveLength(4);
    expect(room.game?.winTarget).toBe(6);
    expect(room.turnDeadline).toBe(1000 + TURN_SECONDS * 1000);
  });

  it('شرط الفوز المختار ينتقل للعبة', () => {
    const room = ok(startRoom(ok(setWinTarget(lobby(['p0']), 'p0', 8)), 'p0', 5, 0));
    expect(room.game?.winTarget).toBe(8);
  });
});

describe('إخفاء اليد: كل لاعب يستلم يده فقط', () => {
  it('البيانات الواصلة للجهاز ما فيها يد لاعب ثاني ولا ترتيب كومة السحب ولا البذرة', () => {
    const room = started(['p0', 'p1', 'p2', 'p3']);
    const game = room.game;
    if (!game) throw new Error('ما فيه لعبة');

    for (const [index, id] of ['p0', 'p1', 'p2', 'p3'].entries()) {
      const snapshot = snapshotFor(room, id);
      if (!snapshot?.state) throw new Error('ما فيه لقطة');
      const sent = JSON.stringify(snapshot);

      // يدي واصلة كاملة
      expect(snapshot.state.players[index]?.hand).toEqual(game.players[index]?.hand);

      // ولا كرت من أيدي الباقين أو كومة السحب موجود بالبيانات المرسلة
      const secret = [...game.drawPile, ...game.players.filter((p) => p.seat !== index).flatMap((p) => p.hand)];
      for (const card of secret) {
        expect(sent).not.toContain(`"${card.id}"`);
      }

      // الأعداد محفوظة والكروت مخفية
      expect(snapshot.state.drawPile).toHaveLength(game.drawPile.length);
      expect(snapshot.state.drawPile.every(isHiddenCard)).toBe(true);
      for (const other of snapshot.state.players.filter((p) => p.seat !== index)) {
        expect(other.hand).toHaveLength(5);
        expect(other.hand.every(isHiddenCard)).toBe(true);
      }
      expect(snapshot.state.seed).toBe(0);
    }
  });

  it('الكرت المختار بدون رؤية (ورثتك) ما ينكشف لصاحب الأكشن ولا للباقين', () => {
    let game = readyState(['action:werathtek:1']);
    game = placeAll(game, ['money:5:1', 'action:malekAmal:1'], { zone: 'hand', seat: 1 });
    const base = started(['p0', 'p1', 'p2', 'p3']);
    let room: Room = { ...base, game };
    room = ok(
      submitMove(room, 'p0', { type: 'playAction', seat: 0, cardId: 'action:werathtek:1', targetSeat: 1, handIndex: 0 }, 2000),
    );
    expect(room.game?.response?.effect.params.pickedCardId).toBe('money:5:1');

    expect(JSON.stringify(snapshotFor(room, 'p0'))).not.toContain('money:5:1');
    expect(JSON.stringify(snapshotFor(room, 'p2'))).not.toContain('money:5:1');
    // صاحب اليد يشوف كروته عادي
    expect(snapshotFor(room, 'p1')?.state?.response?.effect.params.pickedCardId).toBe('money:5:1');
  });

  it('اليد المكشوفة بـ"اكشف" توصل للاعب اللي كشفها فقط', () => {
    let game = readyState(['action:ekshef:1']);
    game = placeAll(game, ['money:5:1', 'joker:1'], { zone: 'hand', seat: 2 });
    let room: Room = { ...started(['p0', 'p1', 'p2', 'p3']), game };
    room = ok(submitMove(room, 'p0', { type: 'playAction', seat: 0, cardId: 'action:ekshef:1', targetSeat: 2 }, 2000));

    expect(snapshotFor(room, 'p0')?.state?.players[2]?.hand.map((c) => c.id)).toEqual(['money:5:1', 'joker:1']);
    const other = snapshotFor(room, 'p1');
    expect(other?.state?.players[2]?.hand.every(isHiddenCard)).toBe(true);
    expect(other?.state?.revealed).toBeNull();
  });

  it('لاعب مو بالغرفة ما يستلم شي', () => {
    expect(snapshotFor(started(['p0', 'p1']), 'stranger')).toBeNull();
  });
});

describe('الخادم هو الحكم', () => {
  function atSeat0(hand: readonly string[]): Room {
    return { ...started(['p0', 'p1', 'p2', 'p3']), game: readyState(hand) };
  }

  it('الحركة القانونية تنقبل', () => {
    const room = ok(submitMove(atSeat0(['money:5:1']), 'p0', { type: 'bankMoney', seat: 0, cardId: 'money:5:1' }, 2000));
    expect(room.game?.players[0]?.bank.map((c) => c.id)).toEqual(['money:5:1']);
    expect(room.lastMove).toEqual({ type: 'bankMoney', seat: 0, cardId: 'money:5:1' });
  });

  it('الحركة المخالفة المرسلة مباشرة للخادم تنرفض وما تغيّر شي', () => {
    const room = atSeat0(['money:5:1', 'property:red:1']);
    // كرت مو بيده
    expect(errorOf(submitMove(room, 'p0', { type: 'bankMoney', seat: 0, cardId: 'money:10:1' }, 2000))).toBe('cardNotInHand');
    // نوع غلط
    expect(errorOf(submitMove(room, 'p0', { type: 'bankMoney', seat: 0, cardId: 'property:red:1' }, 2000))).toBe('wrongCardKind');
    // مو دوره
    expect(errorOf(submitMove(room, 'p1', { type: 'draw', seat: 1 }, 2000))).toBe('notYourTurn');
    // لاعب مو بالغرفة
    expect(errorOf(submitMove(room, 'stranger', { type: 'draw', seat: 0 }, 2000))).toBe('notInRoom');
  });

  it('اللاعب ما يقدر يلعب بمقعد غيره: الخادم يحدد المقعد من هويته', () => {
    // p1 يرسل حركة مكتوب فيها مقعد 0 (صاحب الدور) عشان يلعب بداله
    const room = atSeat0(['money:5:1']);
    expect(errorOf(submitMove(room, 'p1', { type: 'bankMoney', seat: 0, cardId: 'money:5:1' }, 2000))).toBe('notYourTurn');
  });

  it('ما تنقبل حركات قبل بداية اللعبة ولا بعد نهايتها', () => {
    expect(errorOf(submitMove(lobby(['p0']), 'p0', { type: 'draw', seat: 0 }, 0))).toBe('notStarted');

    let game = readyState(['property:green:3']);
    for (const color of ['brown', 'pistachio', 'darkBlue', 'red', 'yellow'] as const) game = giveFullSet(game, 0, color);
    game = placeAll(game, ['property:green:1', 'property:green:2'], { zone: 'properties', seat: 0, color: 'green' });
    let room: Room = { ...started(['p0', 'p1', 'p2', 'p3']), game };
    room = ok(submitMove(room, 'p0', { type: 'playProperty', seat: 0, cardId: 'property:green:3' }, 2000));
    expect(room.status).toBe('finished');
    expect(room.game?.winner).toBe(0);
    expect(errorOf(submitMove(room, 'p0', { type: 'endTurn', seat: 0 }, 3000))).toBe('gameOver');
  });
});

describe('المؤقت على الخادم', () => {
  it('إذا انتهى وقت الدور الخادم ينهيه تلقائياً ويبدأ مؤقت جديد', () => {
    const room: Room = { ...started(['p0', 'p1', 'p2', 'p3']), game: readyState(['money:1:1']), turnDeadline: 5000 };
    expect(tick(room, 4999)).toBe(room);
    const after = tick(room, 5000);
    expect(after.game?.turn.seat).toBe(1);
    expect(after.turnDeadline).toBe(5000 + TURN_SECONDS * 1000);
  });

  it('إنهاء الدور يبدأ مؤقت جديد للاعب التالي', () => {
    const room: Room = { ...started(['p0', 'p1', 'p2', 'p3']), game: readyState([]) };
    const after = ok(submitMove(room, 'p0', { type: 'endTurn', seat: 0 }, 9000));
    expect(after.turnDeadline).toBe(9000 + TURN_SECONDS * 1000);
  });

  it('إذا انتهى الوقت وفيه دفع معلّق على لاعب، ينحل تلقائياً ثم ينتهي الدور', () => {
    let game = place(readyState(['action:qarqash:1']), 'money:5:1', { zone: 'bank', seat: 1 });
    let room: Room = { ...started(['p0', 'p1', 'p2', 'p3']), game, turnDeadline: 5000 };
    room = ok(submitMove(room, 'p0', { type: 'playAction', seat: 0, cardId: 'action:qarqash:1', targetSeat: 1 }, 2000));
    expect(room.game?.pending).not.toBeNull();

    room = tick(room, 6000);
    expect(room.game?.pending).toBeNull();
    expect(room.game?.players[0]?.bank.map((c) => c.id)).toEqual(['money:5:1']);
    room = tick(room, 6001);
    expect(room.game?.turn.seat).toBe(1);
    game = room.game ?? game;
    expect(new Set(allCards(game).map((c) => c.id)).size).toBe(132);
  });
});

describe('البوتات بالغرفة', () => {
  it('البوت يلعب حركة وحدة بكل نبضة بعد التأخير', () => {
    let room = started(['p0'], 11);
    const game = room.game;
    if (!game) throw new Error('ما فيه لعبة');
    // نخلي الدور عند بوت
    room = { ...room, game: { ...game, turn: { seat: 1, hasDrawn: false, playsUsed: 0 } }, lastMoveAt: 1000 };

    expect(tick(room, 1000 + BOT_DELAY_MS - 1)).toBe(room);
    const after = tick(room, 1000 + BOT_DELAY_MS);
    expect(after.lastMove).toEqual({ type: 'draw', seat: 1 });
    expect(after.game?.players[1]?.hand).toHaveLength(7);
  });

  it('لاعب يطلع بنص اللعبة: البوت يكمل مكانه واللعبة تستمر', () => {
    let room = started(['p0', 'p1', 'p2', 'p3'], 21);
    room = ok(leaveRoom(room, 'p2'));
    expect(room.seats[2]).toEqual({ playerId: null, name: 'لاعب 2', isBot: true, connected: false });
    expect(snapshotFor(room, 'p2')).toBeNull();
    expect(errorOf(submitMove(room, 'p2', { type: 'draw', seat: 2 }, 2000))).toBe('notInRoom');

    // نخلي الدور عند المقعد اللي طلع صاحبه: البوت يلعب بداله
    const game = room.game;
    if (!game) throw new Error('ما فيه لعبة');
    room = { ...room, game: { ...game, turn: { seat: 2, hasDrawn: false, playsUsed: 0 } }, lastMoveAt: 0 };
    room = tick(room, 5000);
    expect(room.lastMove).toEqual({ type: 'draw', seat: 2 });
  });
});

describe('مباريات كاملة عبر الخادم', () => {
  /** كل لاعب بشري يختار عشوائياً من الحركات اللي أرسلها له الخادم. */
  function playToEnd(players: readonly string[], seed: number, leaveAt?: { readonly step: number; readonly id: string }): Room {
    let room = started(players, seed);
    const rng = createRng(seed * 13 + 1);
    let now = 1000;
    const active = new Set(players);

    for (let step = 0; step < 40000 && room.status === 'playing'; step++) {
      now += BOT_DELAY_MS;
      if (leaveAt && step === leaveAt.step) {
        room = ok(leaveRoom(room, leaveAt.id));
        active.delete(leaveAt.id);
      }

      let moved = false;
      for (const id of active) {
        const snapshot = snapshotFor(room, id);
        if (!snapshot || snapshot.moves.length === 0) continue;
        const move = snapshot.moves[randomInt(rng, snapshot.moves.length)] as Move;
        // كل حركة أرسلها الخادم كحركة قانونية لازم تنقبل
        room = ok(submitMove(room, id, move, now));
        moved = true;
        break;
      }
      if (!moved) room = tick(room, now);

      const game = room.game;
      if (!game) throw new Error('ما فيه لعبة');
      if (step % 50 === 0) expect(new Set(allCards(game).map((c) => c.id)).size).toBe(132);
    }
    return room;
  }

  function expectFinished(room: Room): void {
    expect(room.status).toBe('finished');
    expect(room.game?.winner).not.toBeNull();
    const ids = allCards(room.game ?? readyState([])).map((c) => c.id);
    expect(ids.slice().sort()).toEqual(buildDeck().map((c) => c.id).sort());
  }

  it('4 لاعبين يكملون مباراة كاملة بنفس الغرفة', () => {
    expectFinished(playToEnd(['p0', 'p1', 'p2', 'p3'], 3));
  });

  it('لاعبين + بوتين يكملون مباراة', () => {
    const room = playToEnd(['p0', 'p1'], 4);
    expect(room.seats.map((s) => s.isBot)).toEqual([false, false, true, true]);
    expectFinished(room);
  });

  it('لاعب يطلع بنص اللعبة واللعبة تكمل للنهاية', () => {
    const room = playToEnd(['p0', 'p1', 'p2', 'p3'], 5, { step: 60, id: 'p3' });
    expect(room.seats[3]?.isBot).toBe(true);
    expectFinished(room);
  });
});
