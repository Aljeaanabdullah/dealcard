// أسماء البوتات — المصدر: prd.md القسم 9
// الأسماء من صاحب المشروع وتنكتب مثل ما هي. كل مباراة تنختار منها أسماء عشوائياً.
// وكل اسم محدد له ولد أو بنت (من صاحب المشروع) عشان صورته تطابقه.

export type Gender = 'boy' | 'girl';

export interface BotDef {
  readonly name: string;
  readonly gender: Gender;
}

export const BOTS: readonly BotDef[] = [
  { name: 'bo hany', gender: 'boy' },
  { name: 'Thyab', gender: 'boy' },
  { name: 'Bo3zozQ8', gender: 'boy' },
  { name: 'Bo3thab', gender: 'boy' },
  { name: 'Miry', gender: 'girl' },
  { name: 'komar', gender: 'boy' },
];

export const BOT_NAMES: readonly string[] = BOTS.map((bot) => bot.name);

/** ولد أو بنت حسب اسم البوت. الاسم اللي مو بالقائمة ما له تحديد. */
export function botGender(name: string): Gender | null {
  return BOTS.find((bot) => bot.name === name)?.gender ?? null;
}
