// انتهاء وقت الدور — المصدر: prd.md القسم 5.2
// "إذا انتهى الوقت ينتهي الدور تلقائياً"، والزايد عن 7 ينحرق عشوائياً مثل أي نهاية دور.

import { applyMove } from './moves';
import type { GameState } from './state';

/**
 * ينهي دور اللاعب تلقائياً: يسحب إذا ما سحب، ثم ينهي الدور (والزايد عن 7 ينحرق عشوائياً).
 * يرجّع الحالة مثل ما هي إذا مو دوره، أو فيه رد أو دفع معلّق لازم يخلص أول.
 */
export function forceEndTurn(state: GameState, seat: number): GameState {
  if (state.winner !== null || state.turn.seat !== seat) return state;
  if (state.response !== null || state.pending !== null) return state;

  let next = state;
  if (!next.turn.hasDrawn) {
    const drawn = applyMove(next, { type: 'draw', seat });
    if (!drawn.ok) return state;
    next = drawn.state;
  }

  const ended = applyMove(next, { type: 'endTurn', seat });
  return ended.ok ? ended.state : state;
}
