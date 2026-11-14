// اختبارات كروت الرد والدفاع — plan.md المرحلة 5، والقوانين من prd.md 5.4 (د) وتوضيحات الإصدار 1.6
import { applyMove, legalMoves, type Move } from '../moves';
import { createRng, randomInt } from '../rng';
import { completeColors } from '../sets';
import { allCards, createGame, type GameState, type PlayerState } from '../state';
import { errorOf, giveFullSet, must, place, placeAll, readyState } from '../../testing/helpers';

const ME = 0;

function player(state: GameState, seat: number): PlayerState {
  const found = state.players[seat];
  if (!found) throw new Error('مقعد غير موجود');
  return found;
}

function propIds(state: GameState, seat: number): string[] {
  return player(state, seat)
    .properties.map((p) => p.card.id)
    .sort();
}

function bankIds(state: GameState, seat: number): string[] {
  return player(state, seat)
    .bank.map((c) => c.id)
    .sort();
}

function fireIds(state: GameState): string[] {
  return state.firePile.map((c) => c.id);
}

function expect132(state: GameState): void {
  const all = allCards(state).map((card) => card.id);
  expect(all).toHaveLength(132);
  expect(new Set(all).size).toBe(132);
}

/** أنا ألعب "قرقش" على المقعد 1 (بنكه 5)، وكل لاعب بيده الكروت المحددة. */
function qarqashOnSeat1(hands: Record<number, readonly string[]>): GameState {
  let state = readyState(['action:qarqash:1', ...(hands[ME] ?? [])]);
  state = place(state, 'money:5:1', { zone: 'bank', seat: 1 });
  for (const seat of [1, 2, 3]) {
    state = placeAll(state, hands[seat] ?? [], { zone: 'hand', seat });
  }
  return must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 }));
}

const DEBT_5 = { to: ME, debts: [{ from: 1, amount: 5 }] };

describe('نافذة الرد', () => {
  it('الأكشن يوقف وينتظر رد المستهدف إذا بيده كرت رد', () => {
    const state = qarqashOnSeat1({ 1: ['action:malekAmal:1'] });
    expect(state.response).toEqual({
      effect: { action: 'qarqash', isRent: false, actor: ME, target: 1, amount: 5, params: {} },
      standing: null,
      awaiting: 'defense',
      passed: [],
    });
    expect(state.pending).toBeNull();
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBe('responsePending');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:5:1'] }))).toBe('responsePending');
  });

  it('إذا المستهدف قال "ما أرد" الأكشن يتنفذ', () => {
    const state = must(applyMove(qarqashOnSeat1({ 1: ['action:malekAmal:1'] }), { type: 'respond', seat: 1 }));
    expect(state.response).toBeNull();
    expect(state.pending).toEqual(DEBT_5);
    expect(player(state, 1).hand).toHaveLength(1);
  });

  it('إذا ما أحد بيده كرت رد الأكشن يتنفذ مباشرة بدون نافذة', () => {
    const state = qarqashOnSeat1({});
    expect(state.response).toBeNull();
    expect(state.pending).toEqual(DEBT_5);
  });

  it('الرد ينرفض: بدون نافذة، من لاعب مو دوره يرد، بكرت مو باليد، أو بكرت مو كرت رد', () => {
    expect(errorOf(applyMove(readyState([]), { type: 'respond', seat: 1 }))).toBe('noResponsePending');

    let state = qarqashOnSeat1({ 1: ['action:malekAmal:1', 'action:draw2:1', 'money:1:1'], 3: ['action:malekAmal:2'] });
    expect(errorOf(applyMove(state, { type: 'respond', seat: 3, cardId: 'action:malekAmal:2' }))).toBe('notYourResponse');
    expect(errorOf(applyMove(state, { type: 'respond', seat: ME }))).toBe('notYourResponse');
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:3' }))).toBe('cardNotInHand');
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:draw2:1' }))).toBe('invalidResponse');
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1, cardId: 'money:1:1' }))).toBe('wrongCardKind');

    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    expect(state.response).toBeNull();
  });
});

describe('مالك امل', () => {
  it('يلغي الأكشن، وما ينحسب من الـ3 كروت', () => {
    const before = qarqashOnSeat1({ 1: ['action:malekAmal:1'] });
    const state = must(applyMove(before, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    expect(state.response).toBeNull();
    expect(state.pending).toBeNull();
    expect(bankIds(state, 1)).toEqual(['money:5:1']);
    expect(fireIds(state)).toEqual(['action:qarqash:1', 'action:malekAmal:1']);
    expect(state.turn.playsUsed).toBe(1);
    expect132(state);
  });

  it('سلسلة: رد ← صاحب الأكشن ما يرد ← الأكشن ملغي', () => {
    let state = qarqashOnSeat1({ [ME]: ['action:malekAmal:2'], 1: ['action:malekAmal:1'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    expect(state.response?.awaiting).toBe('actor');
    expect(state.response?.standing).toEqual({ kind: 'malekAmal', by: 1, bounce: null, payer: null });
    // المستهدف ما يقدر يلعب الحين: ننتظر صاحب الأكشن
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1 }))).toBe('notYourResponse');

    state = must(applyMove(state, { type: 'respond', seat: ME }));
    expect(state.response).toBeNull();
    expect(state.pending).toBeNull();
  });

  it('سلسلة: رد ← رد على الرد ← الأكشن يمشي', () => {
    let state = qarqashOnSeat1({ [ME]: ['action:malekAmal:2'], 1: ['action:malekAmal:1'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:malekAmal:2' }));
    expect(state.response).toBeNull();
    expect(state.pending).toEqual(DEBT_5);
    // رد صاحب الأكشن بدوره ما ينحسب من الـ3 كروت
    expect(state.turn.playsUsed).toBe(1);
    expect132(state);
  });

  it('سلسلة: رد ← رد على الرد ← رد ثالث ← الأكشن ملغي', () => {
    let state = qarqashOnSeat1({ [ME]: ['action:malekAmal:2'], 1: ['action:malekAmal:1', 'action:malekAmal:3'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:malekAmal:2' }));
    expect(state.response?.awaiting).toBe('defense');
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:3' }));
    expect(state.response).toBeNull();
    expect(state.pending).toBeNull();
    expect(fireIds(state)).toEqual(['action:qarqash:1', 'action:malekAmal:1', 'action:malekAmal:2', 'action:malekAmal:3']);
    expect132(state);
  });

  it('سلسلة: بعد الرد على الرد، المستهدف يقول "ما أرد" والأكشن يمشي', () => {
    let state = qarqashOnSeat1({ [ME]: ['action:malekAmal:2'], 1: ['action:malekAmal:1', 'action:malekAmal:3'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:malekAmal:2' }));
    state = must(applyMove(state, { type: 'respond', seat: 1 }));
    expect(state.pending).toEqual(DEBT_5);
  });

  it('يلغي كرت الإيجار بعد', () => {
    let state = giveFullSet(readyState(['rent:rentOne:1']), ME, 'brown');
    state = place(state, 'money:5:1', { zone: 'bank', seat: 2 });
    state = place(state, 'action:malekAmal:1', { zone: 'hand', seat: 2 });
    state = must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'brown', targetSeat: 2 }));
    expect(state.response?.effect).toEqual({ action: 'rent', isRent: true, actor: ME, target: 2, amount: 2, params: {} });
    state = must(applyMove(state, { type: 'respond', seat: 2, cardId: 'action:malekAmal:1' }));
    expect(state.pending).toBeNull();
    expect(bankIds(state, 2)).toEqual(['money:5:1']);
  });
});

describe('حيور', () => {
  it('مع بوق لاتخاف: المستهدف هو اللي يسرق من صاحب الأكشن', () => {
    let state = readyState(['action:boog:1']);
    state = place(state, 'property:green:1', { zone: 'properties', seat: ME, color: 'green' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'action:hayyour:1', { zone: 'hand', seat: 1 });
    state = must(
      applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:boog:1', targetSeat: 1, targetCardIds: ['property:red:1'] }),
    );
    expect(state.response?.awaiting).toBe('defense');

    state = must(
      applyMove(state, {
        type: 'respond',
        seat: 1,
        cardId: 'action:hayyour:1',
        bounce: { targetCardIds: ['property:green:1'] },
      }),
    );
    expect(state.response).toBeNull();
    expect(propIds(state, 1)).toEqual(['property:green:1', 'property:red:1']);
    expect(propIds(state, ME)).toEqual([]);
    expect132(state);
  });

  it('مع بوق لاتخاف بدون اختيار: يلغي السرقة فقط. والاختيار الغلط ينرفض', () => {
    let state = readyState(['action:boog:1']);
    state = place(state, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'action:hayyour:1', { zone: 'hand', seat: 1 });
    state = must(
      applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:boog:1', targetSeat: 1, targetCardIds: ['property:red:1'] }),
    );
    expect(
      errorOf(
        applyMove(state, {
          type: 'respond',
          seat: 1,
          cardId: 'action:hayyour:1',
          bounce: { targetCardIds: ['property:green:1'] },
        }),
      ),
    ).toBe('invalidCard');

    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:hayyour:1' }));
    expect(propIds(state, 1)).toEqual(['property:red:1']);
    expect(propIds(state, ME)).toEqual([]);
  });

  it('مع قرقش: صاحب الأكشن يدفع نفس المبلغ لصاحب حيور', () => {
    let state = qarqashOnSeat1({ 1: ['action:hayyour:1'] });
    state = place(state, 'money:5:2', { zone: 'bank', seat: ME });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:hayyour:1' }));
    expect(state.pending).toEqual({ to: 1, debts: [{ from: ME, amount: 5 }] });

    state = must(applyMove(state, { type: 'pay', seat: ME, cardIds: ['money:5:2'] }));
    expect(bankIds(state, 1)).toEqual(['money:5:1', 'money:5:2']);
    expect(state.pending).toBeNull();
    expect132(state);
  });

  it('مع كروت التبديل (بدل): يلغي التبديل فقط', () => {
    let state = readyState(['action:baddel:1']);
    state = place(state, 'property:green:1', { zone: 'properties', seat: ME, color: 'green' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'action:hayyour:1', { zone: 'hand', seat: 1 });
    state = must(
      applyMove(state, {
        type: 'playAction',
        seat: ME,
        cardId: 'action:baddel:1',
        targetSeat: 1,
        targetCardIds: ['property:red:1'],
        ownCardId: 'property:green:1',
      }),
    );
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:hayyour:1' }));
    expect(propIds(state, ME)).toEqual(['property:green:1']);
    expect(propIds(state, 1)).toEqual(['property:red:1']);
  });

  it('مع استريح: صاحب الأكشن هو اللي يفوّت دوره. ومع اكشف: صاحب حيور يشوف يده', () => {
    let state = place(readyState(['action:estareeh:1']), 'action:hayyour:1', { zone: 'hand', seat: 2 });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:estareeh:1', targetSeat: 2 }));
    state = must(applyMove(state, { type: 'respond', seat: 2, cardId: 'action:hayyour:1' }));
    expect(state.skips).toEqual([ME]);

    let reveal = place(readyState(['action:ekshef:1']), 'action:hayyour:1', { zone: 'hand', seat: 2 });
    reveal = must(applyMove(reveal, { type: 'playAction', seat: ME, cardId: 'action:ekshef:1', targetSeat: 2 }));
    reveal = must(applyMove(reveal, { type: 'respond', seat: 2, cardId: 'action:hayyour:1' }));
    expect(reveal.revealed).toEqual({ viewer: 2, target: ME });
  });

  it('ينرد عليه بمالك امل من صاحب الأكشن: الأكشن الأصلي يمشي', () => {
    let state = readyState(['action:boog:1', 'action:malekAmal:1']);
    state = place(state, 'property:green:1', { zone: 'properties', seat: ME, color: 'green' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'action:hayyour:1', { zone: 'hand', seat: 1 });
    state = must(
      applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:boog:1', targetSeat: 1, targetCardIds: ['property:red:1'] }),
    );
    state = must(
      applyMove(state, {
        type: 'respond',
        seat: 1,
        cardId: 'action:hayyour:1',
        bounce: { targetCardIds: ['property:green:1'] },
      }),
    );
    expect(state.response?.awaiting).toBe('actor');
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:malekAmal:1' }));
    expect(propIds(state, ME)).toEqual(['property:green:1', 'property:red:1']);
    expect(propIds(state, 1)).toEqual([]);
    expect132(state);
  });
});

describe('فزعه', () => {
  it('لاعب ثالث يلغي الأكشن عن المستهدف', () => {
    let state = qarqashOnSeat1({ 2: ['action:fazaah:1'] });
    expect(state.response?.awaiting).toBe('defense');
    state = must(applyMove(state, { type: 'respond', seat: 2, cardId: 'action:fazaah:1' }));
    expect(state.response).toBeNull();
    expect(state.pending).toBeNull();
    expect(bankIds(state, 1)).toEqual(['money:5:1']);
    expect132(state);
  });

  it('فزعه ضد العيادي: يلغيه عن اللاعب اللي فزعت له فقط، وما يحمّلني دفعه (أدفع نصيبي أنا بس)', () => {
    // بوت 1 يلعب العيادي على الكل. أنا (المقعد 0) بيدي فزعه وأفزع للمقعد 2.
    let state = readyState([]);
    state = { ...state, turn: { seat: 1, hasDrawn: true, playsUsed: 0 } };
    state = place(state, 'action:eyadi:1', { zone: 'hand', seat: 1 });
    state = place(state, 'action:fazaah:1', { zone: 'hand', seat: ME });
    for (const [seat, cardId] of [
      [ME, 'money:5:1'],
      [2, 'money:5:2'],
      [3, 'money:5:3'],
    ] as const) {
      state = place(state, cardId, { zone: 'bank', seat });
    }
    state = must(applyMove(state, { type: 'playAction', seat: 1, cardId: 'action:eyadi:1' }));

    // العيادي عليّ أنا أول: ما أقدر أفزع لنفسي، فدَيني ينضاف مباشرة (ديناريين عن نفسي)
    expect(state.pending).toEqual({ to: 1, debts: [{ from: ME, amount: 2 }] });
    // ثم نافذة المقعد 2: أنا أفزع له
    expect(state.response?.effect.target).toBe(2);
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:fazaah:1' }));

    // المقعد 2 انلغى عنه، والمقعد 3 يدفع نصيبه. أنا عليّ دَين واحد بس (نصيبي)، مو دَينين.
    expect(state.pending).toEqual({
      to: 1,
      debts: [
        { from: ME, amount: 2 },
        { from: 3, amount: 2 },
      ],
    });
    expect(state.pending?.debts.filter((d) => d.from === ME)).toHaveLength(1);
    expect(state.pending?.debts.some((d) => d.from === 2)).toBe(false);
  });

  it('ما ينلعب إذا أنت المستهدف أو أنت صاحب الأكشن', () => {
    // المستهدف بيده فزعه بس: ما تنفتح له نافذة والأكشن يتنفذ
    expect(qarqashOnSeat1({ 1: ['action:fazaah:1'] }).pending).toEqual(DEBT_5);

    // النافذة مفتوحة للمقعد 2، والمستهدف وصاحب الأكشن يحاولون يلعبون فزعه
    const state = qarqashOnSeat1({ [ME]: ['action:fazaah:1'], 1: ['action:malekAmal:1'], 2: ['action:fazaah:1'] });
    expect(errorOf(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:fazaah:1' }))).toBe('notYourResponse');

    const withTargetFazaah = place(state, 'action:fazaah:1', { zone: 'hand', seat: 1 });
    expect(errorOf(applyMove(withTargetFazaah, { type: 'respond', seat: 1, cardId: 'action:fazaah:1' }))).toBe(
      'invalidResponse',
    );
  });

  it('إذا اللاعب الثالث قال "ما أرد" الأكشن يتنفذ', () => {
    const state = must(applyMove(qarqashOnSeat1({ 2: ['action:fazaah:1'] }), { type: 'respond', seat: 2 }));
    expect(state.pending).toEqual(DEBT_5);
  });

  it('ينرد عليه بمالك امل من صاحب الأكشن: الأكشن يمشي', () => {
    let state = qarqashOnSeat1({ [ME]: ['action:malekAmal:1'], 2: ['action:fazaah:1'] });
    state = must(applyMove(state, { type: 'respond', seat: 2, cardId: 'action:fazaah:1' }));
    expect(state.response?.awaiting).toBe('actor');
    state = must(applyMove(state, { type: 'respond', seat: ME, cardId: 'action:malekAmal:1' }));
    expect(state.pending).toEqual(DEBT_5);
  });
});

describe('حصانه', () => {
  /** ألعب حصانه وأنهي دوري، ثم المقعد 1 يسحب وبيده الكروت المحددة. */
  function immuneThenSeat1(hand: readonly string[]): GameState {
    let state = readyState(['action:hasanah:1']);
    state = place(state, 'money:5:1', { zone: 'bank', seat: ME });
    state = place(state, 'money:5:2', { zone: 'bank', seat: 2 });
    state = place(state, 'money:5:3', { zone: 'bank', seat: 3 });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:hasanah:1' }));
    expect(state.immune).toEqual([ME]);
    expect(state.turn.playsUsed).toBe(1);
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    state = placeAll(state, hand, { zone: 'hand', seat: 1 });
    return must(applyMove(state, { type: 'draw', seat: 1 }));
  }

  it('ما أحد يقدر يختارك كهدف لأكشن أو إيجار', () => {
    let state = immuneThenSeat1(['action:qarqash:1', 'action:ekshef:1', 'rent:rentOne:1']);
    state = giveFullSet(state, 1, 'brown');
    expect(errorOf(applyMove(state, { type: 'playAction', seat: 1, cardId: 'action:qarqash:1', targetSeat: ME }))).toBe(
      'invalidTarget',
    );
    expect(errorOf(applyMove(state, { type: 'playAction', seat: 1, cardId: 'action:ekshef:1', targetSeat: ME }))).toBe(
      'invalidTarget',
    );
    expect(
      errorOf(applyMove(state, { type: 'playRent', seat: 1, cardId: 'rent:rentOne:1', color: 'brown', targetSeat: ME })),
    ).toBe('invalidTarget');
    expect(player(state, 1).hand.some((c) => c.id === 'action:qarqash:1')).toBe(true);
  });

  it('الكروت اللي على الجميع تتعداك: ما تدفع العيادي ولا إيجار الجميع', () => {
    let state = immuneThenSeat1(['action:eyadi:1']);
    state = must(applyMove(state, { type: 'playAction', seat: 1, cardId: 'action:eyadi:1' }));
    expect(state.pending).toEqual({
      to: 1,
      debts: [
        { from: 2, amount: 2 },
        { from: 3, amount: 2 },
      ],
    });

    let rent = immuneThenSeat1(['rent:rentYellowRed:1']);
    rent = place(rent, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    rent = must(applyMove(rent, { type: 'playRent', seat: 1, cardId: 'rent:rentYellowRed:1', color: 'red' }));
    expect(rent.pending?.debts.map((d) => d.from)).toEqual([2, 3]);
  });

  it('تنتهي أول ما يرجع دور صاحبها', () => {
    let state = immuneThenSeat1([]);
    for (const seat of [1, 2, 3]) {
      if (seat !== 1) state = must(applyMove(state, { type: 'draw', seat }));
      expect(state.immune).toEqual([ME]);
      state = must(applyMove(state, { type: 'endTurn', seat }));
    }
    expect(state.turn.seat).toBe(ME);
    expect(state.immune).toEqual([]);
  });

  it('حيور ما ينلعب على صاحب حصانه: يعتبر أكشن على لاعب محمي', () => {
    function attack(seat1Hand: readonly string[]): GameState {
      let state = readyState(['action:hasanah:1', 'action:qarqash:1']);
      state = place(state, 'money:5:1', { zone: 'bank', seat: 1 });
      state = placeAll(state, seat1Hand, { zone: 'hand', seat: 1 });
      state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:hasanah:1' }));
      return must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 }));
    }

    // بيده حيور بس: ما تنفتح له نافذة والأكشن يتنفذ
    const onlyHayyour = attack(['action:hayyour:1']);
    expect(onlyHayyour.response).toBeNull();
    expect(onlyHayyour.pending).toEqual({ to: ME, debts: [{ from: 1, amount: 5 }] });

    // بيده حيور ومالك امل: حيور ينرفض ومالك امل ينقبل
    let both = attack(['action:hayyour:1', 'action:malekAmal:1']);
    expect(errorOf(applyMove(both, { type: 'respond', seat: 1, cardId: 'action:hayyour:1' }))).toBe('invalidResponse');
    both = must(applyMove(both, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));
    expect(both.pending).toBeNull();
  });

  it('تنحسب من الـ3 كروت', () => {
    const state = { ...readyState(['action:hasanah:1']) };
    const full = { ...state, turn: { ...state.turn, playsUsed: 3 } };
    expect(errorOf(applyMove(full, { type: 'playAction', seat: ME, cardId: 'action:hasanah:1' }))).toBe('noPlaysLeft');
  });
});

describe('ماتشوف شر', () => {
  function rentOnSeat1(seat1Hand: readonly string[]): GameState {
    let state = giveFullSet(readyState(['rent:rentOne:1']), ME, 'darkBlue');
    state = place(state, 'money:10:1', { zone: 'bank', seat: 1 });
    state = placeAll(state, seat1Hand, { zone: 'hand', seat: 1 });
    return must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'darkBlue', targetSeat: 1 }));
  }

  it('يلغي إيجار مطلوب منك مرة وحدة (الكرت يروح للنار)', () => {
    let state = rentOnSeat1(['action:maTshoofShar:1']);
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:maTshoofShar:1' }));
    expect(state.pending).toBeNull();
    expect(bankIds(state, 1)).toEqual(['money:10:1']);
    expect(player(state, 1).hand).toHaveLength(0);
    expect(fireIds(state)).toEqual(['rent:rentOne:1', 'action:maTshoofShar:1']);
  });

  it('ما ينلعب ضد أكشن مو إيجار', () => {
    // قرقش: ما تنفتح نافذة لأن ماتشوف شر ما ينفع ضده
    expect(qarqashOnSeat1({ 1: ['action:maTshoofShar:1'] }).pending).toEqual(DEBT_5);
    // حتى لو النافذة مفتوحة (بيده مالك امل بعد) ماتشوف شر ينرفض
    const state = qarqashOnSeat1({ 1: ['action:maTshoofShar:1', 'action:malekAmal:1'] });
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:maTshoofShar:1' }))).toBe('invalidResponse');
  });

  it('يشتغل ضد تثمين لأنه إيجار', () => {
    let state = giveFullSet(readyState(['action:tathmeen:1']), ME, 'darkBlue');
    state = place(state, 'money:10:1', { zone: 'bank', seat: 1 });
    state = place(state, 'action:maTshoofShar:1', { zone: 'hand', seat: 1 });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:tathmeen:1', targetSeat: 1 }));
    expect(state.response?.effect.isRent).toBe(true);
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:maTshoofShar:1' }));
    expect(state.pending).toBeNull();
  });
});

describe('ادفعلي ايجاري', () => {
  function rentOnSeat1(hands: Record<number, readonly string[]>): GameState {
    let state = giveFullSet(readyState(['rent:rentOne:1']), ME, 'darkBlue');
    for (const seat of [1, 2, 3]) {
      state = place(state, `money:5:${seat}`, { zone: 'bank', seat });
      state = place(state, `money:4:${seat}`, { zone: 'bank', seat });
      state = placeAll(state, hands[seat] ?? [], { zone: 'hand', seat });
    }
    return must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'darkBlue', targetSeat: 1 }));
  }

  it('لاعب ثاني تختاره أنت يدفع الإيجار عنك', () => {
    let state = rentOnSeat1({ 1: ['action:edfaaliEjari:1'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:edfaaliEjari:1', payerSeat: 3 }));
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 3, amount: 8 }] });
    state = must(applyMove(state, { type: 'pay', seat: 3, cardIds: ['money:5:3', 'money:4:3'] }));
    expect(bankIds(state, ME)).toEqual(['money:4:3', 'money:5:3']);
    expect(bankIds(state, 1)).toEqual(['money:4:1', 'money:5:1']);
    expect132(state);
  });

  it('اللاعب المختار يقدر يرد بكروته', () => {
    let state = rentOnSeat1({ 1: ['action:edfaaliEjari:1'], 3: ['action:malekAmal:1'] });
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:edfaaliEjari:1', payerSeat: 3 }));
    expect(state.response?.effect.target).toBe(3);
    state = must(applyMove(state, { type: 'respond', seat: 3, cardId: 'action:malekAmal:1' }));
    expect(state.pending).toBeNull();
    expect(bankIds(state, 3)).toEqual(['money:4:3', 'money:5:3']);
  });

  it('ينرفض إذا اللاعب المختار أنت أو طالب الإيجار أو بدون اختيار، وما ينلعب ضد أكشن مو إيجار', () => {
    const state = rentOnSeat1({ 1: ['action:edfaaliEjari:1'] });
    const base = { type: 'respond', seat: 1, cardId: 'action:edfaaliEjari:1' } as const;
    expect(errorOf(applyMove(state, { ...base, payerSeat: 1 }))).toBe('invalidTarget');
    expect(errorOf(applyMove(state, { ...base, payerSeat: ME }))).toBe('invalidTarget');
    expect(errorOf(applyMove(state, base))).toBe('invalidTarget');
    expect(qarqashOnSeat1({ 1: ['action:edfaaliEjari:1'] }).pending).toEqual(DEBT_5);
  });
});

describe('طب وتخير', () => {
  it('ينلعب بدورك كأي أكشن، حتى "راحت عليك"', () => {
    let state = giveFullSet(readyState(['action:tebWetkhayyar:1']), 2, 'darkBlue');
    state = must(
      applyMove(state, {
        type: 'playAction',
        seat: ME,
        cardId: 'action:tebWetkhayyar:1',
        asAction: 'rahatAlek',
        targetSeat: 2,
        color: 'darkBlue',
      }),
    );
    expect(completeColors(player(state, ME).properties)).toEqual(['darkBlue']);
    expect(fireIds(state)).toEqual(['action:tebWetkhayyar:1']);
    expect(state.turn.playsUsed).toBe(1);
    expect132(state);
  });

  it('ينلعب خارج دورك كأي كرت رد', () => {
    let state = qarqashOnSeat1({ 1: ['action:tebWetkhayyar:1'] });
    expect(state.response?.awaiting).toBe('defense');
    expect(errorOf(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:tebWetkhayyar:1' }))).toBe('invalidResponse');
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:tebWetkhayyar:1', as: 'malekAmal' }));
    expect(state.pending).toBeNull();
    expect(bankIds(state, 1)).toEqual(['money:5:1']);
  });

  it('ينلعب كدوبل ايجار مع كرت إيجار', () => {
    let state = giveFullSet(readyState(['rent:rentOne:1', 'action:tebWetkhayyar:1']), ME, 'brown');
    state = place(state, 'money:5:1', { zone: 'bank', seat: 1 });
    state = must(
      applyMove(state, {
        type: 'playRent',
        seat: ME,
        cardId: 'rent:rentOne:1',
        color: 'brown',
        targetSeat: 1,
        doubleCardId: 'action:tebWetkhayyar:1',
      }),
    );
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 1, amount: 4 }] });
  });

  it('ينرفض بدون اختيار الأكشن، أو كأكشن رد بالدور', () => {
    const state = readyState(['action:tebWetkhayyar:1']);
    expect(errorOf(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:tebWetkhayyar:1' }))).toBe(
      'unsupportedAction',
    );
    expect(
      errorOf(
        applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:tebWetkhayyar:1', asAction: 'malekAmal', targetSeat: 1 }),
      ),
    ).toBe('unsupportedAction');
  });
});

describe('أكشن على عدة لاعبين: كل لاعب يرد لوحده', () => {
  it('العيادي: واحد يلغي، واحد ما عنده رد، وواحد يقول "ما أرد"', () => {
    let state = readyState(['action:eyadi:1']);
    for (const seat of [1, 2, 3]) {
      state = place(state, `money:2:${seat}`, { zone: 'bank', seat });
    }
    state = place(state, 'action:malekAmal:1', { zone: 'hand', seat: 1 });
    state = place(state, 'action:malekAmal:2', { zone: 'hand', seat: 3 });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:eyadi:1' }));

    // نافذة المقعد 1 أولاً، والمقعد 3 ما يرد قبل دوره
    expect(state.response?.effect.target).toBe(1);
    expect(errorOf(applyMove(state, { type: 'respond', seat: 3, cardId: 'action:malekAmal:2' }))).toBe('notYourResponse');
    state = must(applyMove(state, { type: 'respond', seat: 1, cardId: 'action:malekAmal:1' }));

    // المقعد 2 ما عنده رد فانضاف دينه، والنافذة صارت للمقعد 3
    expect(state.response?.effect.target).toBe(3);
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 2, amount: 2 }] });
    state = must(applyMove(state, { type: 'respond', seat: 3 }));

    expect(state.response).toBeNull();
    expect(state.pending).toEqual({
      to: ME,
      debts: [
        { from: 2, amount: 2 },
        { from: 3, amount: 2 },
      ],
    });
    expect132(state);
  });

  it('إيجار الجميع: كل لاعب يرد لوحده بكرته', () => {
    let state = giveFullSet(readyState(['rent:rentYellowRed:1']), ME, 'red');
    for (const seat of [1, 2, 3]) {
      state = place(state, `money:10:1`.replace('10:1', `5:${seat}`), { zone: 'bank', seat });
      state = place(state, `money:1:${seat}`, { zone: 'bank', seat });
    }
    state = place(state, 'action:maTshoofShar:1', { zone: 'hand', seat: 2 });
    state = must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentYellowRed:1', color: 'red' }));
    expect(state.response?.effect.target).toBe(2);
    state = must(applyMove(state, { type: 'respond', seat: 2, cardId: 'action:maTshoofShar:1' }));
    expect(state.pending?.debts.map((d) => d.from)).toEqual([1, 3]);
  });
});

describe('1000 مباراة عشوائية بكل الكروت', () => {
  it('تنتهي بدون خطأ وبدون ضياع كروت', () => {
    let finishedByWin = 0;
    let responses = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = createRng(seed * 7919);
      let state = createGame(seed, seed % 2 === 0 ? 6 : 8);
      for (let i = 0; i < 25000 && state.winner === null; i++) {
        const moves = legalMoves(state);
        if (moves.length === 0) throw new Error(`ما فيه حركة قانونية: بذرة ${seed} حركة ${i}`);
        const move = moves[randomInt(rng, moves.length)] as Move;
        if (move.type === 'respond' && move.cardId !== undefined) responses++;
        const result = applyMove(state, move);
        if (!result.ok) throw new Error(`حركة قانونية انرفضت (${result.error}): بذرة ${seed} حركة ${i} ${JSON.stringify(move)}`);
        state = result.state;
        if (i % 40 === 0) expect(new Set(allCards(state).map((card) => card.id)).size).toBe(132);
      }
      expect132(state);
      if (state.winner !== null) finishedByWin++;
    }
    // للتوثيق: كم مباراة انتهت بفوز، وكم كرت رد انلعب
    process.stdout.write(`\n[1000 مباراة] انتهت بفوز: ${finishedByWin} — كروت رد انلعبت: ${responses}\n`);
    expect(responses).toBeGreaterThan(1000);
    // اللعب العشوائي ضعيف، فعدد قليل من المباريات يوصل حد الحركات قبل ما أحد يفوز.
    expect(finishedByWin).toBeGreaterThan(900);
  }, 600000);
});
