// اختبارات واجهة: شاشة البداية باللوقو، اختيار الشخصية، والحساب بالإيميل — prd.md الأقسام 6 و 7
// تشتغل على خدمة حسابات داخل الذاكرة. التسجيل الفعلي على Supabase ما انختبر هنا.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import App from '../../../App';
import { AVATAR_COUNT, BOT_AVATAR } from '../../data/avatars';
import type { Account } from '../../net/account';
import { createMemoryAccount } from '../../net/memoryAccount';
import { createMemoryHost } from '../../net/memoryHost';
import { avatarDrawing } from '../avatarShapes';
import { S } from '../strings';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function buttons(root: ReactTestInstance, testID: string): ReactTestInstance[] {
  return root.findAll(
    (node) => node.props.testID === testID && typeof node.props.onPress === 'function' && node.parent?.props.testID !== testID,
  );
}

async function press(root: ReactTestInstance, testID: string): Promise<void> {
  const button = buttons(root, testID)[0];
  if (!button) throw new Error(`ما فيه زر: ${testID}`);
  await act(async () => {
    (button.props.onPress as () => void)();
  });
}

async function type(root: ReactTestInstance, testID: string, text: string): Promise<void> {
  const input = root.findAll((node) => node.props.testID === testID && typeof node.props.onChangeText === 'function')[0];
  if (!input) throw new Error(`ما فيه خانة: ${testID}`);
  await act(async () => {
    (input.props.onChangeText as (value: string) => void)(text);
  });
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && node.children.some((child) => child === text)).length > 0;
}

function has(root: ReactTestInstance, testID: string): boolean {
  return root.findAll((node) => node.props.testID === testID).length > 0;
}

async function render(account: Account | null, splashMs = 0): Promise<ReactTestRenderer> {
  const host = createMemoryHost(1, () => Date.now());
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<App transport={host.transportFor('me')} account={account} splashMs={splashMs} />);
  });
  if (!renderer) throw new Error('التطبيق ما انعرض');
  return renderer;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('شاشة البداية', () => {
  it('أول ما تنفتح اللعبة يطلع اللوقو وشريط التحميل، وبعد ما يخلص تطلع الرئيسية', async () => {
    const renderer = await render(null, 2500);
    const root = renderer.root;
    expect(has(root, 'splash')).toBe(true);
    expect(has(root, 'splash-bar')).toBe(true);
    expect(hasText(root, S.loading)).toBe(true);
    expect(hasText(root, S.playVsBots)).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(2400);
    });
    expect(has(root, 'splash')).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(has(root, 'splash')).toBe(false);
    expect(hasText(root, S.playVsBots)).toBe(true);
    act(() => renderer.unmount());
  });
});

describe('الشخصيات', () => {
  it('كل شخصية لها رسمة مختلفة، والبوت له وجه روبوت', () => {
    const drawings = Array.from({ length: AVATAR_COUNT }, (_, id) => JSON.stringify(avatarDrawing(id, 100)));
    expect(new Set(drawings).size).toBe(AVATAR_COUNT);
    for (let id = 0; id < AVATAR_COUNT; id++) expect(avatarDrawing(id, 100).layers.length).toBeGreaterThan(8);
    const bot = avatarDrawing(BOT_AVATAR, 100);
    expect(bot.layers.map((layer) => layer.key)).toContain('antenna');
    expect(drawings).not.toContain(JSON.stringify(bot));
    // الرسمة تتكبر مع المقاس
    expect(avatarDrawing(0, 200).layers[0]?.style.width).toBe((avatarDrawing(0, 100).layers[0]?.style.width ?? 0) * 2);
  });

  it('اللاعب يختار شخصيته من 12 ويدخل فيها غرفة أونلاين', async () => {
    const renderer = await render(null);
    const root = renderer.root;
    await type(root, 'name-input', 'سالم');
    await press(root, 'name-save');

    await press(root, 'edit-avatar');
    expect(hasText(root, S.chooseAvatar)).toBe(true);
    for (let id = 0; id < AVATAR_COUNT; id++) expect(buttons(root, `avatar-${id}`)).toHaveLength(1);
    expect(buttons(root, `avatar-${AVATAR_COUNT}`)).toHaveLength(0);

    await press(root, 'avatar-7');
    expect(hasText(root, S.chooseAvatar)).toBe(false);

    // الشخصية المختارة تبان معلّمة لما تنفتح النافذة مرة ثانية
    await press(root, 'edit-avatar');
    expect(buttons(root, 'avatar-7')[0]?.props.accessibilityState).toEqual({ selected: true });
    expect(buttons(root, 'avatar-0')[0]?.props.accessibilityState).toEqual({ selected: false });
    await press(root, 'dialog-close');

    // إنشاء غرفة بالشخصية المختارة (وصولها للخادم مختبر في net/profile.test.ts)
    await press(root, 'create-room');
    expect(hasText(root, S.lobbyTitle)).toBe(true);
    act(() => renderer.unmount());
  });
});

describe('الحساب بالإيميل (اختياري)', () => {
  it('بدون خدمة حسابات ما يطلع زر تسجيل الدخول، واللعب كضيف يشتغل', async () => {
    const renderer = await render(null);
    expect(buttons(renderer.root, 'home-account')).toHaveLength(0);
    expect(buttons(renderer.root, 'home-bots')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('حساب جديد يحفظ الاسم والشخصية، وبعد الخروج والدخول يرجعون', async () => {
    const account = createMemoryAccount();
    const renderer = await render(account);
    const root = renderer.root;
    await type(root, 'name-input', 'سالم');
    await press(root, 'name-save');
    await press(root, 'edit-avatar');
    await press(root, 'avatar-4');

    await press(root, 'home-account');
    expect(hasText(root, S.accountHint)).toBe(true);
    await type(root, 'email-input', 'salem@example.com');
    await type(root, 'password-input', 'secret1');
    await press(root, 'account-signup');
    expect(hasText(root, 'salem@example.com')).toBe(true);

    // تعديل الشخصية وهو داخل بحسابه ينحفظ على الحساب
    await press(root, 'edit-avatar');
    await press(root, 'avatar-9');

    await press(root, 'home-account');
    expect(hasText(root, S.signedInAs('salem@example.com'))).toBe(true);
    await press(root, 'account-signout');
    expect(hasText(root, S.account)).toBe(true);
    act(() => renderer.unmount());

    // تشغيل جديد للتطبيق: دخول بنفس الحساب يرجّع الاسم والشخصية
    const again = await render(account);
    await press(again.root, 'dialog-close');
    await press(again.root, 'home-account');
    await type(again.root, 'email-input', 'salem@example.com');
    await type(again.root, 'password-input', 'secret1');
    await press(again.root, 'account-signin');
    expect(hasText(again.root, S.hello('سالم'))).toBe(true);
    await press(again.root, 'edit-avatar');
    expect(buttons(again.root, 'avatar-9')[0]?.props.accessibilityState).toEqual({ selected: true });
    act(() => again.unmount());
  });

  it('كلمة سر غلط تنرفض برسالة واضحة، وخانة كلمة السر مخفية وتنمسح', async () => {
    const account = createMemoryAccount();
    await account.signUp('salem@example.com', 'secret1', { name: 'سالم', avatar: 0 });
    await account.signOut();

    const renderer = await render(account);
    const root = renderer.root;
    await press(root, 'dialog-close');
    await press(root, 'home-account');
    await type(root, 'email-input', 'salem@example.com');
    await type(root, 'password-input', 'wrong-pass');
    const field = () => root.findAll((node) => node.props.testID === 'password-input' && typeof node.props.onChangeText === 'function')[0];
    expect(field()?.props.secureTextEntry).toBe(true);

    await press(root, 'account-signin');
    expect(hasText(root, S.accountError('wrongLogin'))).toBe(true);
    expect(field()?.props.value).toBe('');
    expect(hasText(root, 'salem@example.com')).toBe(false);

    await type(root, 'email-input', 'salem');
    await type(root, 'password-input', 'secret1');
    await press(root, 'account-signin');
    expect(hasText(root, S.accountError('invalidEmail'))).toBe(true);
    act(() => renderer.unmount());
  });
});
