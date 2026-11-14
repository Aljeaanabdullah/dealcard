// اختيار أسماء البوتات وشخصياتهم عشوائياً (عشوائية مبذورة) — prd.md القسم 9

import { AVATAR_COUNT } from '../data/avatars';
import { BOT_NAMES } from '../data/bots';
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
 * يختار شخصيات مختلفة للبوتات من شخصيات اللاعبين، غير المستخدمة بالغرفة قدر الإمكان.
 * البوت ياخذ شخصية عشوائية مثل أي لاعب (والإيموجي يم اسمه يبيّن إنه كمبيوتر).
 */
export function pickBotAvatars(rng: Rng, count: number, taken: readonly number[] = []): number[] {
  const all = Array.from({ length: AVATAR_COUNT }, (_, index) => index);
  let pool = all.filter((avatar) => !taken.includes(avatar));
  const picked: number[] = [];
  while (picked.length < count) {
    if (pool.length === 0) pool = all.slice();
    const [avatar] = pool.splice(randomInt(rng, pool.length), 1);
    if (avatar !== undefined) picked.push(avatar);
  }
  return picked;
}
