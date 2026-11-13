// اختبارات إنشاء لعبة جديدة — plan.md المرحلة 1
import { buildDeck } from '../../data/cards';
import { createRng, shuffle } from '../rng';
import { allCards, createGame } from '../state';

describe('إنشاء لعبة جديدة', () => {
  it('4 لاعبين، كل واحد بيده 5 كروت', () => {
    const game = createGame(1);
    expect(game.players).toHaveLength(4);
    for (const player of game.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.bank).toHaveLength(0);
      expect(player.properties).toHaveLength(0);
      expect(player.buildings).toHaveLength(0);
    }
  });

  it('الباقي بكومة السحب والنار فاضية', () => {
    const game = createGame(1);
    expect(game.drawPile).toHaveLength(132 - 4 * 5);
    expect(game.firePile).toHaveLength(0);
  });

  it('ما فيه كرت مكرر أو ناقص: 132 كرت فريد', () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      const ids = allCards(createGame(seed)).map((card) => card.id);
      expect(ids).toHaveLength(132);
      expect(ids.slice().sort()).toEqual(buildDeck().map((card) => card.id).sort());
    }
  });
});

describe('الخلط المبذور', () => {
  it('نفس البذرة تعطي نفس الخلط', () => {
    expect(createGame(42)).toEqual(createGame(42));
  });

  it('بذرة مختلفة تعطي خلط مختلف', () => {
    const a = createGame(1).drawPile.map((card) => card.id);
    const b = createGame(2).drawPile.map((card) => card.id);
    expect(a).not.toEqual(b);
  });

  it('الخلط يغيّر الترتيب وما يغيّر المصفوفة الأصلية', () => {
    const deck = buildDeck();
    const before = deck.map((card) => card.id);
    const shuffled = shuffle(deck, createRng(7)).map((card) => card.id);
    expect(deck.map((card) => card.id)).toEqual(before);
    expect(shuffled).not.toEqual(before);
    expect(shuffled.slice().sort()).toEqual(before.slice().sort());
  });
});
