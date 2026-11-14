// البوت — plan.md المرحلة 6، و prd.md القسم 9
// يستخدم نفس المحرك ويختار من الحركات القانونية فقط.
// ما يشوف إلا يده والمعلومات المكشوفة على الطاولة (بنوك وعقارات وعدد كروت الباقين).

import type { ActionId } from '../data/cards';
import { legalMoves, type Move, type PlayActionMove, type RespondMove } from '../engine/moves';
import { cardValue, rentFor, totalPayable } from '../engine/payment';
import { randomInt, type Rng } from '../engine/rng';
import { completeColors, isSetComplete } from '../engine/sets';
import type { Effect, GameState, PlayerState, ResponseKind } from '../engine/state';

function getPlayer(state: GameState, seat: number): PlayerState {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return player;
}

function setsOf(state: GameState, seat: number): number {
  return completeColors(getPlayer(state, seat).properties).length;
}

/** هجمة كبيرة تستاهل كرت رد: أخذ طقم كامل أو كسره، سرقة عقارين، أو دفع عالي. */
function isBigAttack(state: GameState, effect: Effect): boolean {
  switch (effect.action) {
    case 'rahatAlek':
    case 'endebes':
    case 'ezalah':
    case 'boogDouble':
      return true;
    case 'etHas':
      return getPlayer(state, effect.target).hand.length >= 5;
    default:
      return effect.amount >= 5;
  }
}

/** تقييم لعب كرت أكشن بالدور. سالب = لا تلعبه. */
function scoreAction(state: GameState, seat: number, move: PlayActionMove, action: ActionId): number {
  const me = getPlayer(state, seat);
  const target = move.targetSeat === undefined ? undefined : getPlayer(state, move.targetSeat);
  // الأفضلية للاعب المتصدر (أكثر أطقم كاملة).
  const leaderBonus = target ? setsOf(state, target.seat) * 0.5 : 0;

  switch (action) {
    case 'rahatAlek':
      return 95 + leaderBonus;
    case 'extraPlay':
      return 86;
    case 'draw2':
      return 85;
    case 'boogDouble':
      return 78 + leaderBonus;
    case 'ezalah':
      return 75 + leaderBonus;
    case 'boog': {
      const stolen = target?.properties.find((p) => p.card.id === move.targetCardIds?.[0]);
      const helpsMe = stolen ? me.properties.some((p) => p.color === stolen.color) : false;
      return 72 + (helpsMe ? 3 : 0) + leaderBonus;
    }
    case 'boogJoker': {
      const color = move.color;
      if (!color) return -1;
      const hasReal = me.properties.some((p) => p.color === color && p.card.kind === 'property');
      return hasReal && !isSetComplete(me.properties, color) ? 65 : -1;
    }
    case 'qardIskan':
    case 'qarqash':
    case 'tathmeen': {
      if (!target || totalPayable(target) <= 0) return -1;
      const base = action === 'qardIskan' ? 57 : action === 'qarqash' ? 55 : 58;
      return base + Math.min(totalPayable(target), 10) / 10 + leaderBonus;
    }
    case 'eyadi':
      return 54;
    case 'hasanah':
      return setsOf(state, seat) >= 2 ? 45 : 15;
    case 'etHas':
      return target && me.hand.length <= 2 && target.hand.length >= 5 ? 40 : -1;
    case 'werathtek':
      return 35 + leaderBonus;
    case 'mukhalafah':
      return 33;
    case 'estareeh':
      return target && setsOf(state, target.seat) >= 2 ? 30 : 10;
    case 'baddel': {
      // يبدل إذا التبديل يكمل له طقم.
      const theirs = target?.properties.find((p) => p.card.id === move.targetCardIds?.[0]);
      if (!theirs) return -1;
      const after = [...me.properties.filter((p) => p.card.id !== move.ownCardId), theirs];
      return completeColors(after).length > completeColors(me.properties).length ? 60 : -1;
    }
    default:
      // اندبس، اكشف: البوت البسيط ما يلعبهم.
      return -1;
  }
}

/** كروت الرد تنحفظ باليد وما تنحرق. */
const DEFENSE_ACTIONS: readonly ActionId[] = [
  'malekAmal',
  'hayyour',
  'fazaah',
  'maTshoofShar',
  'edfaaliEjari',
  'tebWetkhayyar',
  'hasanah',
];

/** "طب وتخير" بالدور ينلعب للهجمات الكبيرة فقط، وغير كذا ينحفظ للرد. */
const TEB_TURN_ACTIONS: readonly ActionId[] = ['rahatAlek', 'ezalah', 'boogDouble'];

/** تقييم حركة بالدور. الأعلى أفضل، و0 = إنهاء الدور. */
function scoreTurnMove(state: GameState, seat: number, move: Move): number {
  const me = getPlayer(state, seat);

  switch (move.type) {
    case 'draw':
      return 1000;
    case 'playProperty':
      return 100;
    case 'playJoker': {
      const hasReal = me.properties.some((p) => p.color === move.color && p.card.kind === 'property');
      return hasReal && !isSetComplete(me.properties, move.color) ? 90 : -1;
    }
    case 'moveJoker': {
      const moved = me.properties.map((p) => (p.card.id === move.cardId ? { card: p.card, color: move.color } : p));
      return completeColors(moved).length > completeColors(me.properties).length ? 85 : -1;
    }
    case 'playBuilding':
      // على طقم كامل أفضل. جنب البنك أحسن من بقائه باليد (يصير ينحط على طقم بعدين، ويندفع فيه).
      return move.color !== undefined ? 80 : 3;
    case 'placeBuilding': {
      // ينقل المبنى اللي بدون طقم فقط؛ ما يلف المباني بين الأطقم.
      const placed = me.buildings.find((b) => b.card.id === move.cardId);
      return placed && placed.color === null ? 70 : -1;
    }
    case 'bankMoney': {
      const card = me.hand.find((c) => c.id === move.cardId);
      return 60 + (card ? cardValue(card) / 100 : 0);
    }
    case 'playRent': {
      const rent = rentFor(me, move.color);
      // الدوبل ينحفظ للإيجار العالي.
      if (move.doubleCardId !== undefined && rent < 3) return -1;
      const amount = move.doubleCardId !== undefined ? rent * 2 : rent;
      const target = move.targetSeat === undefined ? undefined : getPlayer(state, move.targetSeat);
      if (target && totalPayable(target) <= 0) return -1;
      return 50 + amount + (target ? Math.min(totalPayable(target), 10) / 100 : 0.5);
    }
    case 'playAction': {
      const card = me.hand.find((c) => c.id === move.cardId);
      if (!card || card.kind !== 'action') return -1;
      const action = card.action === 'tebWetkhayyar' ? move.asAction : card.action;
      if (!action) return -1;
      if (card.action === 'tebWetkhayyar') {
        // أقل بشوي عشان الكرت الأصلي ينلعب قبله.
        return TEB_TURN_ACTIONS.includes(action) ? scoreAction(state, seat, move, action) - 0.25 : -1;
      }
      return scoreAction(state, seat, move, action);
    }
    case 'burnAction':
      return -5;
    case 'endTurn':
      return 0;
    default:
      return -1;
  }
}

/** تقييم حركة رد. 0 = "ما أرد". */
function scoreResponse(state: GameState, seat: number, move: RespondMove): number {
  const window = state.response;
  if (!window || move.cardId === undefined) return 0;

  const { effect } = window;
  if (!isBigAttack(state, effect)) return -1;

  const card = getPlayer(state, seat).hand.find((c) => c.id === move.cardId);
  if (!card || card.kind !== 'action') return -1;
  const viaTeb = card.action === 'tebWetkhayyar';
  const kind: ResponseKind | undefined = viaTeb ? move.as : (card.action as ResponseKind);
  const tebPenalty = viaTeb ? 2 : 0;

  // صاحب الأكشن يرد على الرد عشان هجمته الكبيرة تمشي.
  if (window.awaiting === 'actor') return 40 - tebPenalty;

  switch (kind) {
    case 'maTshoofShar':
      return 50 - tebPenalty;
    case 'edfaaliEjari': {
      const payer = move.payerSeat === undefined ? undefined : getPlayer(state, move.payerSeat);
      return 48 + (payer ? Math.min(totalPayable(payer), 10) / 100 : 0) - tebPenalty;
    }
    case 'hayyour':
      return 46 + (move.bounce ? 1 : 0) - tebPenalty;
    case 'malekAmal':
      return 44 - tebPenalty;
    case 'fazaah': {
      // يفزع إذا صاحب الأكشن قريب من الفوز وياخذ طقم كامل.
      const actorNearWin = setsOf(state, effect.actor) >= state.winTarget - 2;
      return actorNearWin && (effect.action === 'rahatAlek' || effect.action === 'endebes') ? 40 - tebPenalty : -1;
    }
    default:
      return -1;
  }
}

function scoreMove(state: GameState, seat: number, move: Move): number {
  if (move.type === 'respond') return scoreResponse(state, seat, move);
  if (move.type === 'pay') return 1;
  return scoreTurnMove(state, seat, move);
}

/**
 * الكروت "الميتة" بيد البوت: ما لها ولا لعبة مفيدة الحين (مثل إيجار لون ما يملكه).
 * تنحسب كأن الدور بأوله، عشان ما تتأثر بعدد الكروت الملعوبة.
 */
function deadCardIds(state: GameState, seat: number): Set<string> {
  const fresh: GameState = { ...state, turn: { ...state.turn, playsUsed: 0 } };
  const live = new Set<string>();
  for (const move of legalMoves(fresh)) {
    if (move.seat !== seat || !('cardId' in move) || move.cardId === undefined) continue;
    if (move.type === 'burnAction') continue;
    if (scoreTurnMove(fresh, seat, move) > 0) {
      live.add(move.cardId);
      if (move.type === 'playRent' && move.doubleCardId !== undefined) live.add(move.doubleCardId);
    }
  }

  const dead = new Set<string>();
  for (const card of getPlayer(state, seat).hand) {
    if (live.has(card.id)) continue;
    // كروت الرد مو ميتة: تنحفظ للدفاع.
    if (card.kind === 'action' && DEFENSE_ACTIONS.includes(card.action)) continue;
    // "دوبل ايجار" ينحفظ إذا باليد كرت إيجار.
    dead.add(card.id);
  }
  return dead;
}

/** البوت يحرق كرت الأكشن أو الإيجار الميت إذا ما عنده لعبة أفضل، عشان ما تتعطل يده. */
function adjustForDeadCards(state: GameState, seat: number, move: Move, score: number, dead: Set<string>): number {
  const me = getPlayer(state, seat);
  if (move.type === 'burnAction' && dead.has(move.cardId) && me.hand.length >= 5) return 1;
  return score;
}

/**
 * يختار حركة البوت للمقعد المحدد، أو null إذا ما عليه شي الحين.
 * التعادل ينحل بالعشوائية المبذورة.
 */
export function chooseMove(state: GameState, seat: number, rng: Rng): Move | null {
  const moves = legalMoves(state).filter((move) => move.seat === seat);
  if (moves.length === 0) return null;

  const isTurnPlay = state.response === null && state.pending === null && state.turn.hasDrawn;
  const dead = isTurnPlay ? deadCardIds(state, seat) : new Set<string>();

  let best: Move[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const move of moves) {
    const score = adjustForDeadCards(state, seat, move, scoreMove(state, seat, move), dead);
    if (score > bestScore) {
      best = [move];
      bestScore = score;
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[randomInt(rng, best.length)] ?? null;
}
