// اختبار واجهة اللعب أونلاين بغرفة خاصة — plan.md المرحلة 8
// يشتغل على خادم داخل الذاكرة (نفس منطق الغرفة). الاتصال الفعلي بـ Supabase و4 أجهزة حقيقية ما انختبروا هنا.
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import App from '../../../App';
import { allCards } from '../../engine/state';
import { createMemoryHost, type MemoryHost } from '../../net/memoryHost';
import type { RoomSnapshot } from '../../net/room';
import type { Transport } from '../../net/transport';
import { S } from '../strings';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function pressables(root: ReactTestInstance, prefix: string): ReactTestInstance[] {
  return root.findAll(
    (node) =>
      typeof node.props.testID === 'string' &&
      (node.props.testID as string).startsWith(prefix) &&
      typeof node.props.onPress === 'function' &&
      node.props.disabled !== true &&
      node.parent?.props.testID !== node.props.testID,
  );
}

async function press(root: ReactTestInstance, prefix: string, index = 0): Promise<boolean> {
  const found = pressables(root, prefix);
  const target = found[index % Math.max(found.length, 1)];
  if (!target) return false;
  await act(async () => {
    (target.props.onPress as () => void)();
  });
  return true;
}

async function type(root: ReactTestInstance, testID: string, text: string): Promise<void> {
  const input = root.findAll((node) => node.props.testID === testID && typeof node.props.onChangeText === 'function')[0];
  if (!input) throw new Error(`ما لقيت الخانة ${testID}`);
  await act(async () => {
    (input.props.onChangeText as (value: string) => void)(text);
  });
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && node.children.some((child) => child === text)).length > 0;
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function render(transport: Transport | null): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<App transport={transport} />);
  });
  if (!renderer) throw new Error('التطبيق ما انعرض');
  return renderer;
}

/** ينشئ غرفة من الواجهة ويرجّع كودها. */
async function createRoomFromUi(host: MemoryHost, root: ReactTestInstance, name: string): Promise<string> {
  await type(root, 'name-input', name);
  expect(await press(root, 'create-room')).toBe(true);
  expect(hasText(root, S.lobbyTitle)).toBe(true);
  const codeNode = root.findAll(
    (node) => typeof node.type === 'string' && node.children.length === 1 && /^[A-Z2-9]{5}$/.test(String(node.children[0])),
  )[0];
  const code = String(codeNode?.children[0] ?? '');
  expect(host.roomOf(code)?.status).toBe('lobby');
  return code;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('الرئيسية', () => {
  it('إذا Supabase مو مجهز: أزرار الأونلاين معطلة واللعب ضد البوتات شغال', async () => {
    const renderer = await render(null);
    const root = renderer.root;
    expect(hasText(root, S.onlineUnavailable)).toBe(true);
    expect(pressables(root, 'create-room')).toHaveLength(0);
    expect(pressables(root, 'join-room')).toHaveLength(0);
    expect(pressables(root, 'start-go')).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('الدخول بكود غلط أو بدون اسم يطلّع رسالة خطأ', async () => {
    const host = createMemoryHost(1, () => Date.now());
    const renderer = await render(host.transportFor('me'));
    const root = renderer.root;

    await type(root, 'name-input', 'سالم');
    await type(root, 'code-input', 'zzzzz');
    await press(root, 'join-room');
    expect(hasText(root, S.netError('notInRoom'))).toBe(true);

    await type(root, 'name-input', '');
    await press(root, 'create-room');
    expect(hasText(root, S.netError('nameRequired'))).toBe(true);
    act(() => renderer.unmount());
  });
});

describe('غرفة خاصة بكود', () => {
  it('إنشاء غرفة، ودخول لاعب ثاني بالكود من واجهته، واختيار شرط الفوز', async () => {
    const host = createMemoryHost(2, () => Date.now());
    const mine = await render(host.transportFor('me'));
    const code = await createRoomFromUi(host, mine.root, 'سالم');
    expect(hasText(mine.root, S.playersCount(1))).toBe(true);

    // اللاعب الثاني يدخل بالكود من تطبيقه
    const theirs = await render(host.transportFor('friend'));
    await type(theirs.root, 'name-input', 'خالد');
    await type(theirs.root, 'code-input', code.toLowerCase());
    expect(await press(theirs.root, 'join-room')).toBe(true);
    expect(hasText(theirs.root, S.lobbyTitle)).toBe(true);
    expect(hasText(theirs.root, S.waitingHost)).toBe(true);
    // اللي مو صاحب الغرفة ما عنده زر بدء ولا يغيّر شرط الفوز
    expect(pressables(theirs.root, 'lobby-start')).toHaveLength(0);
    expect(pressables(theirs.root, 'lobby-8')).toHaveLength(0);

    // صاحب الغرفة يشوف اللاعب الجديد
    await advance(300);
    expect(hasText(mine.root, 'خالد')).toBe(true);
    expect(hasText(mine.root, S.playersCount(2))).toBe(true);

    // صاحب الغرفة يختار 8 أطقم
    await press(mine.root, 'lobby-8');
    expect(host.roomOf(code)?.winTarget).toBe(8);

    act(() => mine.unmount());
    act(() => theirs.unmount());
  });

  it('الخروج من غرفة الانتظار يرجّع للرئيسية ويشيل اللاعب من الغرفة', async () => {
    const host = createMemoryHost(3, () => Date.now());
    const renderer = await render(host.transportFor('me'));
    const code = await createRoomFromUi(host, renderer.root, 'سالم');
    await press(renderer.root, 'lobby-leave');
    expect(pressables(renderer.root, 'start-go')).toHaveLength(1);
    expect(host.roomOf(code)?.seats).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('بدء اللعبة: البوتات تكمل العدد، وكل لاعب يشوف يده فقط، واللعب يمشي للنهاية أو 700 خطوة', async () => {
    const host = createMemoryHost(4, () => Date.now());
    const renderer = await render(host.transportFor('me'));
    const root = renderer.root;
    const code = await createRoomFromUi(host, root, 'سالم');

    // لاعب ثاني يدخل مباشرة عبر الخادم ويتابع لقطاته
    const friend = host.transportFor('friend');
    const friendState: { view: RoomSnapshot | null } = { view: null };
    await act(async () => {
      await friend.joinRoom(code, 'خالد');
    });
    const stop = friend.subscribe(code, (snapshot) => {
      friendState.view = snapshot;
    });

    expect(await press(root, 'lobby-start')).toBe(true);
    await advance(300);

    // الطاولة: لاعبين + بوتين
    expect(hasText(root, S.drawPile)).toBe(true);
    expect(hasText(root, 'خالد')).toBe(true);
    expect(hasText(root, S.bot(2))).toBe(true);
    expect(hasText(root, S.bot(3))).toBe(true);
    // يدي 5 كروت، وأيدي الباقين ما تنعرض
    expect(pressables(root, 'hand-')).toHaveLength(5);

    let myTurns = 0;
    let tries = 0;
    for (let step = 0; step < 700 && host.roomOf(code)?.status === 'playing'; step++) {
      // اللاعب الثاني يلعب أول حركة قانونية أرسلها له الخادم
      const friendMove = friendState.view?.moves[0];
      if (friendMove) {
        await act(async () => {
          await friend.sendMove(code, friendMove);
        });
      } else if (await press(root, 'option-0')) {
        // خيار بنافذة
      } else if (await press(root, 'option-cancel')) {
        // كرت ما له لعبة
      } else if (await press(root, 'pay-auto')) {
        await press(root, 'pay-confirm');
      } else if (await press(root, 'draw')) {
        myTurns++;
        tries = 0;
      } else if (hasText(root, S.yourTurn) && tries < 4 && pressables(root, 'hand-').length > 0) {
        await press(root, 'hand-', tries);
        tries++;
      } else if (!(await press(root, 'end-turn')) && hasText(root, S.yourTurn) && pressables(root, 'hand-').length > 0) {
        await press(root, 'hand-', step);
      }
      await advance(300);
    }

    expect(myTurns).toBeGreaterThan(2);
    const room = host.roomOf(code);
    if (!room?.game) throw new Error('ما فيه لعبة');
    expect(new Set(allCards(room.game).map((c) => c.id)).size).toBe(132);
    if (room.status === 'finished') {
      await advance(300);
      expect(hasText(root, S.summary)).toBe(true);
    }

    stop();
    act(() => renderer.unmount());
  });
});
