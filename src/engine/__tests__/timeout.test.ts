// اختبارات انتهاء وقت الدور — prd.md 5.2
import { applyMove } from '../moves';
import { allCards, type GameState } from '../state';
import { forceEndTurn } from '../timeout';
import { must, place, readyState, setTurn } from '../../testing/helpers';

const ME = 0;

function handSize(state: GameState, seat = ME): number {
  return state.players[seat]?.hand.length ?? -1;
}

describe('انتهاء وقت الدور', () => {
  it('ينهي الدور تلقائياً وينتقل للاعب التالي', () => {
    const state = forceEndTurn(readyState(['money:1:1']), ME);
    expect(state.turn).toEqual({ seat: 1, hasDrawn: false, playsUsed: 0 });
    expect(handSize(state)).toBe(1);
  });

  it('إذا اللاعب ما سحب يسحب له أول ثم ينهي الدور', () => {
    const before = setTurn(readyState(['money:1:1']), { hasDrawn: false });
    const state = forceEndTurn(before, ME);
    expect(state.turn.seat).toBe(1);
    expect(handSize(state)).toBe(3);
  });

  it('الزايد عن 7 ينحرق عشوائياً في النار، ونفس الحالة تعطي نفس النتيجة', () => {
    const hand = ['money:1:1', 'money:1:2', 'money:1:3', 'money:1:4', 'money:1:5', 'money:1:6', 'money:1:7', 'money:1:8', 'money:2:1', 'money:2:2'];
    const before = readyState(hand);
    const state = forceEndTurn(before, ME);
    expect(handSize(state)).toBe(7);
    expect(state.firePile).toHaveLength(3);
    expect(state.turn.seat).toBe(1);
    expect(new Set(allCards(state).map((c) => c.id)).size).toBe(132);
    expect(forceEndTurn(before, ME)).toEqual(state);
  });

  it('ما يغيّر شي إذا مو دوره، أو فيه دفع أو رد معلّق', () => {
    const state = readyState(['action:qarqash:1']);
    expect(forceEndTurn(state, 2)).toBe(state);

    let pending = place(state, 'money:5:1', { zone: 'bank', seat: 1 });
    pending = must(applyMove(pending, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 }));
    expect(pending.pending).not.toBeNull();
    expect(forceEndTurn(pending, ME)).toBe(pending);
  });
});
