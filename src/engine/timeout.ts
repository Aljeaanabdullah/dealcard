// انتهاء وقت الدور — المصدر: prd.md القسم 5.2
// "إذا انتهى الوقت ينتهي الدور تلقائياً (ويُرمى الزايد عشوائياً)".

import { MAX_HAND_SIZE } from '../data/rules';
import { applyMove } from './moves';
import { randomInt, type Rng } from './rng';
import type { GameState } from './state';

/**
 * ينهي دور اللاعب تلقائياً: يسحب إذا ما سحب، يرمي الزايد عن 7 عشوائياً، ثم ينهي الدور.
 * يرجّع الحالة مثل ما هي إذا مو دوره، أو فيه رد أو دفع معلّق لازم يخلص أول.
 */
export function forceEndTurn(state: GameState, seat: number, rng: Rng): GameState {
  if (state.winner !== null || state.turn.seat !== seat) return state;
  if (state.response !== null || state.pending !== null) return state;

  let next = state;
  if (!next.turn.hasDrawn) {
    const drawn = applyMove(next, { type: 'draw', seat });
    if (!drawn.ok) return state;
    next = drawn.state;
  }

  for (;;) {
    const hand = next.players[seat]?.hand ?? [];
    if (hand.length <= MAX_HAND_SIZE) break;
    const card = hand[randomInt(rng, hand.length)];
    if (!card) break;
    const discarded = applyMove(next, { type: 'discard', seat, cardId: card.id });
    if (!discarded.ok) return state;
    next = discarded.state;
  }

  const ended = applyMove(next, { type: 'endTurn', seat });
  return ended.ok ? ended.state : state;
}
