// اختبار تشغيل الواجهة — plan.md المرحلة 7
// يشغّل التطبيق بدون جوال: يبدأ مباراة ضد البوتات، يضغط الأزرار، ويتأكد من المؤقت.
// ملاحظة: هذا يثبت أن الواجهة تشتغل بدون أخطاء، وما يغني عن التجربة على جهاز حقيقي.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import App from '../../../App';
import { BOT_NAMES } from '../../data/bots';
import { S } from '../strings';

// منطقة النوتش تحتاج قياسات الجهاز؛ بالاختبار نستخدم بديل المكتبة الجاهز.
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function pressables(root: ReactTestInstance, prefix: string): ReactTestInstance[] {
  return root.findAll(
    (node) =>
      typeof node.props.testID === 'string' &&
      (node.props.testID as string).startsWith(prefix) &&
      typeof node.props.onPress === 'function' &&
      node.props.disabled !== true &&
      // الزر يطلع بأكثر من طبقة بشجرة العرض: ناخذ الطبقة الخارجية فقط.
      node.parent?.props.testID !== node.props.testID,
  );
}

function press(root: ReactTestInstance, prefix: string, index = 0): boolean {
  const found = pressables(root, prefix);
  const target = found[index % Math.max(found.length, 1)];
  if (!target) return false;
  act(() => {
    (target.props.onPress as () => void)();
  });
  return true;
}

/** يكمل أي نافذة مفتوحة: تأكيد، أو أول خيار، أو دفع تلقائي. */
function resolveModal(root: ReactTestInstance): boolean {
  if (press(root, 'option-confirm')) return true;
  if (press(root, 'option-0')) return true;
  if (press(root, 'pay-auto')) {
    press(root, 'pay-confirm');
    return true;
  }
  return false;
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && node.children.some((child) => child === text)).length > 0;
}

/** أسماء البوتات الظاهرة على الشاشة: اسم من القائمة ويمّه إيموجي الروبوت. */
function botLabels(root: ReactTestInstance): string[] {
  const labels = new Set<string>();
  for (const node of root.findAll((n) => typeof n.type === 'string')) {
    for (const child of node.children) {
      if (typeof child === 'string' && BOT_NAMES.some((name) => child === S.botName(name))) labels.add(child);
    }
  }
  return [...labels];
}

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function startGame(seed: number): ReactTestRenderer {
  jest.spyOn(Date, 'now').mockReturnValue(seed);
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<App transport={null} splashMs={0} />);
  });
  if (!renderer) throw new Error('التطبيق ما انعرض');
  const root = renderer.root;
  expect(hasText(root, S.appName)).toBe(true);
  // أول ما ينفتح التطبيق يطلب الاسم؛ نسكر النافذة ونلعب ضد البوتات.
  expect(hasText(root, S.enterName)).toBe(true);
  expect(press(root, 'dialog-close')).toBe(true);
  expect(press(root, 'home-bots')).toBe(true);
  expect(press(root, 'start-go')).toBe(true);
  return renderer;
}

/** ينتظر لين يجي دوري ويطلع زر السحب. */
function waitForMyDraw(root: ReactTestInstance): void {
  for (let i = 0; i < 400 && pressables(root, 'draw').length === 0; i++) {
    // أي نافذة تطلع لي بدور البوتات: أرد بأول خيار أو أدفع تلقائياً
    resolveModal(root);
    advance(800);
  }
  expect(pressables(root, 'draw').length).toBe(1);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('واجهة اللعب ضد البوتات', () => {
  it('الشاشة الرئيسية تفتح بأربع بطاقات، واللعبة تبدأ والطاولة تنعرض', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1001);
    let home: ReactTestRenderer | undefined;
    act(() => {
      home = create(<App transport={null} splashMs={0} />);
    });
    if (!home) throw new Error('التطبيق ما انعرض');
    for (const title of [S.randomPlay, S.createRoom, S.joinTitle, S.playVsBots]) {
      expect(hasText(home.root, title)).toBe(true);
    }
    // لعب عشوائي ما انبنى بعد: معطل ومكتوب عليه قريباً
    expect(pressables(home.root, 'home-random')).toHaveLength(0);
    expect(hasText(home.root, S.soon)).toBe(true);
    act(() => home?.unmount());

    const renderer = startGame(1001);
    const root = renderer.root;
    expect(hasText(root, S.drawPile)).toBe(true);
    expect(hasText(root, S.fire)).toBe(true);
    // البوتات الثلاثة بأسماء من القائمة ويمّها إيموجي الروبوت (مو "بوت 1، بوت 2، بوت 3")
    expect(botLabels(root)).toHaveLength(3);
    expect(hasText(root, S.bot(1))).toBe(false);
    // يدي فيها 5 كروت بالبداية
    expect(pressables(root, 'hand-').length).toBe(5);
    act(() => renderer.unmount());
  });

  it('أسحب وألعب كرت وأنهي دوري، والبوتات تلعب بعدي', () => {
    const renderer = startGame(1002);
    const root = renderer.root;
    waitForMyDraw(root);

    expect(hasText(root, S.yourTurn)).toBe(true);
    press(root, 'draw');
    const afterDraw = pressables(root, 'hand-').length;
    expect(afterDraw).toBeGreaterThanOrEqual(7);

    // أضغط كروت يدي لين ألقى كرت له لعبة وألعبه
    let played = false;
    for (let i = 0; i < afterDraw && !played; i++) {
      press(root, 'hand-', i);
      played = press(root, 'option-0');
      if (!played) press(root, 'option-cancel');
    }
    expect(played).toBe(true);

    // أكمل أي نافذة انفتحت (اختيار هدف وتأكيد)، ثم أنهي الدور
    for (let i = 0; i < 8 && resolveModal(root); i++) advance(100);
    for (let i = 0; i < 40 && pressables(root, 'end-turn').length === 0 && hasText(root, S.yourTurn); i++) {
      resolveModal(root);
      advance(800);
    }
    // إذا يدي فوق 7 أرمي الزايد أول
    for (let i = 0; i < 6 && hasText(root, S.yourTurn) && !press(root, 'end-turn'); i++) {
      press(root, 'hand-', i);
      if (!resolveModal(root)) press(root, 'option-cancel');
    }
    advance(800);
    expect(hasText(root, S.yourTurn)).toBe(false);
    act(() => renderer.unmount());
  });

  it('انتهاء المؤقت (90 ثانية) ينهي دوري تلقائياً', () => {
    const renderer = startGame(1003);
    const root = renderer.root;
    waitForMyDraw(root);
    expect(hasText(root, '1:30')).toBe(true);

    advance(30000);
    expect(hasText(root, '1:00')).toBe(true);
    expect(hasText(root, S.yourTurn)).toBe(true);

    advance(61000);
    expect(hasText(root, S.yourTurn)).toBe(false);
    act(() => renderer.unmount());
  });

  it('مباراة طويلة باللمس: كل النوافذ تشتغل بدون خطأ لين نهاية اللعبة أو 600 خطوة', () => {
    const renderer = startGame(1004);
    const root = renderer.root;
    let finished = false;
    let myTurns = 0;
    let tries = 0;

    for (let step = 0; step < 600 && !finished; step++) {
      if (pressables(root, 'replay').length > 0) {
        finished = true;
      } else if (resolveModal(root)) {
        // خيار بنافذة (حركة أو رد أو اختيار هدف أو دفع)
      } else if (press(root, 'option-cancel')) {
        // كرت ما له لعبة
      } else if (press(root, 'draw')) {
        myTurns++;
        tries = 0;
      } else if (hasText(root, S.yourTurn) && tries < 4 && pressables(root, 'hand-').length > 0) {
        press(root, 'hand-', tries);
        tries++;
      } else if (!press(root, 'end-turn') && hasText(root, S.yourTurn) && pressables(root, 'hand-').length > 0) {
        // يدي فوق 7: أرمي كرت
        press(root, 'hand-', step);
      }
      advance(800);
    }

    expect(myTurns).toBeGreaterThan(3);
    if (finished) {
      expect(hasText(root, S.summary)).toBe(true);
      // خروج للبداية يرجع للشاشة الرئيسية
      press(root, 'exit-home');
      expect(hasText(root, S.playVsBots)).toBe(true);
    }
    act(() => renderer.unmount());
  });
});
