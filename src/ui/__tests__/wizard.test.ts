// اختبارات خطوات اختيار الحركة (ملاحظات صاحب المشروع على نوافذ اللعب)
import { legalMoves, type Move } from '../../engine/moves';
import type { GameState } from '../../engine/state';
import { giveFullSet, place, placeAll, readyState } from '../../testing/helpers';
import { LOCAL_NAMING } from '../describe';
import { S } from '../strings';
import { SET_COLORS } from '../theme';
import { applyPicks, cardMoves, nextStep, type Pick, type Step } from '../wizard';

const ME = 0;

function movesFor(game: GameState, cardId: string): Move[] {
  return legalMoves(game).filter((move) => move.seat === ME && 'cardId' in move && move.cardId === cardId);
}

function step(moves: readonly Move[], picks: readonly Pick[], game: GameState): Step | null {
  return nextStep(moves, picks, game, LOCAL_NAMING);
}

function labels(found: Step | null): string[] {
  return (found?.options ?? []).map((option) => option.label);
}

describe('أول خطوة: وش تسوي بالكرت', () => {
  it('كرت "اسحب 2": الخيار مكتوب "العبه" مو خانة فاضية', () => {
    const game = readyState(['action:draw2:1']);
    const first = step(movesFor(game, 'action:draw2:1'), [], game);
    expect(first?.id).toBe('type');
    expect(labels(first)).toEqual([S.playIt, S.burn]);
    expect(labels(first).every((label) => label.trim().length > 0)).toBe(true);
  });

  it('كل كروت الأكشن اللي ما لها هدف مكتوب عليها "العبه"', () => {
    for (const cardId of ['action:extraPlay:1', 'action:hasanah:1', 'action:eyadi:1']) {
      const game = place(readyState([cardId]), 'money:5:1', { zone: 'bank', seat: 1 });
      expect(labels(step(movesFor(game, cardId), [], game))).toContain(S.playIt);
    }
  });

  it('كرت بخيار واحد يعرضه مكتوب (ما يتنفذ بدون ما يبان)', () => {
    const game = readyState(['money:5:1']);
    expect(labels(step(movesFor(game, 'money:5:1'), [], game))).toEqual([S.bankMoney]);
  });

  it('كرت الإيجار اللي ما له لون عندي: ينحرق بالنار', () => {
    const game = readyState(['rent:rentYellowRed:1']);
    expect(labels(step(movesFor(game, 'rent:rentYellowRed:1'), [], game))).toEqual([S.burn]);
  });
});

describe('الحرق بالنار خيار واحد', () => {
  const eight = ['action:qarqash:1', 'money:1:1', 'money:1:2', 'money:1:3', 'money:1:4', 'money:1:5', 'money:1:6', 'money:1:7'];

  it('يدي فوق 7 وباقي لي كروت ألعبها: كرت الأكشن له "العبه" و"احرقه بالنار" مرة وحدة بس', () => {
    const game = place(readyState(eight), 'money:5:1', { zone: 'bank', seat: 1 });
    const mine = legalMoves(game).filter((move) => move.seat === ME);
    const shown = labels(step(cardMoves(mine, 'action:qarqash:1'), [], game));
    expect(shown).toEqual([S.playIt, S.burn]);
  });

  it('خلصت كروت دوري ويدي فوق 7: ما فيه رمي باليد، الزايد ينحرق عشوائياً بنهاية الدور', () => {
    const base = readyState(eight);
    const game = { ...base, turn: { ...base.turn, playsUsed: 3 } };
    const mine = legalMoves(game).filter((move) => move.seat === ME);
    expect(cardMoves(mine, 'action:qarqash:1')).toEqual([]);
    expect(cardMoves(mine, 'money:1:1')).toEqual([]);
    expect(mine).toEqual([{ type: 'endTurn', seat: ME }]);
  });
});

describe('المباني', () => {
  it('بدون طقم كامل: المبنى ينلعب جنب البنك', () => {
    const game = readyState(['building:plot:1']);
    const moves = movesFor(game, 'building:plot:1');
    expect(moves).toEqual([{ type: 'playBuilding', seat: ME, cardId: 'building:plot:1' }]);
    expect(labels(step(moves, [], game))).toEqual([S.playIt]);
  });

  it('مع أطقم كاملة: أختار الطقم بلونه، أو جنب البنك', () => {
    const game = giveFullSet(giveFullSet(readyState(['building:plot:1']), ME, 'brown'), ME, 'darkBlue');
    const moves = movesFor(game, 'building:plot:1');
    const colors = step(moves, [{ step: 'type', value: 'playBuilding' }], game);
    expect(colors?.id).toBe('color');
    expect(colors?.kind).toBe('tiles');
    expect(colors?.options.map((o) => [o.label, o.color])).toEqual([
      [S.buildLoose, undefined],
      ['بني', SET_COLORS.brown],
      ['أزرق غامق', SET_COLORS.darkBlue],
    ]);
  });
});

describe('اختيار اللاعب ثم العقار بلونه', () => {
  function boogGame(): GameState {
    let game = readyState(['action:boog:1']);
    game = placeAll(game, ['property:red:1', 'property:green:1'], { zone: 'properties', seat: 1, color: 'red' });
    game = place(game, 'property:green:1', { zone: 'properties', seat: 1, color: 'green' });
    game = place(game, 'property:yellow:1', { zone: 'properties', seat: 3, color: 'yellow' });
    game = place(game, 'money:5:1', { zone: 'bank', seat: 1 });
    return game;
  }

  it('بوق لاتخاف: أول اللاعبين كخانات فيها الاسم والبنك وعدد العقارات', () => {
    const game = boogGame();
    const moves = movesFor(game, 'action:boog:1');
    const players = step(moves, [{ step: 'type', value: 'playAction' }], game);
    expect(players?.id).toBe('target');
    expect(players?.kind).toBe('players');
    expect(players?.options.map((o) => [o.label, o.detail])).toEqual([
      [S.bot(1), S.playerInfo(5, 2)],
      [S.bot(3), S.playerInfo(0, 1)],
    ]);
  });

  it('بعدها عقارات اللاعب كمربعات بلون الطقم', () => {
    const game = boogGame();
    const moves = movesFor(game, 'action:boog:1');
    const picks: Pick[] = [
      { step: 'type', value: 'playAction' },
      { step: 'target', value: '1' },
    ];
    const tiles = step(moves, picks, game);
    expect(tiles?.id).toBe('cards');
    expect(tiles?.kind).toBe('tiles');
    expect(tiles?.options.map((o) => o.color)).toEqual([SET_COLORS.red, SET_COLORS.green]);

    const done: Pick[] = [...picks, { step: 'cards', value: 'property:green:1' }];
    expect(step(moves, done, game)).toBeNull();
    expect(applyPicks(moves, done)).toEqual([
      { type: 'playAction', seat: ME, cardId: 'action:boog:1', targetSeat: 1, targetCardIds: ['property:green:1'] },
    ]);
  });

  it('بدل: أختار اللي آخذه بلونه ثم اللي أعطيه بلونه، بدل قائمة طويلة', () => {
    let game = readyState(['action:baddel:1']);
    game = place(game, 'property:red:1', { zone: 'properties', seat: 1, color: 'red' });
    game = place(game, 'property:green:1', { zone: 'properties', seat: ME, color: 'green' });
    game = place(game, 'property:yellow:1', { zone: 'properties', seat: ME, color: 'yellow' });
    const moves = movesFor(game, 'action:baddel:1');
    // لاعب واحد وعقار واحد عنده: الخطوة التالية مباشرة عقاري اللي أعطيه
    const own = step(moves, [{ step: 'type', value: 'playAction' }], game);
    expect(own?.id).toBe('own');
    expect(own?.options.map((o) => o.color)).toEqual([SET_COLORS.green, SET_COLORS.yellow]);
  });

  it('بوق لاتخاف دبل: أختار عقارين واحد ورا الثاني بأي ترتيب', () => {
    let game = readyState(['action:boogDouble:1']);
    for (const [cardId, color] of [
      ['property:red:1', 'red'],
      ['property:green:1', 'green'],
      ['property:yellow:1', 'yellow'],
    ] as const) {
      game = place(game, cardId, { zone: 'properties', seat: 2, color });
    }
    const moves = movesFor(game, 'action:boogDouble:1');
    const first = step(moves, [{ step: 'type', value: 'playAction' }], game);
    expect(first?.options).toHaveLength(3);
    // أختار الأصفر أول (آخر واحد بالقائمة) ثم يبقى اثنين
    const picks: Pick[] = [
      { step: 'type', value: 'playAction' },
      { step: 'cards', value: 'property:yellow:1' },
    ];
    const second = step(moves, picks, game);
    expect(second?.options.map((o) => o.color)).toEqual([SET_COLORS.red, SET_COLORS.green]);
    const final = applyPicks(moves, [...picks, { step: 'cards', value: 'property:red:1' }]);
    expect(final).toHaveLength(1);
  });

  it('كرت الإيجار: أختار اللون ثم اللاعب', () => {
    let game = giveFullSet(readyState(['rent:rentOne:1']), ME, 'brown');
    game = place(game, 'property:red:1', { zone: 'properties', seat: ME, color: 'red' });
    const moves = movesFor(game, 'rent:rentOne:1');
    const colors = step(moves, [{ step: 'type', value: 'playRent' }], game);
    expect(colors?.id).toBe('color');
    expect(colors?.options.map((o) => o.color)).toEqual([SET_COLORS.brown, SET_COLORS.red]);
    const players = step(
      moves,
      [
        { step: 'type', value: 'playRent' },
        { step: 'color', value: 'brown' },
      ],
      game,
    );
    expect(players?.kind).toBe('players');
    expect(players?.options).toHaveLength(3);
  });
});

describe('نافذة الرد', () => {
  it('كروت الرد أزرار ذهبية مع شرح تأثيرها، ومعها "ما أرد"', () => {
    let game = readyState(['action:qarqash:1']);
    game = place(game, 'money:5:1', { zone: 'bank', seat: 1 });
    game = placeAll(game, ['action:malekAmal:1', 'action:hayyour:1'], { zone: 'hand', seat: 1 });
    const naming = { mySeat: 1, names: ['', '', '', ''] };
    const { applyMove } = jest.requireActual<typeof import('../../engine/moves')>('../../engine/moves');
    const played = applyMove(game, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 });
    if (!played.ok) throw new Error(played.error);

    const moves = legalMoves(played.state).filter((move) => move.seat === 1);
    const first = nextStep(moves, [], played.state, naming);
    expect(first?.options.map((o) => [o.label, o.detail ?? '', o.gold ?? false])).toEqual([
      [S.noResponse, '', false],
      [S.respondWith('مالك امل'), S.effect.malekAmal, true],
      [S.respondWith('حيور'), S.effect.hayyour, true],
    ]);
  });
});
