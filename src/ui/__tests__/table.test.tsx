// اختبارات ملاحظات صاحب المشروع على الطاولة:
// ألوان كرت الإيجار، انتقال الدور تلقائياً، وسهم على اللاعب المستهدف.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { buildDeck, type Card } from '../../data/cards';
import { legalMoves, type Move } from '../../engine/moves';
import type { GameState } from '../../engine/state';
import { maskStateFor } from '../../net/mask';
import { place, readyState, setTurn } from '../../testing/helpers';
import { cardInfo, LOCAL_NAMING, moveTargets } from '../describe';
import { TableScreen } from '../TableScreen';
import { SET_COLORS } from '../theme';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function card(id: string): Card {
  const found = buildDeck().find((c) => c.id === id);
  if (!found) throw new Error(`كرت غير موجود: ${id}`);
  return found;
}

function render(game: GameState, lastMove: Move | null, onMove: (move: Move) => void): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <TableScreen
        game={maskStateFor(game, 0)}
        moves={legalMoves(game).filter((move) => move.seat === 0)}
        naming={LOCAL_NAMING}
        secondsLeft={60}
        event=""
        lastMove={lastMove}
        onMove={onMove}
        onPlayAgain={() => undefined}
      />,
    );
  });
  if (!renderer) throw new Error('الطاولة ما انعرضت');
  return renderer;
}

function targetedSeats(renderer: ReactTestRenderer): string[] {
  const ids = renderer.root
    .findAll((node) => typeof node.type === 'string' && typeof node.props.testID === 'string')
    .map((node) => node.props.testID as string)
    .filter((id) => id.startsWith('targeted-'));
  return [...new Set(ids)].sort();
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ألوان كرت الإيجار', () => {
  it('كرت إيجار بلونين: لون فوق ولون تحت', () => {
    const info = cardInfo(card('rent:rentYellowRed:1'));
    expect(info.band).toBe(SET_COLORS.yellow);
    expect(info.bandBottom).toBe(SET_COLORS.red);

    const second = cardInfo(card('rent:rentDarkBlueGreen:1'));
    expect(second.band).toBe(SET_COLORS.darkBlue);
    expect(second.bandBottom).toBe(SET_COLORS.green);
  });

  it('كرت إيجار شخص واحد (أي لون): شريط بكل ألوان الأطقم العشرة', () => {
    const info = cardInfo(card('rent:rentOne:1'));
    expect(info.stripes).toHaveLength(10);
    expect(info.stripes).toEqual(Object.values(SET_COLORS));
  });

  it('بقية الكروت بشريط واحد فوق', () => {
    const info = cardInfo(card('property:red:1'));
    expect(info.band).toBe(SET_COLORS.red);
    expect(info.bandBottom).toBeUndefined();
    expect(info.stripes).toBeUndefined();
  });
});

describe('انتقال الدور تلقائياً', () => {
  it('إذا لعبت كروتي الثلاثة الدور ينتقل للاعب التالي على طول', () => {
    const onMove = jest.fn();
    const game = setTurn(readyState(['money:1:1']), { playsUsed: 3 });
    const renderer = render(game, null, onMove);
    expect(onMove).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ type: 'endTurn', seat: 0 });
    act(() => renderer.unmount());
  });

  it('ما ينتقل إذا باقي لي كروت ألعبها', () => {
    const onMove = jest.fn();
    const game = setTurn(readyState(['money:1:1']), { playsUsed: 2 });
    const renderer = render(game, null, onMove);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onMove).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('ما ينتقل إذا يدي فوق 7: لازم أرمي الزايد أول', () => {
    const onMove = jest.fn();
    const hand = ['money:1:1', 'money:1:2', 'money:1:3', 'money:1:4', 'money:1:5', 'money:1:6', 'money:1:7', 'money:1:8'];
    const game = setTurn(readyState(hand), { playsUsed: 3 });
    const renderer = render(game, null, onMove);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onMove).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('بعد ما أخلص رمي الزايد ينتقل الدور', () => {
    const onMove = jest.fn();
    const game = setTurn(readyState(['money:1:1']), { playsUsed: 1, discarding: true });
    const renderer = render(game, null, onMove);
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(onMove).toHaveBeenCalledWith({ type: 'endTurn', seat: 0 });
    act(() => renderer.unmount());
  });

  it('ما ينتقل بدور لاعب ثاني', () => {
    const onMove = jest.fn();
    const game = setTurn(readyState([]), { seat: 2, playsUsed: 3 });
    const renderer = render(game, null, onMove);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onMove).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});

describe('سهم على اللاعب المستهدف', () => {
  it('المقاعد المستهدفة حسب نوع الكرت', () => {
    expect(moveTargets(null)).toEqual([]);
    expect(moveTargets({ type: 'draw', seat: 1 })).toEqual([]);
    expect(moveTargets({ type: 'playAction', seat: 1, cardId: 'action:qarqash:1', targetSeat: 3 })).toEqual([3]);
    // العيادي وإيجار الجميع على كل اللاعبين
    expect(moveTargets({ type: 'playAction', seat: 1, cardId: 'action:eyadi:1' })).toEqual([0, 2, 3]);
    expect(moveTargets({ type: 'playRent', seat: 2, cardId: 'rent:rentYellowRed:1', color: 'red' })).toEqual([0, 1, 3]);
    expect(moveTargets({ type: 'playRent', seat: 2, cardId: 'rent:rentOne:1', color: 'red', targetSeat: 0 })).toEqual([0]);
    // مخالفه على لاعبين
    expect(
      moveTargets({
        type: 'playAction',
        seat: 0,
        cardId: 'action:mukhalafah:1',
        burns: [
          { seat: 1, handIndex: 0 },
          { seat: 3, handIndex: 1 },
        ],
      }),
    ).toEqual([1, 3]);
    // كرت بدون مستهدف
    expect(moveTargets({ type: 'playAction', seat: 0, cardId: 'action:draw2:1' })).toEqual([]);
  });

  it('السهم يطلع على اللاعب اللي انلعب ضده الأكشن فقط', () => {
    const game = setTurn(place(readyState([]), 'money:5:1', { zone: 'bank', seat: 0 }), { seat: 1 });
    const renderer = render(game, { type: 'playAction', seat: 1, cardId: 'action:qarqash:1', targetSeat: 3 }, () => undefined);
    expect(targetedSeats(renderer)).toEqual(['targeted-3']);
    act(() => renderer.unmount());
  });

  it('السهم يطلع علي إذا انلعب الأكشن ضدي، وعلى الكل بالعيادي', () => {
    const game = setTurn(readyState([]), { seat: 1 });
    const onMe = render(game, { type: 'playAction', seat: 1, cardId: 'action:boog:1', targetSeat: 0 }, () => undefined);
    expect(targetedSeats(onMe)).toEqual(['targeted-0']);
    act(() => onMe.unmount());

    const onAll = render(game, { type: 'playAction', seat: 1, cardId: 'action:eyadi:1' }, () => undefined);
    expect(targetedSeats(onAll)).toEqual(['targeted-0', 'targeted-2', 'targeted-3']);
    act(() => onAll.unmount());
  });

  it('ما فيه سهم إذا آخر حركة ما لها مستهدف', () => {
    const renderer = render(setTurn(readyState([]), { seat: 1 }), { type: 'draw', seat: 1 }, () => undefined);
    expect(targetedSeats(renderer)).toEqual([]);
    act(() => renderer.unmount());
  });
});
