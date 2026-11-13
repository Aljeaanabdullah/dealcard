// نموذج حالة اللعبة وإنشاء لعبة جديدة — المرحلة 1
// المصدر: prd.md القسم 5.2 (التوزيع بالبداية) و plan.md المرحلة 1.

import { buildDeck, type Card } from '../data/cards';
import { PLAYER_COUNT, STARTING_HAND_SIZE } from '../data/rules';
import { createRng, shuffle } from './rng';

export interface PlayerState {
  /** رقم مقعد اللاعب: من 0 إلى 3 */
  readonly seat: number;
  readonly hand: readonly Card[];
  readonly bank: readonly Card[];
  readonly properties: readonly Card[];
  readonly buildings: readonly Card[];
}

export interface GameState {
  /** كومة السحب: آخر عنصر هو أعلى الكومة */
  readonly drawPile: readonly Card[];
  /** النار (كومة الرمي) */
  readonly firePile: readonly Card[];
  readonly players: readonly PlayerState[];
}

/** ينشئ لعبة جديدة: خلط ببذرة ثم توزيع 5 كروت لكل لاعب. */
export function createGame(seed: number): GameState {
  const pile = shuffle(buildDeck(), createRng(seed));

  const players: PlayerState[] = [];
  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    const hand = pile.splice(pile.length - STARTING_HAND_SIZE, STARTING_HAND_SIZE);
    players.push({ seat, hand, bank: [], properties: [], buildings: [] });
  }

  return { drawPile: pile, firePile: [], players };
}

/** كل كروت اللعبة أينما كانت — يُستخدم للتحقق أن ما ضاع كرت وما تكرر. */
export function allCards(state: GameState): Card[] {
  const cards: Card[] = [...state.drawPile, ...state.firePile];
  for (const player of state.players) {
    cards.push(...player.hand, ...player.bank, ...player.properties, ...player.buildings);
  }
  return cards;
}
