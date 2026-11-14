// اختبارات ملاحظات صاحب المشروع على الطاولة:
// ألوان كرت الإيجار، انتقال الدور تلقائياً، وسهم على اللاعب المستهدف.
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { buildDeck, type Card } from '../../data/cards';
import { legalMoves, type Move } from '../../engine/moves';
import type { GameState } from '../../engine/state';
import { maskStateFor } from '../../net/mask';
import { giveFullSet, place, readyState, setTurn } from '../../testing/helpers';
import { cardInfo, LOCAL_NAMING, moveTargets } from '../describe';
import { TableScreen } from '../TableScreen';
import { S } from '../strings';
import { CardView } from '../CardView';
import { SET_COLORS, theme } from '../theme';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function card(id: string): Card {
  const found = buildDeck().find((c) => c.id === id);
  if (!found) throw new Error(`كرت غير موجود: ${id}`);
  return found;
}

function render(game: GameState, lastAttack: Move | null, onMove: (move: Move) => void): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      <TableScreen
        game={maskStateFor(game, 0)}
        moves={legalMoves(game).filter((move) => move.seat === 0)}
        naming={LOCAL_NAMING}
        secondsLeft={60}
        event=""
        lastAttack={lastAttack}
        onMove={onMove}
        onPlayAgain={() => undefined}
        onExit={() => undefined}
      />,
    );
  });
  if (!renderer) throw new Error('الطاولة ما انعرضت');
  return renderer;
}

/** معرّفات العناصر المعروضة اللي تبدأ ببادئة معيّنة. */
function ids(renderer: ReactTestRenderer, prefix: string, keepDuplicates = false): string[] {
  const found = renderer.root
    .findAll((node) => typeof node.type === 'string' && typeof node.props.testID === 'string')
    .map((node) => node.props.testID as string)
    .filter((id) => id.startsWith(prefix));
  return keepDuplicates ? found : [...new Set(found)].sort();
}

/** كل النصوص المعروضة. */
function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll((node) => typeof node.type === 'string')
    .map((node) => node.children.filter((child): child is string => typeof child === 'string').join(''))
    .filter((text) => text.length > 0);
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
    expect(info.fill).toBeUndefined();
  });
});

describe('كروت بلون كامل', () => {
  const purple = ['راحت عليك', 'حيور', 'حصانه', 'طب وتخير'];
  const blue = ['مالك امل', 'استريح'];

  it('البنفسجي والأزرق مثل ما حددهم صاحب المشروع، وباقي الكروت وجهها فاتح', () => {
    const fills = new Map<string, string | undefined>();
    for (const c of buildDeck()) {
      const info = cardInfo(c);
      if (c.kind !== 'action') expect(info.fill).toBeUndefined();
      else fills.set(info.name, info.fill);
    }
    for (const [name, fill] of fills) {
      const expected = purple.includes(name) ? SET_COLORS.purple : blue.includes(name) ? SET_COLORS.darkBlue : undefined;
      expect([name, fill]).toEqual([name, expected]);
    }
    for (const name of [...purple, ...blue]) expect(fills.has(name)).toBe(true);
  });

  it('الكرت ينرسم بوجه ملوّن كامل وكتابة فاتحة، والكرت العادي يبقى فاتح', () => {
    const flat = (style: unknown) => StyleSheet.flatten(style as StyleProp<ViewStyle & TextStyle>);
    const draw = (id: string) => {
      let renderer: ReactTestRenderer | undefined;
      act(() => {
        renderer = create(<CardView card={card(id)} width={70} height={100} />);
      });
      if (!renderer) throw new Error('الكرت ما انعرض');
      const views = renderer.root.findAll((node) => (node.type as unknown) === 'View');
      const textNodes = renderer.root.findAll((node) => (node.type as unknown) === 'Text');
      return { face: flat(views[0]?.props.style)?.backgroundColor, inks: textNodes.map((node) => flat(node.props.style)?.color) };
    };
    const hayyour = draw('action:hayyour:1');
    expect(hayyour.face).toBe(SET_COLORS.purple);
    expect(new Set(hayyour.inks)).toEqual(new Set([theme.cardFace]));

    expect(draw('action:malekAmal:1').face).toBe(SET_COLORS.darkBlue);

    const plain = draw('action:draw2:1');
    expect(plain.face).toBe(theme.cardFace);
    expect(plain.inks).not.toContain(theme.cardFace);
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

  it('ينتقل حتى لو يدي فوق 7: الزايد ينحرق عشوائياً بنهاية الدور', () => {
    const onMove = jest.fn();
    const hand = ['money:1:1', 'money:1:2', 'money:1:3', 'money:1:4', 'money:1:5', 'money:1:6', 'money:1:7', 'money:1:8'];
    const game = setTurn(readyState(hand), { playsUsed: 3 });
    const renderer = render(game, null, onMove);
    act(() => {
      jest.advanceTimersByTime(2000);
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
    expect(ids(renderer, 'attack-banner')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('السهم مزدوج: على اللاعب المستهدف، وبوسط الطاولة مكتوب مين لعب وش على مين', () => {
    const game = setTurn(readyState([]), { seat: 1 });
    const renderer = render(game, { type: 'playAction', seat: 1, cardId: 'action:qarqash:1', targetSeat: 3 }, () => undefined);
    expect(targetedSeats(renderer)).toEqual(['targeted-3']);
    expect(ids(renderer, 'attack-banner')).toHaveLength(1);
    expect(texts(renderer)).toContain(S.attackBanner(S.bot(1), 'قرقش', S.bot(3)));
    act(() => renderer.unmount());
  });
});

describe('معلومات اللاعبين على الطاولة', () => {
  it('كل لاعب ضدي يبين عنده عدد أطقمه الكاملة', () => {
    let game = giveFullSet(giveFullSet(readyState([]), 2, 'brown'), 2, 'darkBlue');
    game = giveFullSet(game, 3, 'pistachio');
    const renderer = render(game, null, () => undefined);
    const shown = texts(renderer);
    expect(shown.filter((text) => text === S.setsShort(2))).toHaveLength(1);
    expect(shown.filter((text) => text === S.setsShort(1))).toHaveLength(1);
    expect(shown.filter((text) => text === S.setsShort(0))).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('استريح وحصانه ينكتبون كبار على اللاعب لين يخلصون', () => {
    const base = readyState([]);
    const game: GameState = { ...base, skips: [2, 3, 3], immune: [1] };
    const renderer = render(game, null, () => undefined);
    expect(ids(renderer, 'badge-skip-')).toEqual(['badge-skip-2', 'badge-skip-3']);
    expect(ids(renderer, 'badge-immune-')).toEqual(['badge-immune-1']);
    const shown = texts(renderer);
    expect(shown).toContain(S.skipped);
    expect(shown).toContain(S.skippedTimes(2));
    expect(shown).toContain(S.immune);
    act(() => renderer.unmount());

    // بدون استريح ولا حصانه ما فيه علامات
    const clean = render(base, null, () => undefined);
    expect(ids(clean, 'badge-')).toEqual([]);
    act(() => clean.unmount());
  });

  it('عدّاد الكروت الملعوبة: دائرة تتعبى مع كل كرت، وأربع دوائر مع زايد لعبه', () => {
    const two = render(setTurn(readyState(['money:1:1']), { playsUsed: 2 }), null, () => undefined);
    expect(ids(two, 'play-dot-', true)).toEqual(['play-dot-on', 'play-dot-on', 'play-dot-off']);
    act(() => two.unmount());

    const extra = render({ ...setTurn(readyState(['money:1:1']), { playsUsed: 1 }), extraPlays: 1 }, null, () => undefined);
    expect(ids(extra, 'play-dot-', true)).toEqual(['play-dot-on', 'play-dot-off', 'play-dot-off', 'play-dot-off']);
    act(() => extra.unmount());
  });
});
