// ثوابت القوانين — المصدر: prd.md الأقسام 4 و 5.1 و 5.2

/** عدد اللاعبين ثابت */
export const PLAYER_COUNT = 4;

/** التوزيع بالبداية: عدد الكروت لكل لاعب */
export const STARTING_HAND_SIZE = 5;

/** السحب بأول الدور */
export const DRAW_PER_TURN = 2;

/** السحب بأول الدور إذا اليد فاضية */
export const DRAW_WHEN_HAND_EMPTY = 5;

/** الحد الأقصى للكروت الملعوبة بالدور */
export const MAX_PLAYS_PER_TURN = 3;

/** الحد الأقصى للكروت باليد بنهاية الدور */
export const MAX_HAND_SIZE = 7;

/** شرط الفوز: عدد الأطقم الكاملة المختلفة، يختاره صاحب الغرفة */
export const WIN_TARGETS = [6, 8] as const;
export type WinTarget = (typeof WIN_TARGETS)[number];

/** مدة الدور بالثواني. إذا انتهى الوقت ينتهي الدور تلقائياً. */
export const TURN_SECONDS = 90;

/** اللعب العشوائي: إذا ما اكتمل 4 لاعبين خلال هالمدة، البوتات تكمل العدد وتبدأ اللعبة. */
export const MATCH_WAIT_SECONDS = 30;

/** شرط الفوز الثابت باللعب العشوائي. */
export const RANDOM_MATCH_WIN_TARGET: WinTarget = 6;
