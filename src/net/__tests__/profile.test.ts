// اختبارات أسماء البوتات، شخصيات اللاعبين، والحساب الاختياري — prd.md الأقسام 6 و 9
import { pickBotAvatars, pickBotNames } from '../../bot/names';
import { AVATAR_COUNT, BOT_AVATAR, DEFAULT_AVATAR, normalizeAvatar } from '../../data/avatars';
import { BOT_NAMES } from '../../data/bots';
import { createRng } from '../../engine/rng';
import { checkCredentials, cleanEmail, readProfile } from '../account';
import { createMemoryAccount } from '../memoryAccount';
import { createRoom, joinRoom, leaveRoom, snapshotFor, startRoom, type Room, type RoomResult } from '../room';

function ok(result: RoomResult): Room {
  if (!result.ok) throw new Error(result.error);
  return result.room;
}

describe('أسماء البوتات', () => {
  it('القائمة مثل ما كتبها صاحب المشروع', () => {
    expect(BOT_NAMES).toEqual(['bo hany', 'Thyab', 'Bo3zozQ8', 'Bo3thab', 'Miry', 'komar']);
  });

  it('تنختار أسماء مختلفة من القائمة، ونفس البذرة تعطي نفس الأسماء', () => {
    const names = pickBotNames(createRng(5), 3);
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    for (const name of names) expect(BOT_NAMES).toContain(name);
    expect(pickBotNames(createRng(5), 3)).toEqual(names);
  });

  it('الأسماء تتغير من مباراة لمباراة', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) seen.add(pickBotNames(createRng(seed), 3).join());
    expect(seen.size).toBeGreaterThan(5);
  });

  it('ما ينختار اسم مستخدم بالغرفة', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const names = pickBotNames(createRng(seed), 3, ['Thyab', 'Miry', 'komar']);
      expect(names.slice().sort()).toEqual(['Bo3thab', 'Bo3zozQ8', 'bo hany']);
    }
  });

  it('بالغرفة: البوتات اللي تكمل العدد ياخذون أسماء من القائمة وشخصيات عشوائية مختلفة (مو وجه الروبوت)', () => {
    const room = ok(startRoom(ok(createRoom('ABCDE', 'p0', 'سالم', 3)), 'p0', 11, 1000));
    const bots = room.seats.filter((seat) => seat.isBot);
    expect(bots).toHaveLength(3);
    expect(new Set(bots.map((seat) => seat.name)).size).toBe(3);
    for (const bot of bots) {
      expect(BOT_NAMES).toContain(bot.name);
      expect(bot.avatar).not.toBe(BOT_AVATAR);
      expect(normalizeAvatar(bot.avatar)).toBe(bot.avatar);
    }
    // كل مقعد له شخصية مختلفة، وشخصية اللاعب ما ياخذها بوت
    expect(new Set(room.seats.map((seat) => seat.avatar)).size).toBe(4);
    // لقطة اللاعب فيها أسماء البوتات وشخصياتهم
    const snapshot = snapshotFor(room, 'p0');
    expect(snapshot?.seats.map((seat) => seat.avatar)).toEqual(room.seats.map((seat) => seat.avatar));
    expect(snapshot?.seats.slice(1).every((seat) => seat.isBot && BOT_NAMES.includes(seat.name))).toBe(true);
  });

  it('شخصيات البوتات عشوائية مبذورة: مختلفة عن بعض، وتتغير من مباراة لمباراة', () => {
    const avatars = pickBotAvatars(createRng(4), 3, [2]);
    expect(new Set(avatars).size).toBe(3);
    expect(avatars).not.toContain(2);
    for (const avatar of avatars) expect(normalizeAvatar(avatar)).toBe(avatar);
    expect(pickBotAvatars(createRng(4), 3, [2])).toEqual(avatars);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) seen.add(pickBotAvatars(createRng(seed), 3).join());
    expect(seen.size).toBeGreaterThan(5);
  });

  it('لاعب طلع وسط اللعب: البوت اللي يستلم مكانه ياخذ اسم بوت مو مستخدم', () => {
    let room = ok(createRoom('ABCDE', 'p0', 'سالم'));
    room = ok(joinRoom(room, 'p1', 'خالد', 5));
    room = ok(startRoom(room, 'p0', 11, 1000));
    const before = room.seats.map((seat) => seat.name);
    room = ok(leaveRoom(room, 'p1'));
    const taken = room.seats[1];
    expect(taken?.isBot).toBe(true);
    expect(taken?.avatar).not.toBe(BOT_AVATAR);
    expect(BOT_NAMES).toContain(taken?.name);
    expect(before).not.toContain(taken?.name);
    expect(new Set(room.seats.map((seat) => seat.name)).size).toBe(4);
  });
});

describe('شخصيات اللاعبين', () => {
  it('12 شخصية، وأي رقم غلط يرجع للافتراضية', () => {
    expect(AVATAR_COUNT).toBe(12);
    expect(normalizeAvatar(11)).toBe(11);
    for (const bad of [12, -1, 2.5, Number.NaN, '3', null, undefined]) {
      expect(normalizeAvatar(bad)).toBe(DEFAULT_AVATAR);
    }
  });

  it('الخادم يحفظ شخصية اللاعب، ويرفض الأرقام الغلط (ولا لاعب ياخذ شخصية الروبوت)', () => {
    let room = ok(createRoom('ABCDE', 'p0', 'سالم', 7));
    room = ok(joinRoom(room, 'p1', 'خالد', 99));
    room = ok(joinRoom(room, 'p2', 'فهد', BOT_AVATAR));
    room = ok(joinRoom(room, 'p3', 'ناصر'));
    expect(room.seats.map((seat) => seat.avatar)).toEqual([7, DEFAULT_AVATAR, DEFAULT_AVATAR, DEFAULT_AVATAR]);
    expect(snapshotFor(room, 'p1')?.seats.map((seat) => seat.avatar)).toEqual([7, 0, 0, 0]);
  });
});

describe('الحساب الاختياري بالإيميل وكلمة السر', () => {
  it('فحص الإيميل وكلمة السر', () => {
    expect(checkCredentials('salem@example.com', 'secret1')).toBeNull();
    expect(checkCredentials('  Salem@Example.com ', 'secret1')).toBeNull();
    expect(cleanEmail('  Salem@Example.com ')).toBe('salem@example.com');
    for (const bad of ['', 'salem', 'salem@', '@example.com', 'a b@example.com', 'salem@example']) {
      expect(checkCredentials(bad, 'secret1')).toBe('invalidEmail');
    }
    expect(checkCredentials('salem@example.com', '12345')).toBe('weakPassword');
  });

  it('قراءة الاسم والشخصية المحفوظين، والقيم الغلط ترجع للافتراضي', () => {
    expect(readProfile({ name: ' سالم ', avatar: 4 })).toEqual({ name: 'سالم', avatar: 4 });
    expect(readProfile({ name: 5, avatar: 'x' })).toEqual({ name: '', avatar: DEFAULT_AVATAR });
    expect(readProfile(null)).toEqual({ name: '', avatar: DEFAULT_AVATAR });
    expect(readProfile({ name: 'ا'.repeat(40), avatar: 1 }).name).toHaveLength(16);
  });

  it('حساب جديد ثم دخول: الاسم والشخصية يرجعون، وحفظ التعديل يبقى', async () => {
    const account = createMemoryAccount();
    expect(await account.signUp('salem@example.com', 'secret1', { name: 'سالم', avatar: 2 })).toEqual({
      ok: true,
      email: 'salem@example.com',
      profile: { name: 'سالم', avatar: 2 },
    });
    await account.saveProfile({ name: 'بو سالم', avatar: 9 });
    await account.signOut();
    expect(await account.signIn('SALEM@example.com', 'secret1')).toEqual({
      ok: true,
      email: 'salem@example.com',
      profile: { name: 'بو سالم', avatar: 9 },
    });
  });

  it('المرفوض: كلمة سر غلط، إيميل مسجل من قبل، وإيميل مو صحيح', async () => {
    const account = createMemoryAccount();
    await account.signUp('salem@example.com', 'secret1', { name: 'سالم', avatar: 0 });
    expect(await account.signIn('salem@example.com', 'wrong-pass')).toEqual({ ok: false, error: 'wrongLogin' });
    expect(await account.signIn('nobody@example.com', 'secret1')).toEqual({ ok: false, error: 'wrongLogin' });
    expect(await account.signUp('salem@example.com', 'another1', { name: 'x', avatar: 0 })).toEqual({ ok: false, error: 'emailTaken' });
    expect(await account.signUp('not-an-email', 'secret1', { name: 'x', avatar: 0 })).toEqual({ ok: false, error: 'invalidEmail' });
    expect(await account.signUp('new@example.com', '123', { name: 'x', avatar: 0 })).toEqual({ ok: false, error: 'weakPassword' });
  });
});
