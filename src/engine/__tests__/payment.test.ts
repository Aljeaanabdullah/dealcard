// اختبارات الإيجار والدفع والمباني — plan.md المرحلة 3، والقوانين من prd.md 5.3 إلى 5.8
import type { ColorId } from '../../data/colors';
import { applyMove, legalMoves, type Move } from '../moves';
import { rentFor } from '../payment';
import { createRng, randomInt } from '../rng';
import { allCards, createGame, type GameState, type PlayerState } from '../state';
import { errorOf, giveFullSet, must, place, placeAll, propertyIds, readyState, setTurn } from '../../testing/helpers';

const ME = 0;

function player(state: GameState, seat: number): PlayerState {
  const found = state.players[seat];
  if (!found) throw new Error('مقعد غير موجود');
  return found;
}

function ids(cards: readonly { id: string }[]): string[] {
  return cards.map((card) => card.id).sort();
}

function bankIds(state: GameState, seat: number): string[] {
  return ids(player(state, seat).bank);
}

function expect132(state: GameState): void {
  const all = allCards(state).map((card) => card.id);
  expect(all).toHaveLength(132);
  expect(new Set(all).size).toBe(132);
}

describe('حساب الإيجار', () => {
  // جدول الإيجار من prd.md 5.6
  const table: [ColorId, number[]][] = [
    ['brown', [1, 2]],
    ['lightBlue', [1, 2, 3]],
    ['pistachio', [1, 2]],
    ['purple', [1, 2, 4]],
    ['orange', [1, 3, 5]],
    ['red', [2, 3, 6]],
    ['yellow', [2, 4, 6]],
    ['green', [2, 4, 7]],
    ['darkBlue', [3, 8]],
    ['black', [1, 2, 3, 4]],
  ];

  it('الإيجار صحيح لكل لون وكل عدد عقارات', () => {
    for (const [color, rents] of table) {
      const all = propertyIds(color);
      expect(all).toHaveLength(rents.length);
      rents.forEach((rent, index) => {
        const state = placeAll(readyState([]), all.slice(0, index + 1), { zone: 'properties', seat: ME, color });
        expect(rentFor(player(state, ME), color)).toBe(rent);
      });
    }
  });

  it('كل مبنى يزيد إيجار الطقم الكامل بقيمته', () => {
    const bonus: [string, number][] = [
      ['building:resort:1', 5],
      ['building:chalet:1', 4],
      ['building:plot:1', 3],
      ['building:apartments:1', 4],
    ];
    for (const [cardId, extra] of bonus) {
      let state = giveFullSet(readyState([]), ME, 'brown');
      state = place(state, cardId, { zone: 'buildings', seat: ME, color: 'brown' });
      expect(rentFor(player(state, ME), 'brown')).toBe(2 + extra);
    }
  });

  it('المباني بدون ترتيب وبدون حد: كلها تنجمع على نفس الطقم', () => {
    let state = giveFullSet(readyState([]), ME, 'darkBlue');
    for (const cardId of ['building:apartments:1', 'building:apartments:2', 'building:resort:1', 'building:plot:1']) {
      state = place(state, cardId, { zone: 'buildings', seat: ME, color: 'darkBlue' });
    }
    expect(rentFor(player(state, ME), 'darkBlue')).toBe(8 + 4 + 4 + 5 + 3);
  });

  it('الجيكر ينحسب بعدد العقارات إذا معه عقار حقيقي', () => {
    let state = place(readyState([]), 'property:purple:1', { zone: 'properties', seat: ME, color: 'purple' });
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'purple' });
    expect(rentFor(player(state, ME), 'purple')).toBe(2);
  });

  it('الجيكر لحاله بدون عقار حقيقي ما له إيجار', () => {
    const state = place(readyState([]), 'joker:1', { zone: 'properties', seat: ME, color: 'purple' });
    expect(rentFor(player(state, ME), 'purple')).toBe(0);
  });

  it('المبنى بدون طقم ما يزيد الإيجار', () => {
    let state = place(readyState([]), 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: ME, color: null });
    expect(rentFor(player(state, ME), 'brown')).toBe(1);
  });
});

describe('كروت الإيجار', () => {
  it('ايجار الجميع: كل اللاعبين يدفعون إيجار اللون المختار', () => {
    let state = readyState(['rent:rentYellowRed:1']);
    state = placeAll(state, ['property:red:1', 'property:red:2'], { zone: 'properties', seat: ME, color: 'red' });
    for (const seat of [1, 2, 3]) {
      state = place(state, `money:5:${seat}`, { zone: 'bank', seat });
    }
    state = must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentYellowRed:1', color: 'red' }));

    expect(state.pending).toEqual({
      to: ME,
      debts: [
        { from: 1, amount: 3 },
        { from: 2, amount: 3 },
        { from: 3, amount: 3 },
      ],
    });
    expect(state.turn.playsUsed).toBe(1);
    expect(ids(state.firePile)).toEqual(['rent:rentYellowRed:1']);

    for (const seat of [3, 1, 2]) {
      state = must(applyMove(state, { type: 'pay', seat, cardIds: [`money:5:${seat}`] }));
    }
    expect(state.pending).toBeNull();
    expect(bankIds(state, ME)).toEqual(['money:5:1', 'money:5:2', 'money:5:3']);
    expect132(state);
  });

  it('ما ينطلب إيجار لون ما تملكه، ولا لون مو على الكرت', () => {
    let state = readyState(['rent:rentYellowRed:1']);
    state = place(state, 'property:green:1', { zone: 'properties', seat: ME, color: 'green' });
    expect(errorOf(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentYellowRed:1', color: 'red' }))).toBe(
      'noPropertyInColor',
    );
    expect(
      errorOf(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentYellowRed:1', color: 'green' })),
    ).toBe('colorNotAllowed');
  });

  it('ما ينطلب إيجار على جيكر لحاله', () => {
    let state = readyState(['rent:rentOne:1']);
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    expect(
      errorOf(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'brown', targetSeat: 1 })),
    ).toBe('noPropertyInColor');
  });

  it('ادفع ايجار شخص واحد: يصلح لأي لون (حتى البني) ويدفع لاعب واحد تختاره', () => {
    let state = readyState(['rent:rentOne:1']);
    state = giveFullSet(state, ME, 'brown');
    state = place(state, 'money:2:1', { zone: 'bank', seat: 2 });
    state = place(state, 'money:2:2', { zone: 'bank', seat: 3 });

    expect(errorOf(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'brown' }))).toBe(
      'invalidTarget',
    );
    expect(
      errorOf(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'brown', targetSeat: ME })),
    ).toBe('invalidTarget');

    state = must(applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'brown', targetSeat: 2 }));
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 2, amount: 2 }] });
  });

  it('دوبل ايجار يضاعف الإيجار وما ينحسب من الـ3 كروت', () => {
    let state = readyState(['rent:rentYellowRed:1', 'action:doubleRent:1']);
    state = giveFullSet(state, ME, 'yellow');
    state = place(state, 'money:10:1', { zone: 'bank', seat: 1 });
    state = must(
      applyMove(state, {
        type: 'playRent',
        seat: ME,
        cardId: 'rent:rentYellowRed:1',
        color: 'yellow',
        doubleCardId: 'action:doubleRent:1',
      }),
    );
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 1, amount: 12 }] });
    expect(state.turn.playsUsed).toBe(1);
    expect(player(state, ME).hand).toHaveLength(0);
    expect(ids(state.firePile)).toEqual(['action:doubleRent:1', 'rent:rentYellowRed:1']);
  });

  it('كرت الدوبل لازم يكون "دوبل ايجار" وباليد', () => {
    let state = readyState(['rent:rentYellowRed:1', 'action:draw2:1']);
    state = giveFullSet(state, ME, 'yellow');
    const base = { type: 'playRent', seat: ME, cardId: 'rent:rentYellowRed:1', color: 'yellow' } as const;
    expect(errorOf(applyMove(state, { ...base, doubleCardId: 'action:draw2:1' }))).toBe('wrongCardKind');
    expect(errorOf(applyMove(state, { ...base, doubleCardId: 'action:doubleRent:1' }))).toBe('cardNotInHand');
  });
});

describe('كروت الدفع الثابت', () => {
  function withBanks(state: GameState): GameState {
    let next = state;
    for (const seat of [1, 2, 3]) {
      next = place(next, `money:10:1`.replace('10:1', `5:${seat}`), { zone: 'bank', seat });
      next = place(next, `money:2:${seat}`, { zone: 'bank', seat });
    }
    return next;
  }

  it('قرقش: لاعب تختاره يدفع 5', () => {
    let state = withBanks(readyState(['action:qarqash:1']));
    expect(errorOf(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1' }))).toBe('invalidTarget');
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 3 }));
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 3, amount: 5 }] });
    expect(state.turn.playsUsed).toBe(1);
  });

  it('قرض اسكان: لاعب تختاره يدفع 7', () => {
    let state = withBanks(readyState(['action:qardIskan:1']));
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qardIskan:1', targetSeat: 1 }));
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 1, amount: 7 }] });
  });

  it('العيادي: كل اللاعبين يدفعون دينارين', () => {
    let state = withBanks(readyState(['action:eyadi:1']));
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:eyadi:1' }));
    expect(state.pending).toEqual({
      to: ME,
      debts: [
        { from: 1, amount: 2 },
        { from: 2, amount: 2 },
        { from: 3, amount: 2 },
      ],
    });
  });

  it('تثمين: لاعب واحد يدفع إيجار كل أطقمك الكاملة مع مبانيها', () => {
    let state = withBanks(readyState(['action:tathmeen:1']));
    state = giveFullSet(state, ME, 'brown');
    state = giveFullSet(state, ME, 'darkBlue');
    state = place(state, 'building:plot:1', { zone: 'buildings', seat: ME, color: 'brown' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:tathmeen:1', targetSeat: 2 }));
    // بني 2 + قسيمه 3 + أزرق غامق 8 = 13 (الأحمر الناقص ما ينحسب)
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 2, amount: 13 }] });
  });

  it('تثمين ينرفض إذا ما عندك طقم كامل', () => {
    let state = withBanks(readyState(['action:tathmeen:1']));
    state = place(state, 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    expect(
      errorOf(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:tathmeen:1', targetSeat: 2 })),
    ).toBe('noCompleteSet');
  });

  it('كروت الأكشن اللي ما انبنت بعد تنرفض وتبقى باليد', () => {
    const state = readyState(['action:boog:1']);
    expect(errorOf(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:boog:1', targetSeat: 1 }))).toBe(
      'unsupportedAction',
    );
  });
});

describe('الدفع', () => {
  /** المقعد 1 عليه مبلغ للمقعد 0. */
  function owing(amount: number, setup: (state: GameState) => GameState): GameState {
    return { ...setup(readyState([])), pending: { to: ME, debts: [{ from: 1, amount }] } };
  }

  it('الدفع بالزيادة ما يرجّع باقي', () => {
    let state = owing(5, (s) => place(s, 'money:10:1', { zone: 'bank', seat: 1 }));
    state = must(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:10:1'] }));
    expect(bankIds(state, ME)).toEqual(['money:10:1']);
    expect(player(state, 1).bank).toHaveLength(0);
    expect(state.pending).toBeNull();
    expect132(state);
  });

  it('المفلس ما يدفع: ما ينضاف دين على اللي ما عنده شي', () => {
    let state = readyState(['action:eyadi:1']);
    state = place(state, 'money:2:1', { zone: 'bank', seat: 2 });
    state = place(state, 'joker:1', { zone: 'properties', seat: 3, color: 'red' });
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:eyadi:1' }));
    expect(state.pending).toEqual({ to: ME, debts: [{ from: 2, amount: 2 }] });
  });

  it('إذا كل المطلوبين مفلسين ما فيه دفع معلّق واللعب يكمل', () => {
    let state = readyState(['action:qarqash:1']);
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 }));
    expect(state.pending).toBeNull();
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBeNull();
  });

  it('اللي عنده أقل من المطلوب يدفع كل اللي عنده', () => {
    let state = owing(5, (s) => place(s, 'money:2:1', { zone: 'bank', seat: 1 }));
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: [] }))).toBe('invalidPayment');
    state = must(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:2:1'] }));
    expect(bankIds(state, ME)).toEqual(['money:2:1']);
  });

  it('يدفع من البنك أولاً: ما يدفع عقار ولا مبنى والبنك يكفي', () => {
    const state = owing(3, (s) => {
      let next = place(s, 'money:3:1', { zone: 'bank', seat: 1 });
      next = place(next, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
      return place(next, 'building:plot:1', { zone: 'buildings', seat: 1, color: null });
    });
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['property:red:1'] }))).toBe('invalidPayment');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['building:plot:1'] }))).toBe('invalidPayment');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:3:1', 'property:red:1'] }))).toBe(
      'invalidPayment',
    );
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:3:1'] }))).toBeNull();
  });

  it('الترتيب: البنك ثم المباني ثم العقارات', () => {
    const setup = (s: GameState) => {
      let next = place(s, 'money:1:1', { zone: 'bank', seat: 1 });
      next = place(next, 'building:plot:1', { zone: 'buildings', seat: 1, color: null });
      next = place(next, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
      return place(next, 'property:red:2', { zone: 'properties', seat: 1, color: 'red' });
    };

    // مطلوب 4: البنك (1) ما يكفي، فيدفع البنك كله + المبنى (3). العقار ما ينمس.
    const four = owing(4, setup);
    expect(errorOf(applyMove(four, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'property:red:1'] }))).toBe(
      'invalidPayment',
    );
    expect(errorOf(applyMove(four, { type: 'pay', seat: 1, cardIds: ['building:plot:1'] }))).toBe('invalidPayment');
    const paidFour = must(applyMove(four, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'building:plot:1'] }));
    expect(player(paidFour, 1).properties).toHaveLength(2);

    // مطلوب 6: البنك (1) + المبنى (3) ما يكفون، فيكمل من العقارات (3).
    const six = owing(6, setup);
    expect(errorOf(applyMove(six, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'building:plot:1'] }))).toBe(
      'invalidPayment',
    );
    const paidSix = must(
      applyMove(six, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'building:plot:1', 'property:red:2'] }),
    );
    expect(player(paidSix, 1).properties.map((p) => p.card.id)).toEqual(['property:red:1']);
    expect132(paidSix);
  });

  it('العقار المدفوع ينتقل للطالب بلونه، والمبنى المدفوع ينتقل له بدون طقم', () => {
    let state = owing(9, (s) => {
      let next = place(s, 'building:resort:1', { zone: 'buildings', seat: 1, color: null });
      return place(next, 'property:green:1', { zone: 'properties', seat: 1, color: 'green' });
    });
    state = must(applyMove(state, { type: 'pay', seat: 1, cardIds: ['building:resort:1', 'property:green:1'] }));
    expect(player(state, ME).properties).toEqual([
      { card: { id: 'property:green:1', kind: 'property', color: 'green', region: 'الشامية' }, color: 'green' },
    ]);
    expect(player(state, ME).buildings).toEqual([
      { card: { id: 'building:resort:1', kind: 'building', building: 'resort' }, color: null },
    ]);
    expect(player(state, 1).properties).toHaveLength(0);
    expect(player(state, 1).buildings).toHaveLength(0);
  });

  it('الجيكر والأكشن ما يندفع فيهم', () => {
    const state = owing(5, (s) => {
      let next = place(s, 'money:1:1', { zone: 'bank', seat: 1 });
      next = place(next, 'joker:1', { zone: 'properties', seat: 1, color: 'red' });
      return place(next, 'action:draw2:1', { zone: 'hand', seat: 1 });
    });
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'joker:1'] }))).toBe('invalidPayment');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:1:1', 'action:draw2:1'] }))).toBe(
      'invalidPayment',
    );
    const paid = must(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:1:1'] }));
    expect(player(paid, 1).properties.map((p) => p.card.id)).toEqual(['joker:1']);
  });

  it('يرفض تكرار نفس الكرت أو كرت مو عند الدافع', () => {
    const state = owing(4, (s) => {
      let next = place(s, 'money:2:1', { zone: 'bank', seat: 1 });
      next = place(next, 'money:2:2', { zone: 'bank', seat: 1 });
      return place(next, 'money:5:1', { zone: 'bank', seat: 2 });
    });
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:2:1', 'money:2:1'] }))).toBe('invalidPayment');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 1, cardIds: ['money:5:1'] }))).toBe('invalidPayment');
  });

  it('اللعب يوقف لين يخلص الدفع، وما يدفع إلا المديون', () => {
    const state = owing(2, (s) => place(place(s, 'money:2:1', { zone: 'bank', seat: 1 }), 'money:2:2', { zone: 'bank', seat: 2 }));
    expect(errorOf(applyMove(state, { type: 'endTurn', seat: ME }))).toBe('paymentPending');
    expect(errorOf(applyMove(state, { type: 'pay', seat: 2, cardIds: ['money:2:2'] }))).toBe('noPaymentDue');
    expect(errorOf(applyMove(readyState([]), { type: 'pay', seat: 1, cardIds: [] }))).toBe('noPaymentDue');
  });

  it('إذا العقار المدفوع كمّل للطالب العدد المطلوب من الأطقم يفوز', () => {
    let state = owing(4, (s) => place(s, 'property:green:3', { zone: 'properties', seat: 1, color: 'green' }));
    for (const color of ['brown', 'pistachio', 'darkBlue', 'red', 'yellow'] as const) {
      state = giveFullSet(state, ME, color);
    }
    state = placeAll(state, ['property:green:1', 'property:green:2'], { zone: 'properties', seat: ME, color: 'green' });
    state = must(applyMove(state, { type: 'pay', seat: 1, cardIds: ['property:green:3'] }));
    expect(state.winner).toBe(ME);
  });
});

describe('المباني', () => {
  it('المبنى ينحط على طقم كامل فقط', () => {
    let state = readyState(['building:chalet:1']);
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    expect(
      errorOf(applyMove(state, { type: 'playBuilding', seat: ME, cardId: 'building:chalet:1', color: 'brown' })),
    ).toBe('setNotComplete');

    state = place(state, 'property:brown:2', { zone: 'properties', seat: ME, color: 'brown' });
    state = must(applyMove(state, { type: 'playBuilding', seat: ME, cardId: 'building:chalet:1', color: 'brown' }));
    expect(player(state, ME).buildings).toEqual([
      { card: { id: 'building:chalet:1', kind: 'building', building: 'chalet' }, color: 'brown' },
    ]);
    expect(state.turn.playsUsed).toBe(1);
    expect(rentFor(player(state, ME), 'brown')).toBe(6);
  });

  it('إذا انكسر الطقم مبانيه تنتقل لمنطقة عقارات صاحبها بدون تأثير', () => {
    let state = readyState([]);
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'joker:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: ME, color: 'brown' });
    state = place(state, 'building:plot:1', { zone: 'buildings', seat: ME, color: 'brown' });
    expect(rentFor(player(state, ME), 'brown')).toBe(2 + 5 + 3);

    // نقل الجيكر يكسر الطقم البني
    state = must(applyMove(state, { type: 'moveJoker', seat: ME, cardId: 'joker:1', color: 'red' }));
    expect(player(state, ME).buildings.map((b) => b.color)).toEqual([null, null]);
    expect(rentFor(player(state, ME), 'brown')).toBe(1);
    expect132(state);
  });

  it('إرجاع مبنى بدون طقم على طقم كامل ينحسب من الـ3 كروت', () => {
    let state = giveFullSet(readyState([]), ME, 'darkBlue');
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: ME, color: null });
    state = place(state, 'building:plot:1', { zone: 'buildings', seat: ME, color: 'darkBlue' });

    expect(
      errorOf(applyMove(state, { type: 'placeBuilding', seat: ME, cardId: 'building:resort:1', color: 'red' })),
    ).toBe('setNotComplete');
    expect(
      errorOf(applyMove(state, { type: 'placeBuilding', seat: ME, cardId: 'building:plot:1', color: 'darkBlue' })),
    ).toBe('buildingNotLoose');

    state = must(applyMove(state, { type: 'placeBuilding', seat: ME, cardId: 'building:resort:1', color: 'darkBlue' }));
    expect(state.turn.playsUsed).toBe(1);
    expect(rentFor(player(state, ME), 'darkBlue')).toBe(8 + 3 + 5);
  });

  it('لعب المبنى وإرجاعه ينرفض إذا خلصت الـ3 كروت', () => {
    let state = giveFullSet(readyState(['building:chalet:1']), ME, 'brown');
    state = setTurn(state, { playsUsed: 3 });
    expect(
      errorOf(applyMove(state, { type: 'playBuilding', seat: ME, cardId: 'building:chalet:1', color: 'brown' })),
    ).toBe('noPlaysLeft');
  });
});

describe('مباريات عشوائية مع الإيجار والدفع', () => {
  it('تمشي بدون خطأ وبدون ضياع كروت، والدفع المعلّق ينحل دائماً', () => {
    let payments = 0;
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const rng = createRng(seed + 500);
      let state = createGame(seed, 6);
      for (let i = 0; i < 4000 && state.winner === null; i++) {
        const moves = legalMoves(state);
        expect(moves.length).toBeGreaterThan(0);
        const move = moves[randomInt(rng, moves.length)] as Move;
        if (move.type === 'pay') payments++;
        state = must(applyMove(state, move));
        expect(new Set(allCards(state).map((card) => card.id)).size).toBe(132);
      }
      expect132(state);
    }
    expect(payments).toBeGreaterThan(0);
  });
});
