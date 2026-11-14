// اختيار أسماء البوتات عشوائياً (عشوائية مبذورة) — prd.md القسم 9

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
