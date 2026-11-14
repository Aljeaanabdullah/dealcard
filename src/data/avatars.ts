// شخصيات اللاعبين — المصدر: prd.md القسم 6
// 12 شخصية أصلية خاصة باللعبة، كلها مجانية ومفتوحة لكل لاعب. الرسم نفسه في src/ui/avatarShapes.ts.

/** عدد الشخصيات اللي يختار منها اللاعب (أرقامها من 0). */
export const AVATAR_COUNT = 12;

/** الشخصية الافتراضية إذا اللاعب ما اختار. */
export const DEFAULT_AVATAR = 0;

/** شخصية البوت (وجه روبوت)، ما يختارها لاعب. */
export const BOT_AVATAR = -1;

/** يرجّع رقم شخصية صحيح للاعب، وأي قيمة غلط ترجع للافتراضية. */
export function normalizeAvatar(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < AVATAR_COUNT ? value : DEFAULT_AVATAR;
}
