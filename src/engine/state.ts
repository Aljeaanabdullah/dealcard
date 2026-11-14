// نموذج حالة اللعبة وإنشاء لعبة جديدة
// المصدر: prd.md الأقسام 5.1 إلى 5.4، و plan.md المراحل 1 إلى 5.

import { buildDeck, type ActionId, type Card } from '../data/cards';
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

/** دفع معلّق لمستلم واحد: اللعب يوقف لين كل مديون يدفع. */
export interface PendingPayment {
  /** مقعد اللاعب المستلم */
  readonly to: number;
  readonly debts: readonly Debt[];
}

/** تفاصيل تأثير الكرت على مستهدف واحد. */
export interface EffectParams {
  /** عقارات (أو جيكر) عند المستهدف */
  readonly targetCardIds?: readonly string[];
  /** عقار من عند صاحب الكرت (بدل) */
  readonly ownCardId?: string;
  /** لون الطقم عند المستهدف، أو اللون اللي ينحط فيه الجيكر المسروق */
  readonly color?: ColorId;
  /** لون طقم صاحب الكرت (اندبس) */
  readonly ownColor?: ColorId;
  /** الكرت المختار من يد المستهدف بدون رؤية (ورثتك، مخالفه) */
  readonly pickedCardId?: string;
}

/** تأثير كرت أكشن أو إيجار على مستهدف واحد، ينتظر الرد قبل ما يتنفذ. */
export interface Effect {
  /** نوع الأكشن، أو 'rent' لكروت الإيجار */
  readonly action: ActionId | 'rent';
  /** طلب إيجار (كروت الإيجار وتثمين): ينرد عليه بـ"ماتشوف شر" و"ادفعلي ايجاري" */
  readonly isRent: boolean;
  /** مقعد اللاعب اللي لعب الكرت */
  readonly actor: number;
  /** مقعد اللاعب المستهدف */
  readonly target: number;
  /** المبلغ المطلوب (لكروت الدفع والإيجار) */
  readonly amount: number;
  readonly params: EffectParams;
}

export type ResponseKind = 'malekAmal' | 'hayyour' | 'fazaah' | 'maTshoofShar' | 'edfaaliEjari';

/** كرت رد انلعب وينتظر: هل صاحب الأكشن يرد عليه بـ"مالك امل"؟ */
export interface StandingResponse {
  readonly kind: ResponseKind;
  /** مقعد اللاعب اللي لعب كرت الرد */
  readonly by: number;
  /** لحيور: التأثير المعكوس على صاحب الأكشن، أو null إذا يلغي فقط */
  readonly bounce: Effect | null;
  /** لادفعلي ايجاري: اللاعب اللي يدفع بدل المستهدف */
  readonly payer: number | null;
}

/** نافذة رد على تأثير واحد. */
export interface ResponseWindow {
  readonly effect: Effect;
  readonly standing: StandingResponse | null;
  /** 'defense' = ننتظر المستهدف (والباقين للفزعه)، 'actor' = ننتظر صاحب الأكشن */
  readonly awaiting: 'defense' | 'actor';
  /** المدافعين اللي قالوا "ما أرد" بهذي الجولة */
  readonly passed: readonly number[];
}

export interface TurnState {
  /** مقعد اللاعب صاحب الدور */
  readonly seat: number;
  readonly hasDrawn: boolean;
  /** عدد الكروت الملعوبة بهذا الدور */
  readonly playsUsed: number;
}

export interface GameState {
  /** كومة السحب: آخر عنصر هو أعلى الكومة */
  readonly drawPile: readonly Card[];
  /** النار (كومة الرمي) */
  readonly firePile: readonly Card[];
  readonly players: readonly PlayerState[];
  readonly turn: TurnState;
  /** نافذة الرد المفتوحة، أو null */
  readonly response: ResponseWindow | null;
  /** تأثيرات باقية تنتظر دورها (أكشن على عدة لاعبين: كل لاعب يرد لوحده) */
  readonly queue: readonly Effect[];
  /** دفع معلّق، أو null */
  readonly pending: PendingPayment | null;
  /** دفعات معلّقة لمستلمين ثانيين، تجي بعد الحالية */
  readonly pendingQueue: readonly PendingPayment[];
  /** لعبات إضافية بهذا الدور من "زايد لعبه" */
  readonly extraPlays: number;
  /** يد مكشوفة بـ"اكشف": تبان للاعب اللي كشفها فقط، لين ينتهي الدور */
  readonly revealed: { readonly viewer: number; readonly target: number } | null;
  /** مقاعد اللاعبين اللي دورهم القادم يتفوّت بـ"استريح". المقعد يتكرر إذا عليه أكثر من تفويت. */
  readonly skips: readonly number[];
  /** مقاعد اللاعبين المحميين بـ"حصانه" لين يرجع دورهم */
  readonly immune: readonly number[];
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
    turn: { seat: startSeat, hasDrawn: false, playsUsed: 0 },
    response: null,
    queue: [],
    pending: null,
    pendingQueue: [],
    extraPlays: 0,
    revealed: null,
    skips: [],
    immune: [],
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
