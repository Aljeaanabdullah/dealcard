// اختبارات كروت الأكشن الهجومية — plan.md المرحلة 4، والقوانين من prd.md 5.4
// لكل كرت: الحالة الصحيحة + حالة الرفض.
import { applyMove, legalMoves, type Move } from '../moves';
import { rentFor } from '../payment';
import { createRng, randomInt } from '../rng';
import { completeColors } from '../sets';
import { allCards, createGame, type GameState, type PlayerState } from '../state';
import { viewFor } from '../view';
import { errorOf, giveFullSet, must, place, placeAll, readyState, setTurn } from '../../testing/helpers';

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

function handIds(state: GameState, seat: number): string[] {
  return player(state, seat).hand.map((c) => c.id);
}

function expect132(state: GameState): void {
  const all = allCards(state).map((card) => card.id);
  expect(all).toHaveLength(132);
  expect(new Set(all).size).toBe(132);
}

function play(state: GameState, move: Omit<Extract<Move, { type: 'playAction' }>, 'type' | 'seat'>): ReturnType<typeof applyMove> {
  return applyMove(state, { type: 'playAction', seat: ME, ...move });
}

describe('بوق لاتخاف', () => {
  const card = 'action:boog:1';

  it('يسرق عقار واحد من لاعب', () => {
    let state = place(readyState([card]), 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = must(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:red:1'] }));
    expect(propIds(state, ME)).toEqual(['property:red:1']);
    expect(propIds(state, 1)).toEqual([]);
    expect(state.turn.playsUsed).toBe(1);
    expect(state.firePile.map((c) => c.id)).toEqual([card]);
    expect132(state);
  });

  it('ينرفض على عقار داخل طقم كامل، وعلى الجيكر، وبدون هدف', () => {
    let state = giveFullSet(readyState([card]), 1, 'brown');
    state = place(state, 'joker:1', { zone: 'properties', seat: 1, color: 'red' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:brown:1'] }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['joker:1'] }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetCardIds: ['property:brown:1'] }))).toBe('invalidTarget');
    expect(errorOf(play(state, { cardId: card, targetSeat: ME, targetCardIds: ['property:brown:1'] }))).toBe('invalidTarget');
    expect(handIds(state, ME)).toEqual([card]);
  });
});

describe('بوق لاتخاف دبل', () => {
  const card = 'action:boogDouble:1';

  it('يسرق عقارين من نفس اللاعب', () => {
    let state = readyState([card]);
    state = place(state, 'property:red:1', { zone: 'properties', seat: 2, color: 'red' });
    state = place(state, 'property:green:1', { zone: 'properties', seat: 2, color: 'green' });
    state = must(play(state, { cardId: card, targetSeat: 2, targetCardIds: ['property:red:1', 'property:green:1'] }));
    expect(propIds(state, ME)).toEqual(['property:green:1', 'property:red:1']);
    expect(propIds(state, 2)).toEqual([]);
    expect132(state);
  });

  it('إذا المستهدف عنده عقار واحد بس ينسرق يسرق الواحد', () => {
    let state = place(readyState([card]), 'property:red:1', { zone: 'properties', seat: 2, color: 'red' });
    state = giveFullSet(state, 2, 'brown');
    state = must(play(state, { cardId: card, targetSeat: 2, targetCardIds: ['property:red:1'] }));
    expect(propIds(state, ME)).toEqual(['property:red:1']);
  });

  it('ينرفض: عقار واحد وعنده اثنين، نفس العقار مرتين، أو عقار من طقم كامل', () => {
    let state = readyState([card]);
    state = place(state, 'property:red:1', { zone: 'properties', seat: 2, color: 'red' });
    state = place(state, 'property:green:1', { zone: 'properties', seat: 2, color: 'green' });
    state = giveFullSet(state, 2, 'brown');
    expect(errorOf(play(state, { cardId: card, targetSeat: 2, targetCardIds: ['property:red:1'] }))).toBe('invalidCard');
    expect(
      errorOf(play(state, { cardId: card, targetSeat: 2, targetCardIds: ['property:red:1', 'property:red:1'] })),
    ).toBe('invalidCard');
    expect(
      errorOf(play(state, { cardId: card, targetSeat: 2, targetCardIds: ['property:red:1', 'property:brown:1'] })),
    ).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 3, targetCardIds: [] }))).toBe('invalidCard');
  });
});

describe('بوق الجيكر', () => {
  const card = 'action:boogJoker:1';

  it('يسرق جيكر مو داخل طقم كامل، والسارق يختار لونه', () => {
    let state = place(readyState([card]), 'joker:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    state = must(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['joker:1'], color: 'brown' }));
    expect(completeColors(player(state, ME).properties)).toEqual(['brown']);
    expect(propIds(state, 1)).toEqual([]);
    expect132(state);
  });

  it('ينرفض إذا الجيكر داخل طقم كامل، أو الكرت مو جيكر، أو بدون لون', () => {
    let state = place(readyState([card]), 'property:brown:1', { zone: 'properties', seat: 1, color: 'brown' });
    state = place(state, 'joker:1', { zone: 'properties', seat: 1, color: 'brown' });
    state = place(state, 'joker:2', { zone: 'properties', seat: 1, color: 'red' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['joker:1'], color: 'red' }))).toBe('invalidCard');
    expect(
      errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:brown:1'], color: 'red' })),
    ).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['joker:2'] }))).toBe('colorRequired');
  });
});

describe('بدل', () => {
  const card = 'action:baddel:1';

  function setup(): GameState {
    let state = place(readyState([card]), 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    state = place(state, 'property:green:1', { zone: 'properties', seat: 3, color: 'green' });
    return state;
  }

  it('يبدل عقار عندي بعقار عند لاعب', () => {
    const state = must(
      play(setup(), { cardId: card, targetSeat: 3, targetCardIds: ['property:green:1'], ownCardId: 'property:red:1' }),
    );
    expect(propIds(state, ME)).toEqual(['property:green:1']);
    expect(propIds(state, 3)).toEqual(['property:red:1']);
    expect132(state);
  });

  it('ينرفض إذا أي من العقارين داخل طقم كامل أو جيكر', () => {
    let state = giveFullSet(setup(), ME, 'brown');
    state = giveFullSet(state, 3, 'darkBlue');
    state = place(state, 'joker:1', { zone: 'properties', seat: 3, color: 'yellow' });
    const base = { cardId: card, targetSeat: 3 };
    expect(
      errorOf(play(state, { ...base, targetCardIds: ['property:darkBlue:1'], ownCardId: 'property:red:1' })),
    ).toBe('invalidCard');
    expect(
      errorOf(play(state, { ...base, targetCardIds: ['property:green:1'], ownCardId: 'property:brown:1' })),
    ).toBe('invalidCard');
    expect(errorOf(play(state, { ...base, targetCardIds: ['joker:1'], ownCardId: 'property:red:1' }))).toBe('invalidCard');
    expect(errorOf(play(state, { ...base, targetCardIds: ['property:green:1'] }))).toBe('invalidCard');
  });
});

describe('راحت عليك', () => {
  const card = 'action:rahatAlek:1';

  it('ياخذ طقم كامل من لاعب، والجيكر والمباني ينتقلون معه', () => {
    let state = place(readyState([card]), 'property:brown:1', { zone: 'properties', seat: 1, color: 'brown' });
    state = place(state, 'joker:1', { zone: 'properties', seat: 1, color: 'brown' });
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: 1, color: 'brown' });
    state = place(state, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });

    state = must(play(state, { cardId: card, targetSeat: 1, color: 'brown' }));
    expect(propIds(state, ME)).toEqual(['joker:1', 'property:brown:1']);
    expect(propIds(state, 1)).toEqual(['property:red:1']);
    expect(player(state, ME).buildings.map((b) => [b.card.id, b.color])).toEqual([['building:resort:1', 'brown']]);
    expect(player(state, 1).buildings).toHaveLength(0);
    expect(rentFor(player(state, ME), 'brown')).toBe(2 + 5);
    expect132(state);
  });

  it('ينرفض إذا الطقم مو كامل أو بدون لون', () => {
    const state = place(readyState([card]), 'property:brown:1', { zone: 'properties', seat: 1, color: 'brown' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, color: 'brown' }))).toBe('setNotComplete');
    expect(errorOf(play(state, { cardId: card, targetSeat: 1 }))).toBe('colorRequired');
  });

  it('إذا كمّل العدد المطلوب من الأطقم يفوز', () => {
    let state = giveFullSet(readyState([card]), 1, 'green');
    for (const color of ['brown', 'pistachio', 'darkBlue', 'red', 'yellow'] as const) {
      state = giveFullSet(state, ME, color);
    }
    state = must(play(state, { cardId: card, targetSeat: 1, color: 'green' }));
    expect(state.winner).toBe(ME);
  });
});

describe('اندبس', () => {
  const card = 'action:endebes:1';

  it('يبدل طقم كامل عندي بطقم كامل عند لاعب، والمباني تنتقل مع الأطقم', () => {
    let state = giveFullSet(readyState([card]), ME, 'brown');
    state = giveFullSet(state, 2, 'darkBlue');
    state = place(state, 'building:plot:1', { zone: 'buildings', seat: ME, color: 'brown' });
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: 2, color: 'darkBlue' });

    state = must(play(state, { cardId: card, targetSeat: 2, color: 'darkBlue', ownColor: 'brown' }));
    expect(completeColors(player(state, ME).properties)).toEqual(['darkBlue']);
    expect(completeColors(player(state, 2).properties)).toEqual(['brown']);
    expect(player(state, ME).buildings.map((b) => [b.card.id, b.color])).toEqual([['building:resort:1', 'darkBlue']]);
    expect(player(state, 2).buildings.map((b) => [b.card.id, b.color])).toEqual([['building:plot:1', 'brown']]);
    expect132(state);
  });

  it('ينرفض إذا ما عندي طقم كامل، أو طقم المستهدف مو كامل', () => {
    let state = giveFullSet(readyState([card]), 2, 'darkBlue');
    state = place(state, 'property:brown:1', { zone: 'properties', seat: ME, color: 'brown' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 2, color: 'darkBlue', ownColor: 'brown' }))).toBe(
      'noCompleteSet',
    );
    state = place(state, 'property:brown:2', { zone: 'properties', seat: ME, color: 'brown' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 2, color: 'red', ownColor: 'brown' }))).toBe('setNotComplete');
    expect(errorOf(play(state, { cardId: card, targetSeat: 2, color: 'darkBlue' }))).toBe('colorRequired');
  });
});

describe('ازاله', () => {
  const card = 'action:ezalah:1';

  it('ياخذ عقار من طقم كامل لأراضيي، ومباني الطقم المكسور تبقى عند صاحبها بدون تأثير', () => {
    let state = giveFullSet(readyState([card]), 1, 'darkBlue');
    state = place(state, 'building:resort:1', { zone: 'buildings', seat: 1, color: 'darkBlue' });

    state = must(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:darkBlue:2'] }));
    expect(propIds(state, ME)).toEqual(['property:darkBlue:2']);
    expect(propIds(state, 1)).toEqual(['property:darkBlue:1']);
    expect(player(state, 1).buildings.map((b) => [b.card.id, b.color])).toEqual([['building:resort:1', null]]);
    expect(rentFor(player(state, 1), 'darkBlue')).toBe(3);
    expect132(state);
  });

  it('ينرفض على عقار مو داخل طقم كامل، وعلى الجيكر داخل الطقم', () => {
    let state = place(readyState([card]), 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    state = place(state, 'property:brown:1', { zone: 'properties', seat: 1, color: 'brown' });
    state = place(state, 'joker:1', { zone: 'properties', seat: 1, color: 'brown' });
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:red:1'] }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['joker:1'] }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 1, targetCardIds: ['property:brown:1'] }))).toBeNull();
  });
});

describe('اطحس', () => {
  const card = 'action:etHas:1';

  it('يبدل كل كروت يدي مع يد لاعب', () => {
    let state = readyState([card, 'money:1:1', 'money:1:2']);
    state = placeAll(state, ['money:5:1', 'property:red:1', 'joker:1', 'action:draw2:1'], { zone: 'hand', seat: 2 });
    state = must(play(state, { cardId: card, targetSeat: 2 }));
    expect(handIds(state, ME)).toEqual(['money:5:1', 'property:red:1', 'joker:1', 'action:draw2:1']);
    expect(handIds(state, 2)).toEqual(['money:1:1', 'money:1:2']);
    expect132(state);
  });

  it('ينرفض بدون هدف أو على نفسي', () => {
    const state = readyState([card]);
    expect(errorOf(play(state, { cardId: card }))).toBe('invalidTarget');
    expect(errorOf(play(state, { cardId: card, targetSeat: ME }))).toBe('invalidTarget');
  });
});

describe('ورثتك', () => {
  const card = 'action:werathtek:1';

  it('ياخذ كرت من يد لاعب حسب ترتيبه (بدون رؤية)', () => {
    let state = placeAll(readyState([card]), ['money:5:1', 'property:red:1', 'joker:1'], { zone: 'hand', seat: 3 });
    state = must(play(state, { cardId: card, targetSeat: 3, handIndex: 1 }));
    expect(handIds(state, ME)).toEqual(['property:red:1']);
    expect(handIds(state, 3)).toEqual(['money:5:1', 'joker:1']);
    expect132(state);
  });

  it('ينرفض إذا الترتيب خارج اليد، أو اليد فاضية، أو بدون ترتيب', () => {
    const state = place(readyState([card]), 'money:5:1', { zone: 'hand', seat: 3 });
    expect(errorOf(play(state, { cardId: card, targetSeat: 3, handIndex: 1 }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 3, handIndex: -1 }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 2, handIndex: 0 }))).toBe('invalidCard');
    expect(errorOf(play(state, { cardId: card, targetSeat: 3 }))).toBe('invalidCard');
  });
});

describe('مخالفه', () => {
  const card = 'action:mukhalafah:1';

  it('يحرق كرت من يد لاعبين', () => {
    let state = placeAll(readyState([card]), ['money:5:1', 'property:red:1'], { zone: 'hand', seat: 1 });
    state = placeAll(state, ['joker:1', 'money:1:1'], { zone: 'hand', seat: 3 });
    state = must(
      play(state, {
        cardId: card,
        burns: [
          { seat: 1, handIndex: 1 },
          { seat: 3, handIndex: 0 },
        ],
      }),
    );
    expect(handIds(state, 1)).toEqual(['money:5:1']);
    expect(handIds(state, 3)).toEqual(['money:1:1']);
    expect(state.firePile.map((c) => c.id)).toEqual([card, 'property:red:1', 'joker:1']);
    expect132(state);
  });

  it('تنلعب على المتوفر: إذا ما فيه إلا لاعب واحد بيده كروت ينحرق منه هو بس', () => {
    let state = place(readyState([card]), 'money:5:1', { zone: 'hand', seat: 2 });
    state = must(play(state, { cardId: card, burns: [{ seat: 2, handIndex: 0 }] }));
    expect(handIds(state, 2)).toEqual([]);
  });

  it('ينرفض: لاعب واحد وفيه اثنين بكروت، نفس اللاعب مرتين، يد فاضية، أو ما فيه أحد بيده كروت', () => {
    let state = place(readyState([card]), 'money:5:1', { zone: 'hand', seat: 1 });
    state = place(state, 'money:5:2', { zone: 'hand', seat: 2 });
    expect(errorOf(play(state, { cardId: card, burns: [{ seat: 1, handIndex: 0 }] }))).toBe('invalidTarget');
    expect(
      errorOf(
        play(state, {
          cardId: card,
          burns: [
            { seat: 1, handIndex: 0 },
            { seat: 1, handIndex: 0 },
          ],
        }),
      ),
    ).toBe('invalidTarget');
    expect(
      errorOf(
        play(state, {
          cardId: card,
          burns: [
            { seat: 1, handIndex: 0 },
            { seat: 3, handIndex: 0 },
          ],
        }),
      ),
    ).toBe('invalidTarget');
    expect(
      errorOf(
        play(state, {
          cardId: card,
          burns: [
            { seat: 1, handIndex: 0 },
            { seat: 2, handIndex: 4 },
          ],
        }),
      ),
    ).toBe('invalidCard');
    expect(errorOf(play(readyState([card]), { cardId: card, burns: [] }))).toBe('invalidTarget');
  });
});

describe('اسحب 2', () => {
  const card = 'action:draw2:1';

  it('يسحب كرتين إضافيتين وينحسب من الـ3 كروت', () => {
    const before = readyState([card]);
    const state = must(play(before, { cardId: card }));
    expect(player(state, ME).hand).toHaveLength(2);
    expect(state.drawPile).toHaveLength(before.drawPile.length - 2);
    expect(state.turn.playsUsed).toBe(1);
    expect132(state);
  });

  it('ينرفض إذا خلصت الـ3 كروت', () => {
    const state = setTurn(readyState([card]), { playsUsed: 3 });
    expect(errorOf(play(state, { cardId: card }))).toBe('noPlaysLeft');
  });
});

describe('زايد لعبه', () => {
  const card = 'action:extraPlay:1';
  const money = ['money:1:1', 'money:1:2', 'money:1:3', 'money:1:4', 'money:1:5'];

  it('تلعب 4 كروت بدل 3 بهالدور، والكرت نفسه ما ينحسب', () => {
    let state = must(play(readyState([card, ...money]), { cardId: card }));
    expect(state.turn.playsUsed).toBe(0);
    for (const cardId of money.slice(0, 4)) {
      state = must(applyMove(state, { type: 'bankMoney', seat: ME, cardId }));
    }
    expect(state.turn.playsUsed).toBe(4);
    expect(errorOf(applyMove(state, { type: 'bankMoney', seat: ME, cardId: 'money:1:5' }))).toBe('noPlaysLeft');
  });

  it('الزيادة لهالدور بس: الدور اللي بعده يرجع 3', () => {
    let state = must(play(readyState([card]), { cardId: card }));
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    expect(state.extraPlays).toBe(0);
  });

  it('ينرفض إذا خلصت كروت الدور قبل ما ينلعب', () => {
    const state = setTurn(readyState([card]), { playsUsed: 3 });
    expect(errorOf(play(state, { cardId: card }))).toBe('noPlaysLeft');
  });
});

describe('استريح', () => {
  const card = 'action:estareeh:1';

  it('اللاعب المختار يفوّت دوره القادم: ما يسحب ولا يلعب', () => {
    let state = must(play(readyState([card]), { cardId: card, targetSeat: 1 }));
    expect(state.skips).toEqual([1]);
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    expect(state.turn.seat).toBe(2);
    expect(state.skips).toEqual([]);
    expect(player(state, 1).hand).toHaveLength(0);
    expect(errorOf(applyMove(state, { type: 'draw', seat: 1 }))).toBe('notYourTurn');
  });

  it('التفويت لدور واحد بس: الدورة اللي بعدها يلعب عادي', () => {
    let state = must(play(readyState([card]), { cardId: card, targetSeat: 1 }));
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    for (const seat of [2, 3, 0]) {
      state = must(applyMove(state, { type: 'draw', seat }));
      state = must(applyMove(state, { type: 'endTurn', seat }));
    }
    expect(state.turn.seat).toBe(1);
  });

  it('ينلعب على لاعب دوره أصلاً متفوّت، والتفويت يتراكم: يفوّت دورين', () => {
    let state = must(play({ ...readyState([card]), skips: [1] }, { cardId: card, targetSeat: 1 }));
    expect(state.skips).toEqual([1, 1]);

    // الدورة الأولى: المقعد 1 يتفوّت
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    expect(state.turn.seat).toBe(2);
    expect(state.skips).toEqual([1]);

    // الدورة الثانية: المقعد 1 يتفوّت مرة ثانية
    for (const seat of [2, 3, 0]) {
      state = must(applyMove(state, { type: 'draw', seat }));
      state = must(applyMove(state, { type: 'endTurn', seat }));
    }
    expect(state.turn.seat).toBe(2);
    expect(state.skips).toEqual([]);

    // الدورة الثالثة: يلعب عادي
    for (const seat of [2, 3, 0]) {
      state = must(applyMove(state, { type: 'draw', seat }));
      state = must(applyMove(state, { type: 'endTurn', seat }));
    }
    expect(state.turn.seat).toBe(1);
  });

  it('ينرفض بدون هدف أو على نفسي', () => {
    const state = readyState([card]);
    expect(errorOf(play(state, { cardId: card }))).toBe('invalidTarget');
    expect(errorOf(play(state, { cardId: card, targetSeat: ME }))).toBe('invalidTarget');
  });
});

describe('اكشف', () => {
  const card = 'action:ekshef:1';

  function setup(): GameState {
    let state = placeAll(readyState([card]), ['money:5:1', 'joker:1'], { zone: 'hand', seat: 2 });
    return place(state, 'money:1:1', { zone: 'hand', seat: 3 });
  }

  it('يكشف يد لاعب واحد للاعب اللي لعبه فقط', () => {
    const state = must(play(setup(), { cardId: card, targetSeat: 2 }));

    const mine = viewFor(state, ME);
    expect(mine[2]?.hand?.map((c) => c.id)).toEqual(['money:5:1', 'joker:1']);
    expect(mine[3]?.hand).toBeNull();
    expect(mine[3]?.handCount).toBe(1);

    // لاعب ثاني ما يشوف اليد المكشوفة
    const other = viewFor(state, 1);
    expect(other[2]?.hand).toBeNull();
    expect(other[2]?.handCount).toBe(2);
    // المكشوف نفسه يشوف يده فقط
    expect(viewFor(state, 2)[ME]?.hand).toBeNull();
  });

  it('قبل الكرت كل لاعب يشوف يده فقط، والكشف ينتهي بنهاية الدور', () => {
    const before = setup();
    expect(viewFor(before, ME).map((p) => p.hand !== null)).toEqual([true, false, false, false]);

    let state = must(play(before, { cardId: card, targetSeat: 2 }));
    state = must(applyMove(state, { type: 'endTurn', seat: ME }));
    expect(state.revealed).toBeNull();
    expect(viewFor(state, ME)[2]?.hand).toBeNull();
  });

  it('ينرفض بدون هدف أو على نفسي', () => {
    expect(errorOf(play(setup(), { cardId: card }))).toBe('invalidTarget');
    expect(errorOf(play(setup(), { cardId: card, targetSeat: ME }))).toBe('invalidTarget');
  });
});

describe('حرق كرت الأكشن', () => {
  it('ينرمي بالنار بدون تنفيذ وينحسب من الـ3 كروت', () => {
    let state = place(readyState(['action:qarqash:1']), 'money:5:1', { zone: 'bank', seat: 1 });
    state = must(applyMove(state, { type: 'burnAction', seat: ME, cardId: 'action:qarqash:1' }));
    expect(state.firePile.map((c) => c.id)).toEqual(['action:qarqash:1']);
    expect(state.pending).toBeNull();
    expect(state.turn.playsUsed).toBe(1);
    expect(player(state, 1).bank).toHaveLength(1);
    expect132(state);
  });

  it('أي كرت أكشن ينحرق، حتى كروت الرد', () => {
    const state = must(applyMove(readyState(['action:malekAmal:1']), { type: 'burnAction', seat: ME, cardId: 'action:malekAmal:1' }));
    expect(player(state, ME).hand).toHaveLength(0);
  });

  it('ينرفض على كرت مو أكشن، أو إذا خلصت الـ3 كروت', () => {
    const state = readyState(['money:1:1', 'action:draw2:1']);
    expect(errorOf(applyMove(state, { type: 'burnAction', seat: ME, cardId: 'money:1:1' }))).toBe('wrongCardKind');
    expect(
      errorOf(applyMove(setTurn(state, { playsUsed: 3 }), { type: 'burnAction', seat: ME, cardId: 'action:draw2:1' })),
    ).toBe('noPlaysLeft');
  });
});

describe('مباريات عشوائية بكل كروت الأكشن الهجومية', () => {
  it('تمشي بدون خطأ، ومجموع الكروت يبقى 132 بعد أي حركة', () => {
    const seen = new Set<string>();
    for (let seed = 21; seed <= 32; seed++) {
      const rng = createRng(seed + 900);
      let state = createGame(seed, 6);
      for (let i = 0; i < 5000 && state.winner === null; i++) {
        const moves = legalMoves(state);
        expect(moves.length).toBeGreaterThan(0);
        const move = moves[randomInt(rng, moves.length)] as Move;
        if (move.type === 'playAction') {
          const played = state.players[move.seat]?.hand.find((c) => c.id === move.cardId);
          if (played?.kind === 'action') seen.add(played.action);
        }
        state = must(applyMove(state, move));
        expect(new Set(allCards(state).map((card) => card.id)).size).toBe(132);
      }
      expect132(state);
    }
    // كل كرت أكشن هجومي انلعب مرة على الأقل بالمباريات العشوائية
    expect([...seen].sort()).toEqual(
      [
        'baddel',
        'boog',
        'boogDouble',
        'boogJoker',
        'draw2',
        'ekshef',
        'endebes',
        'estareeh',
        'etHas',
        'extraPlay',
        'eyadi',
        'ezalah',
        'mukhalafah',
        'qarqash',
        'qardIskan',
        'rahatAlek',
        'tathmeen',
        'werathtek',
      ].sort(),
    );
  });
});
