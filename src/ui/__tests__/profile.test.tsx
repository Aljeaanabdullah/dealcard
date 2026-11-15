// اختبارات واجهة: شاشة البداية باللوقو، اختيار الشخصية، والحساب بالإيميل — prd.md الأقسام 6 و 7
// تشتغل على خدمة حسابات داخل الذاكرة. التسجيل الفعلي على Supabase ما انختبر هنا.
import { readFileSync } from 'fs';
import { join } from 'path';

import { Image } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import App from '../../../App';
import { AVATAR_COUNT, BOT_AVATAR } from '../../data/avatars';
import type { Account } from '../../net/account';
import { createMemoryAccount } from '../../net/memoryAccount';
import { createMemoryHost } from '../../net/memoryHost';
import { Avatar } from '../Avatar';
import { AVATAR_IMAGES, avatarImage } from '../avatarImages';
import { botDrawing } from '../avatarShapes';
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
  it('كل شخصية لها صورة مختلفة موجودة داخل التطبيق', () => {
    const files = Array.from({ length: AVATAR_COUNT }, (_, id) =>
      readFileSync(join(__dirname, '../../../assets/avatars', `avatar-${String(id).padStart(2, '0')}.png`)).toString('base64'),
    );
    expect(new Set(files).size).toBe(AVATAR_COUNT);
    expect(AVATAR_IMAGES).toHaveLength(AVATAR_COUNT);
    expect(new Set(AVATAR_IMAGES.map((image) => JSON.stringify(image))).size).toBe(AVATAR_COUNT);
    // رقم غلط يرجع للشخصية الافتراضية
    expect(avatarImage(99)).toBe(AVATAR_IMAGES[0]);
  });

  it('الشخصية تنعرض كصورة، والمقعد اللي ما له شخصية يطلع له وجه روبوت', () => {
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(<Avatar avatar={7} size={100} />);
    });
    if (!renderer) throw new Error('الشخصية ما انعرضت');
    const images = renderer.root.findAllByType(Image);
    expect(images).toHaveLength(1);
    expect(images[0]?.props.source).toBe(AVATAR_IMAGES[7]);
    act(() => renderer?.unmount());

    let botRenderer: ReactTestRenderer | undefined;
    act(() => {
      botRenderer = create(<Avatar avatar={BOT_AVATAR} size={100} />);
    });
    if (!botRenderer) throw new Error('وجه الروبوت ما انعرض');
    expect(botRenderer.root.findAllByType(Image)).toHaveLength(0);
    act(() => botRenderer?.unmount());

    const bot = botDrawing(100);
    expect(bot.layers.map((layer) => layer.key)).toContain('antenna');
    // الرسمة تتكبر مع المقاس
    expect(botDrawing(200).layers[0]?.style.width).toBe((bot.layers[0]?.style.width ?? 0) * 2);
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

describe('شاشة الدخول: حسابي / حساب جديد / ضيف', () => {
  it('بدون خدمة حسابات: يدخل الرئيسية مباشرة كضيف وما يطلع زر تسجيل الدخول', async () => {
    const renderer = await render(null);
    expect(buttons(renderer.root, 'auth-guest')).toHaveLength(0);
    expect(buttons(renderer.root, 'home-account')).toHaveLength(0);
    expect(buttons(renderer.root, 'home-bots')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('أول شي بعد اللوقو: ثلاث خيارات، والرئيسية ما تطلع قبل الاختيار', async () => {
    const renderer = await render(createMemoryAccount(), 2500);
    const root = renderer.root;
    expect(has(root, 'splash')).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(2600);
    });
    expect(hasText(root, S.authTitle)).toBe(true);
    // اللوقو بشاشة البداية بس، مو بشاشة الدخول
    expect(root.findAll((node) => node.props.accessibilityLabel === S.appName)).toHaveLength(0);
    for (const id of ['auth-mine', 'auth-new', 'auth-guest']) expect(buttons(root, id)).toHaveLength(1);
    expect(buttons(root, 'home-bots')).toHaveLength(0);
    // ما تطلع نافذة الاسم فوق شاشة الدخول
    expect(hasText(root, S.enterName)).toBe(false);
    act(() => renderer.unmount());
  });

  it('دخول ضيف: يكتب اسمه ويدخل الرئيسية بدون حساب', async () => {
    const renderer = await render(createMemoryAccount());
    const root = renderer.root;
    await press(root, 'auth-guest');
    // بدون اسم ينرفض
    await press(root, 'auth-submit');
    expect(hasText(root, S.netError('nameRequired'))).toBe(true);
    expect(buttons(root, 'home-bots')).toHaveLength(0);

    await type(root, 'auth-name', 'سالم');
    await press(root, 'auth-submit');
    expect(hasText(root, S.hello('سالم'))).toBe(true);
    expect(buttons(root, 'home-bots')).toHaveLength(1);
    // الاسم مكتوب، فنافذة الاسم ما تطلع
    expect(hasText(root, S.enterName)).toBe(false);
    // الضيف يشوف زر "تسجيل الدخول" ويرجّعه لشاشة الدخول
    expect(hasText(root, S.account)).toBe(true);
    await press(root, 'home-account');
    expect(buttons(root, 'auth-mine')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('حساب جديد يدخّل اللاعب ويحفظ اسمه وشخصيته، وبعدها "دخول بحسابي" يرجّعهم', async () => {
    const account = createMemoryAccount();
    const renderer = await render(account);
    const root = renderer.root;
    await press(root, 'auth-new');
    await type(root, 'auth-name', 'سالم');
    await type(root, 'auth-email', 'salem@example.com');
    await type(root, 'auth-password', 'secret1');
    await press(root, 'auth-submit');
    // فوق يطلع الاسم بس، والإيميل ما يبان بالرئيسية
    expect(hasText(root, S.hello('سالم'))).toBe(true);
    expect(hasText(root, 'salem@example.com')).toBe(false);
    expect(hasText(root, S.myAccount)).toBe(true);

    // تعديل الشخصية وهو داخل بحسابه ينحفظ على الحساب
    await press(root, 'edit-avatar');
    await press(root, 'avatar-9');

    // تسجيل الخروج يرجّع لشاشة الدخول
    await press(root, 'home-account');
    expect(hasText(root, S.signedInAs('salem@example.com'))).toBe(true);
    await press(root, 'account-signout');
    expect(buttons(root, 'auth-mine')).toHaveLength(1);
    act(() => renderer.unmount());

    // تشغيل جديد للتطبيق: دخول بنفس الحساب يرجّع الاسم والشخصية
    const again = await render(account);
    await press(again.root, 'auth-mine');
    // دخول بحسابي ما يطلب الاسم
    expect(again.root.findAll((node) => node.props.testID === 'auth-name')).toHaveLength(0);
    await type(again.root, 'auth-email', 'salem@example.com');
    await type(again.root, 'auth-password', 'secret1');
    await press(again.root, 'auth-submit');
    expect(hasText(again.root, S.hello('سالم'))).toBe(true);
    await press(again.root, 'edit-avatar');
    expect(buttons(again.root, 'avatar-9')[0]?.props.accessibilityState).toEqual({ selected: true });
    act(() => again.unmount());
  });

  it('حساب مو مسجل أو كلمة سر غلط: رسالة واضحة، يبقى بشاشة الدخول، وكلمة السر مخفية وتنمسح', async () => {
    const account = createMemoryAccount();
    await account.signUp('salem@example.com', 'secret1', { name: 'سالم', avatar: 0 });
    await account.signOut();

    const renderer = await render(account);
    const root = renderer.root;
    await press(root, 'auth-mine');
    const field = () => root.findAll((node) => node.props.testID === 'auth-password' && typeof node.props.onChangeText === 'function')[0];
    expect(field()?.props.secureTextEntry).toBe(true);

    // حساب ما انسجل
    await type(root, 'auth-email', 'nobody@example.com');
    await type(root, 'auth-password', 'secret1');
    await press(root, 'auth-submit');
    expect(hasText(root, S.accountError('wrongLogin'))).toBe(true);
    expect(field()?.props.value).toBe('');
    expect(buttons(root, 'home-bots')).toHaveLength(0);

    // كلمة سر غلط
    await type(root, 'auth-email', 'salem@example.com');
    await type(root, 'auth-password', 'wrong-pass');
    await press(root, 'auth-submit');
    expect(hasText(root, S.accountError('wrongLogin'))).toBe(true);

    // رجوع ثم حساب جديد بإيميل مسجل وبكلمة سر قصيرة
    await press(root, 'auth-back');
    await press(root, 'auth-new');
    await type(root, 'auth-name', 'خالد');
    await type(root, 'auth-email', 'salem@example.com');
    await type(root, 'auth-password', 'another1');
    await press(root, 'auth-submit');
    expect(hasText(root, S.accountError('emailTaken'))).toBe(true);

    await type(root, 'auth-email', 'khaled@example.com');
    await type(root, 'auth-password', '123');
    await press(root, 'auth-submit');
    expect(hasText(root, S.accountError('weakPassword'))).toBe(true);
    expect(buttons(root, 'home-bots')).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
