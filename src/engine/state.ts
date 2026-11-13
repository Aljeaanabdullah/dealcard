// نموذج حالة اللعبة وإنشاء لعبة جديدة
// المصدر: prd.md القسمين 5.1 و 5.2، و plan.md المرحلتين 1 و 2.

import { buildDeck, type Card } from '../data/cards';
import type { ColorId } from '../data/colors';
import { PLAYER_COUNT, STARTING_HAND_SIZE, type WinTarget } from '../data/rules';
import { createRng, nextSeed, randomInt, shuffle } from './rng';

/** عقار (أو جيكر) محطوط على الطاولة مع لون الطقم اللي هو فيه. */
export interface PlacedProperty {
  readonly card: Card;
  readonly color: ColorId;
}

/** مبنى على الطاولة. اللون = الطقم الكامل اللي عليه، أو null إذا بدون طقم (بدون تأثير). */
export interface PlacedBuilding {
  readonly card: Card;
  readonly color: ColorId | null;
}

export interface PlayerState {
  /** رقم مقعد اللاعب: من 0 إلى 3 */
  readonly seat: number;
  readonly hand: readonly Card[];
  readonly bank: readonly Card[];
  readonly properties: readonly PlacedProperty[];
  readonly buildings: readonly PlacedBuilding[];
}

export interface Debt {
  /** مقعد اللاعب اللي عليه الدفع */
  readonly from: number;
  readonly amount: number;
}

/** دفع معلّق: اللعب يوقف لين كل مديون يدفع. */
export interface PendingPayment {
  /** مقعد اللاعب المستلم */
  readonly to: number;
  readonly debts: readonly Debt[];
}

export interface TurnState {
  /** مقعد اللاعب صاحب الدور */
  readonly seat: number;
  readonly hasDrawn: boolean;
  /** عدد الكروت الملعوبة بهذا الدور */
  readonly playsUsed: number;
  /** بدأ يرمي الزايد: ما يقدر يلعب كروت بعدها */
  readonly discarding: boolean;
}

export interface GameState {
  /** كومة السحب: آخر عنصر هو أعلى الكومة */
  readonly drawPile: readonly Card[];
  /** النار (كومة الرمي) */
  readonly firePile: readonly Card[];
  readonly players: readonly PlayerState[];
  readonly turn: TurnState;
  /** دفع معلّق، أو null */
  readonly pending: PendingPayment | null;
  /** عدد الأطقم الكاملة المختلفة المطلوبة للفوز */
  readonly winTarget: WinTarget;
  /** مقعد الفائز، أو null إذا اللعبة مستمرة */
  readonly winner: number | null;
  /** بذرة العشوائية القادمة (لإعادة خلط النار) */
  readonly seed: number;
}

/** ينشئ لعبة جديدة: خلط ببذرة، توزيع 5 كروت لكل لاعب، واختيار عشوائي لمن يبدأ. */
export function createGame(seed: number, winTarget: WinTarget): GameState {
  const rng = createRng(seed);
  const pile = shuffle(buildDeck(), rng);

  const players: PlayerState[] = [];
  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    const hand = pile.splice(pile.length - STARTING_HAND_SIZE, STARTING_HAND_SIZE);
    players.push({ seat, hand, bank: [], properties: [], buildings: [] });
  }

  const startSeat = randomInt(rng, PLAYER_COUNT);

  return {
    drawPile: pile,
    firePile: [],
    players,
    turn: { seat: startSeat, hasDrawn: false, playsUsed: 0, discarding: false },
    pending: null,
    winTarget,
    winner: null,
    seed: nextSeed(rng),
  };
}

/** كل كروت اللعبة أينما كانت — يُستخدم للتحقق أن ما ضاع كرت وما تكرر. */
export function allCards(state: GameState): Card[] {
  const cards: Card[] = [...state.drawPile, ...state.firePile];
  for (const player of state.players) {
    cards.push(
      ...player.hand,
      ...player.bank,
      ...player.properties.map((p) => p.card),
      ...player.buildings.map((b) => b.card),
    );
  }
  return cards;
}
