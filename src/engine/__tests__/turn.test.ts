// اختبارات محرك الدور الأساسي — plan.md المرحلة 2، والقوانين من prd.md 5.1 و 5.2 و 5.6
import { applyMove, legalMoves, type Move } from '../moves';
import { createRng, randomInt } from '../rng';
import { completeColors, isSetComplete } from '../sets';
import { allCards, createGame, type GameState } from '../state';
import {
  emptyHand,
  errorOf,
  giveFullSet,
  must,
  place,
  placeAll,
  propertyIds,
  setTurn,
} from '../../testing/helpers';

const ME = 0;

/** لعبة جديدة والدور عند المقعد 0. */
function start(winTarget: 6 | 8 = 6): GameState {
  return setTurn(createGame(1, winTarget), { seat: ME, hasDrawn: false, playsUsed: 0 });
}

/** لعبة والمقعد 0 سحب وجاهز يلعب، ويده فيها الكروت المطلوبة فقط. */
function ready(handIds: readonly string[], winTarget: 6 | 8 = 6): GameState {
  const state = placeAll(emptyHand(start(winTarget), ME), handIds, { zone: 'hand', seat: ME });
  return setTurn(state, { hasDrawn: true });
}

function handSize(state: GameState, seat = ME): number {
  return state.players[seat]?.hand.length ?? -1;
}

function expect132(state: GameState): void {
  const ids = allCards(state).map((card) => card.id);
  expect(ids).toHaveLength(132);
  expect(new Set(ids).size).toBe(132);
}

describe('من يبدأ', () => {
  it('أول دور عند لاعب عشوائي من الأربعة، ونفس البذرة تعطي نفس اللاعب', () => {
    const seats = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const seat = createGame(seed, 6).turn.seat;
      expect(seat).toBeGreaterThanOrEqual(0);
      expect(seat).toBeLessThan(4);
      expect(createGame(seed, 6).turn.seat).toBe(seat);
      seats.add(seat);
    }
    expect(seats.size).toBe(4);
  });
});

describe('السحب', () => {
  it('يسحب كرتين بأول الدور', () => {
    const state = must(applyMove(start(), { type: 'draw', seat: ME }));
    expect(handSize(state)).toBe(7);
    expect(state.drawPile).toHaveLength(110);
    expect132(state);
  });

  it('يسحب 5 إذا يده فاضية', () => {
    const state = must(applyMove(emptyHand(start(), ME), { type: 'draw', seat: ME }));
    expect(handSize(state)).toBe(5);
  });

  it('ما يسحب مرتين بنفس الدور', () => {
    const state = must(applyMove(start(), { type: 'draw', seat: ME }));
    expect(errorOf(applyMove(state, { type: 'draw', seat: ME }))).toBe('alreadyDrew');
  });

  it('ما يلعب ولا ينهي دوره قبل ما يسحب', () => {
    const state = place(start(), 'money:1:1', { zone: 'hand', seat: ME });
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:1:1' }))).toBe('mustDrawFirst');
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBe('mustDrawFirst');
  });
});

describe('اللعب', () => {
  it('ما ينلعب بغير دورك', () => {
    const state = place(ready([]), 'money:1:1', { zone: 'hand', seat: 1 });
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: 1, cardId: 'money:1:1' }))).toBe('notYourTurn');
    expect(errorOf(applyMove(state, { type: 'draw', seat: 2 }))).toBe('notYourTurn');
  });

  it('الفلوس تنحط بالبنك', () => {
    const state = must(applyMove(ready(['money:5:1']), { type: 'bankMoney', seat: ME, cardId: 'money:5:1' }));
    expect(state.players[ME]?.bank.map((c) => c.id)).toEqual(['money:5:1']);
    expect(handSize(state)).toBe(0);
    expect(state.turn.playsUsed).toBe(1);
  });

  it('العقار ينحط بلونه', () => {
    const state = must(
      applyMove(ready(['property:purple:2']), { type: 'playProperty', seat: ME, cardId: 'property:purple:2' }),
    );
    expect(state.players[ME]?.properties).toEqual([
      { card: { id: 'property:purple:2', kind: 'property', color: 'purple', region: 'السالمية' }, color: 'purple' },
    ]);
  });

  it('يرفض كرت مو باليد، ويرفض نوع كرت غلط', () => {
    const state = ready(['money:1:1', 'property:red:1', 'action:draw2:1']);
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:10:1' }))).toBe('cardNotInHand');
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'property:red:1' }))).toBe('wrongCardKind');
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'action:draw2:1' }))).toBe('wrongCardKind');
    expect(errorOf(applyMove(state, { type: 'playProperty', seat: ME, cardId: 'money:1:1' }))).toBe('wrongCardKind');
    expect(errorOf(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'money:1:1', color: 'red' }))).toBe(
      'wrongCardKind',
    );
  });

  it('ما ينلعب كرت رابع بالدور', () => {
    let state = ready(['money:1:1', 'money:1:2', 'property:red:1', 'money:1:3']);
    state = must(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:1:1' }));
    state = must(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:1:2' }));
    state = must(applyMove(state, { type: 'playProperty', seat: ME, cardId: 'property:red:1' }));
    expect(state.turn.playsUsed).toBe(3);
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:1:3' }))).toBe('noPlaysLeft');
    expect(handSize(state)).toBe(1);
  });

  it('الحركة المرفوضة ما تغيّر الحالة', () => {
    const state = ready(['money:1:1']);
    const before = JSON.stringify(state);
    applyMove(state, { type: 'playProperty', seat: ME, cardId: 'money:1:1' });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('نهاية الدور', () => {
  const eight = [
    'money:1:1',
    'money:1:2',
    'money:1:3',
    'money:1:4',
    'money:1:5',
    'money:1:6',
    'money:1:7',
    'money:1:8',
  ];

  it('الدور ينتقل للمقعد التالي ويرجع للأول بعد الرابع', () => {
    let state = must(applyMove(ready([]), { type: 'endTurn', seat: ME }));
    expect(state.turn).toEqual({ seat: 1, hasDrawn: false, playsUsed: 0 });
    state = setTurn(state, { seat: 3, hasDrawn: true });
    state = must(applyMove(state, { type: 'endTurn', seat: 3 }));
    expect(state.turn.seat).toBe(0);
  });

  it('اليد فوق 7: الزايد ينحرق عشوائياً في النار أول ما يخلص الدور، واللاعب ما يختار', () => {
    const hand = [...eight, 'money:2:1', 'money:2:2'];
    const before = ready(hand);
    // ما فيه حركة رمي، وإنهاء الدور متاح حتى واليد فوق 7
    const mine = legalMoves(before).filter((m) => m.seat === ME);
    expect(mine.map((m) => m.type)).toContain('endTurn');
    expect(mine.map((m) => m.type as string)).not.toContain('discard');

    const state = must(applyMove(before, { type: 'endTurn', seat: ME }));
    expect(handSize(state)).toBe(7);
    expect(state.firePile).toHaveLength(3);
    expect(state.firePile.every((c) => hand.includes(c.id))).toBe(true);
    expect(state.turn.seat).toBe(1);
    expect132(state);
  });

  it('حرق الزايد عشوائي مبذور: نفس الحالة تعطي نفس النتيجة، وبذرة ثانية تعطي غيرها', () => {
    const before = ready([...eight, 'money:2:1', 'money:2:2', 'money:2:3', 'money:2:4']);
    const first = must(applyMove(before, { type: 'endTurn', seat: ME }));
    expect(must(applyMove(before, { type: 'endTurn', seat: ME }))).toEqual(first);

    const burned = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const state = must(applyMove({ ...before, seed }, { type: 'endTurn', seat: ME }));
      burned.add(state.firePile.map((c) => c.id).sort().join());
    }
    expect(burned.size).toBeGreaterThan(1);
  });

  it('يده 7 أو أقل: ما ينحرق شي', () => {
    const state = must(applyMove(ready(eight.slice(0, 7)), { type: 'endTurn', seat: ME }));
    expect(handSize(state)).toBe(7);
    expect(state.firePile).toHaveLength(0);
  });
});

describe('الأطقم والجيكر', () => {
  it('الطقم يكتمل بالعدد الصحيح لكل لون', () => {
    const sizes: Record<string, number> = {
      brown: 2,
      lightBlue: 3,
      pistachio: 2,
      purple: 3,
      orange: 3,
      red: 3,
      yellow: 3,
      green: 3,
      darkBlue: 2,
      black: 4,
    };
    for (const color of Object.keys(sizes) as (keyof typeof sizes)[]) {
      const ids = propertyIds(color as Parameters<typeof propertyIds>[0]);
      expect(ids).toHaveLength(sizes[color] as number);
      const typed = color as Parameters<typeof propertyIds>[0];
      const almost = placeAll(start(), ids.slice(0, -1), { zone: 'properties', seat: ME, color: typed });
      expect(isSetComplete(almost.players[ME]?.properties ?? [], typed)).toBe(false);
      const full = giveFullSet(start(), ME, typed);
      expect(isSetComplete(full.players[ME]?.properties ?? [], typed)).toBe(true);
    }
  });

  it('الجيكر يحتسب ويكمل الطقم', () => {
    let state = place(ready(['joker:1']), 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = must(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:1', color: 'brown' }));
    expect(completeColors(state.players[ME]?.properties ?? [])).toEqual(['brown']);
    expect(state.turn.playsUsed).toBe(1);
  });

  it('الجيكرات لحالها ما تكوّن طقم كامل: لازم عقار حقيقي', () => {
    // جيكرين بقوا لحالهم بلون (مثلاً بعد ما انسرق العقار اللي معهم)
    let state = ready([]);
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'joker:2', { zone: 'properties', seat: ME, color: 'brown' });
    expect(completeColors(state.players[ME]?.properties ?? [])).toEqual([]);
  });

  it('الجيكر ينحط فقط على لون عندي منه عقار حقيقي: الخيارات ألوان أراضيّ بس', () => {
    let state = ready(['joker:1']);
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    // عقار عند لاعب ثاني ما يفتح لي لونه
    state = place(state, 'property:green:1', { zone: 'properties', seat: 1, color: 'green' });

    const options = legalMoves(state).filter((m) => m.type === 'playJoker');
    expect(options.map((m) => (m.type === 'playJoker' ? m.color : '')).sort()).toEqual(['brown', 'red']);

    expect(errorOf(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:1', color: 'green' }))).toBe(
      'jokerNeedsProperty',
    );
    state = must(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:1', color: 'red' }));
    expect(state.players[ME]?.properties.find((p) => p.card.id === 'joker:1')?.color).toBe('red');
    expect132(state);
  });

  it('بدون ولا عقار حقيقي على الطاولة: الجيكر يبقى باليد وما له حركة', () => {
    let state = ready(['joker:1']);
    expect(legalMoves(state).filter((m) => m.type === 'playJoker')).toEqual([]);
    expect(errorOf(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:1', color: 'brown' }))).toBe(
      'jokerNeedsProperty',
    );
    // جيكر على الطاولة لحاله ما يفتح اللون لجيكر ثاني
    state = place(ready(['joker:2']), 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    expect(legalMoves(state).filter((m) => m.type === 'playJoker')).toEqual([]);
    expect(errorOf(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:2', color: 'brown' }))).toBe(
      'jokerNeedsProperty',
    );
  });

  it('نقل الجيكر: فقط إلى لون عندي منه عقار حقيقي', () => {
    let state = ready([]);
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'property:darkBlue:1', { zone: 'properties', seat: ME, color: 'darkBlue' });
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });

    const options = legalMoves(state).filter((m) => m.type === 'moveJoker');
    expect(options.map((m) => (m.type === 'moveJoker' ? m.color : ''))).toEqual(['darkBlue']);
    expect(errorOf(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'red' }))).toBe(
      'jokerNeedsProperty',
    );
  });

  it('الجيكر ينتقل من طقم لطقم بدور صاحبه، وينحسب من الـ3 كروت', () => {
    let state = ready([]);
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'property:darkBlue:1', { zone: 'properties', seat: ME, color: 'darkBlue' });
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    expect(completeColors(state.players[ME]?.properties ?? [])).toEqual(['brown']);

    state = must(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'darkBlue' }));
    expect(completeColors(state.players[ME]?.properties ?? [])).toEqual(['darkBlue']);
    expect(state.turn.playsUsed).toBe(1);
    expect132(state);
  });

  it('نقل الجيكر ينرفض: مو بدورك، نفس اللون، جيكر مو على طاولتك، أو خلصت الـ3 كروت', () => {
    let state = ready([]);
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'joker:2', { zone: 'properties', seat: 1, color: 'red' });

    expect(errorOf(applyMove(state, { type: 'moveJoker', seat: 1, cardId: 'joker:2', color: 'brown' }))).toBe(
      'notYourTurn',
    );
    expect(errorOf(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'brown' }))).toBe(
      'sameColor',
    );
    expect(errorOf(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:2', color: 'brown' }))).toBe(
      'jokerNotOnTable',
    );
    expect(
      errorOf(applyMove(setTurn(state, { playsUsed: 3 }), { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'red' })),
    ).toBe('noPlaysLeft');
  });
});

describe('شرط الفوز', () => {
  /** خمسة أطقم كاملة عند المقعد 0، وآخر عقار أخضر باليد. */
  function fiveSetsAndOneToGo(winTarget: 6 | 8): GameState {
    let state = ready(['property:green:3'], winTarget);
    for (const color of ['brown', 'pistachio', 'darkBlue', 'red', 'yellow'] as const) {
      state = giveFullSet(state, ME, color);
    }
    return placeAll(state, ['property:green:1', 'property:green:2'], { zone: 'properties', seat: ME, color: 'green' });
  }

  it('الفوز ينكشف عند 6 أطقم إذا الشرط 6', () => {
    const before = fiveSetsAndOneToGo(6);
    expect(before.winner).toBeNull();
    const state = must(applyMove(before, { type: 'playProperty', seat: ME, cardId: 'property:green:3' }));
    expect(state.winner).toBe(ME);
  });

  it('6 أطقم ما تفوّز إذا الشرط 8، والثامن يفوّز', () => {
    let state = must(applyMove(fiveSetsAndOneToGo(8), { type: 'playProperty', seat: ME, cardId: 'property:green:3' }));
    expect(state.winner).toBeNull();

    state = giveFullSet(state, ME, 'purple');
    state = placeAll(state, ['property:orange:1', 'property:orange:2'], { zone: 'properties', seat: ME, color: 'orange' });
    state = place(state, 'property:orange:3', { zone: 'hand', seat: ME });
    expect(completeColors(state.players[ME]?.properties ?? [])).toHaveLength(7);

    state = must(applyMove(state, { type: 'playProperty', seat: ME, cardId: 'property:orange:3' }));
    expect(state.winner).toBe(ME);
  });

  it('طقمين من نفس اللون ما ينحسبون مرتين', () => {
    // خمسة ألوان كاملة، واللون البني فيه 4 كروت (عقارين + جيكرين) = يكفي لطقمين بالعدد.
    let state = ready(['joker:2']);
    for (const color of ['brown', 'pistachio', 'darkBlue', 'red', 'yellow'] as const) {
      state = giveFullSet(state, ME, color);
    }
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = must(applyMove(state, { type: 'playJoker', seat: ME, cardId: 'joker:2', color: 'brown' }));
    expect(completeColors(state.players[ME]?.properties ?? [])).toHaveLength(5);
    expect(state.winner).toBeNull();
  });

  it('الفوز ينكشف بالجيكر وبنقل الجيكر', () => {
    let state = fiveSetsAndOneToGo(6);
    state = place(state, 'property:green:3', { zone: 'draw' });
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'black' });
    state = must(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'green' }));
    expect(state.winner).toBe(ME);
  });

  it('بعد الفوز كل الحركات مرفوضة', () => {
    const state = must(applyMove(fiveSetsAndOneToGo(6), { type: 'playProperty', seat: ME, cardId: 'property:green:3' }));
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBe('gameOver');
    expect(legalMoves(state)).toEqual([]);
  });
});

describe('إعادة خلط النار', () => {
  /** ينقل كل كومة السحب للنار ما عدا عدد معيّن. */
  function drainDrawPile(state: GameState, keep: number): GameState {
    const moved = state.drawPile.slice(keep);
    return { ...state, drawPile: state.drawPile.slice(0, keep), firePile: [...state.firePile, ...moved] };
  }

  it('إذا خلصت كومة السحب تنخلط النار وترجع كومة سحب', () => {
    const before = drainDrawPile(start(), 0);
    expect(before.drawPile).toHaveLength(0);
    const state = must(applyMove(before, { type: 'draw', seat: ME }));
    expect(handSize(state)).toBe(7);
    expect(state.firePile).toHaveLength(0);
    expect(state.drawPile).toHaveLength(110);
    expect132(state);
  });

  it('إذا خلصت الكومة بنص السحب يكمل اللاعب سحبه من النار', () => {
    const before = drainDrawPile(start(), 1);
    const state = must(applyMove(before, { type: 'draw', seat: ME }));
    expect(handSize(state)).toBe(7);
    expect(state.firePile).toHaveLength(0);
    expect(state.drawPile).toHaveLength(110);
  });

  it('إعادة الخلط مبذورة: نفس الحالة تعطي نفس النتيجة', () => {
    const before = drainDrawPile(start(), 0);
    expect(must(applyMove(before, { type: 'draw', seat: ME }))).toEqual(must(applyMove(before, { type: 'draw', seat: ME })));
  });

  it('إذا الكومتين فاضيتين يسحب المتوفر فقط ويكمل دوره', () => {
    const empty = { ...start(), drawPile: [], firePile: [] };
    const state = must(applyMove(empty, { type: 'draw', seat: ME }));
    expect(handSize(state)).toBe(5);
    expect(state.turn.hasDrawn).toBe(true);
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBeNull();
  });
});

describe('مباراة كاملة', () => {
  function step(state: GameState, move: Move): GameState {
    const next = must(applyMove(state, move));
    const ids = allCards(next).map((card) => card.id);
    expect(new Set(ids).size).toBe(132);
    return next;
  }

  it('مباريات عشوائية بحركات قانونية فقط تمشي بدون خطأ وبدون ضياع كروت', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const rng = createRng(seed + 1000);
      let state = createGame(seed, 6);
      for (let i = 0; i < 3000 && state.winner === null; i++) {
        const moves = legalMoves(state);
        expect(moves.length).toBeGreaterThan(0);
        state = step(state, moves[randomInt(rng, moves.length)] as Move);
      }
      expect132(state);
    }
  });

  it('مباراة كاملة من البداية للفوز: لاعب يجمع العقارات والباقين يرمونها', () => {
    const rng = createRng(77);
    let state = createGame(77, 6);
    let moveCount = 0;

    while (state.winner === null && moveCount < 60000) {
      const moves = legalMoves(state);
      const seat = state.turn.seat;
      let options: Move[];

      if (seat === ME) {
        const properties = state.players[ME]?.properties ?? [];
        const useful = moves.filter(
          (m) =>
            m.type === 'playProperty' ||
            (m.type === 'playJoker' &&
              properties.some((p) => p.color === m.color && p.card.kind === 'property') &&
              !isSetComplete(properties, m.color)),
        );
        const rest = moves.filter((m) => m.type === 'draw' || m.type === 'endTurn');
        options = useful.length > 0 ? useful : rest;
      } else {
        // الباقين يسحبون ويحطون فلوس فقط (بدون عقارات ولا أكشن).
        options = moves.filter(
          (m) => m.type === 'draw' || m.type === 'bankMoney' || m.type === 'endTurn',
        );
      }

      expect(options.length).toBeGreaterThan(0);
      state = step(state, options[randomInt(rng, options.length)] as Move);
      moveCount++;
    }

    expect(state.winner).toBe(ME);
    expect(completeColors(state.players[ME]?.properties ?? []).length).toBeGreaterThanOrEqual(6);
    expect132(state);
  });
});
