// اختبارات الخروج: زر خروج داخل اللعب (مع تأكيد)، وشاشة الفوز فيها إعادة اللعب وخروج للبداية.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { legalMoves } from '../../engine/moves';
import type { GameState } from '../../engine/state';
import { maskStateFor } from '../../net/mask';
import { readyState } from '../../testing/helpers';
import { LOCAL_NAMING } from '../describe';
import { S } from '../strings';
import { TableScreen } from '../TableScreen';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

interface Handlers {
  readonly onExit: jest.Mock;
  readonly onPlayAgain?: jest.Mock;
}

function render(game: GameState, handlers: Handlers): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <TableScreen
        game={maskStateFor(game, 0)}
        moves={legalMoves(game).filter((move) => move.seat === 0)}
        naming={LOCAL_NAMING}
        secondsLeft={60}
        event=""
        lastAttack={null}
        onMove={() => undefined}
        onPlayAgain={handlers.onPlayAgain}
        onExit={handlers.onExit}
      />,
    );
  });
  if (!renderer) throw new Error('الطاولة ما انعرضت');
  return renderer;
}

function buttons(root: ReactTestInstance, testID: string): ReactTestInstance[] {
  return root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function');
}

function press(root: ReactTestInstance, testID: string): void {
  const button = buttons(root, testID)[0];
  if (!button) throw new Error(`ما فيه زر: ${testID}`);
  act(() => {
    button.props.onPress();
  });
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && node.children.includes(text)).length > 0;
}

describe('الخروج من داخل اللعب', () => {
  it('زر خروج يطلب تأكيد، و"كمّل اللعب" يرجّع للطاولة بدون خروج', () => {
    const onExit = jest.fn();
    const renderer = render(readyState(['money:1:1']), { onExit });
    const root = renderer.root;

    expect(hasText(root, S.exitConfirm)).toBe(false);
    press(root, 'table-exit');
    expect(hasText(root, S.exitConfirm)).toBe(true);
    expect(onExit).not.toHaveBeenCalled();

    press(root, 'exit-no');
    expect(hasText(root, S.exitConfirm)).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('تأكيد الخروج يطلّع اللاعب للبداية', () => {
    const onExit = jest.fn();
    const renderer = render(readyState(['money:1:1']), { onExit });
    press(renderer.root, 'table-exit');
    press(renderer.root, 'exit-yes');
    expect(onExit).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});

describe('شاشة الفوز', () => {
  const won: GameState = { ...readyState([]), winner: 0 };

  it('فيها إعادة اللعب وخروج للبداية، وكل زر يسوي شغله', () => {
    const onExit = jest.fn();
    const onPlayAgain = jest.fn();
    const renderer = render(won, { onExit, onPlayAgain });
    const root = renderer.root;

    expect(hasText(root, S.playAgain)).toBe(true);
    expect(hasText(root, S.exitHome)).toBe(true);

    press(root, 'replay');
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();

    press(root, 'exit-home');
    expect(onExit).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('بدون إعادة لعب (غرفة خاصة أونلاين): يبقى زر الخروج للبداية', () => {
    const onExit = jest.fn();
    const renderer = render(won, { onExit });
    expect(buttons(renderer.root, 'replay')).toHaveLength(0);
    press(renderer.root, 'exit-home');
    expect(onExit).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
