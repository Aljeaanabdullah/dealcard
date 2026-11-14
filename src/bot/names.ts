// اختيار أسماء البوتات وشخصياتهم عشوائياً (عشوائية مبذورة) — prd.md القسم 9

import { AVATAR_COUNT, GIRL_AVATARS } from '../data/avatars';
import { BOT_NAMES, botGender } from '../data/bots';
import { randomInt, type Rng } from '../engine/rng';

/**
 * يختار أسماء مختلفة للبوتات من القائمة، غير الأسماء المستخدمة بالغرفة.
 * إذا خلصت الأسماء (ما يصير بـ4 لاعبين) تنعاد القائمة.
 */
export function pickBotNames(rng: Rng, count: number, taken: readonly string[] = []): string[] {
  let pool = BOT_NAMES.filter((name) => !taken.includes(name));
  const picked: string[] = [];
  while (picked.length < count) {
    if (pool.length === 0) pool = BOT_NAMES.slice();
    const [name] = pool.splice(randomInt(rng, pool.length), 1);
    if (name !== undefined) picked.push(name);
  }
  return picked;
}

/**
 * يختار شخصية لكل بوت حسب اسمه: اسم البنت ياخذ شخصية بنت، واسم الولد شخصية ولد.
 * الشخصية عشوائية من اللي تناسبه، وغير المستخدمة بالغرفة قدر الإمكان
 * (والإيموجي يم اسمه يبيّن إنه كمبيوتر).
 */
export function pickBotAvatars(rng: Rng, names: readonly string[], taken: readonly number[] = []): number[] {
  const all = Array.from({ length: AVATAR_COUNT }, (_, index) => index);
  const picked: number[] = [];
  for (const name of names) {
    const gender = botGender(name);
    const fitting = gender === null ? all : all.filter((avatar) => GIRL_AVATARS.includes(avatar) === (gender === 'girl'));
    const free = fitting.filter((avatar) => !taken.includes(avatar) && !picked.includes(avatar));
    // إذا كل اللي تناسبه مأخوذة، ياخذ وحدة تناسبه حتى لو مكررة.
    const pool = free.length > 0 ? free : fitting;
    const avatar = pool[randomInt(rng, pool.length)];
    if (avatar !== undefined) picked.push(avatar);
  }
  return picked;
}
