// شخصيات اللاعبين — المصدر: prd.md القسم 6
// 12 شخصية أصلية خاصة باللعبة، كلها مجانية ومفتوحة لكل لاعب. الرسم نفسه في src/ui/avatarShapes.ts.

/** عدد الشخصيات اللي يختار منها اللاعب (أرقامها من 0). */
export const AVATAR_COUNT = 12;

/** الشخصية الافتراضية إذا اللاعب ما اختار. */
export const DEFAULT_AVATAR = 0;

/** شخصيات البنات من الـ12 (الباقي أولاد). تُستخدم عشان صورة البوت تطابق اسمه. */
export const GIRL_AVATARS: readonly number[] = [4, 5, 8];

/** وجه روبوت احتياطي للمقعد اللي ما له شخصية معروفة. البوتات باللعب ياخذون شخصية عشوائية من الـ12. */
export const BOT_AVATAR = -1;

/** يرجّع رقم شخصية صحيح للاعب، وأي قيمة غلط ترجع للافتراضية. */
export function normalizeAvatar(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < AVATAR_COUNT ? value : DEFAULT_AVATAR;
}
