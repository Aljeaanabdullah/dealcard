// عشوائية مبذورة فقط: نفس البذرة تعطي نفس النتيجة دائماً.
// المحرك ما يستخدم Math.random ولا وقت النظام.

export type Rng = () => number;

/** مولّد أرقام (mulberry32) يرجّع رقم بين 0 (مشمول) و 1 (غير مشمول). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** رقم صحيح من 0 إلى max - 1. */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

/** بذرة جديدة مشتقة من المولّد، تنحفظ بالحالة للاستخدام القادم. */
export function nextSeed(rng: Rng): number {
  return randomInt(rng, 4294967296);
}

/** خلط Fisher–Yates يرجّع مصفوفة جديدة وما يغيّر الأصلية. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}
