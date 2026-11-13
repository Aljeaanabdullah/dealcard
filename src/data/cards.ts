// تعريف كل كروت اللعبة كبيانات — المصدر: prd.md الأقسام 5.4 إلى 5.9
// الأسماء العربية مكتوبة مثل ما هي في prd.md، والأعداد تنكتب هنا مرة وحدة فقط.

import { COLORS, type ColorId } from './colors';

// ---------- كروت الأكشن (5.4) ----------

export type ActionGroup = 'payment' | 'steal' | 'turn' | 'defense';

export interface ActionDef {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly group: ActionGroup;
  /** مبلغ الدفع الثابت بالدينار (لكروت الدفع فقط) */
  readonly amount?: number;
}

export const ACTIONS = [
  // أ) كروت الدفع
  { id: 'qarqash', name: 'قرقش', count: 3, group: 'payment', amount: 5 },
  { id: 'qardIskan', name: 'قرض اسكان', count: 1, group: 'payment', amount: 7 },
  { id: 'eyadi', name: 'العيادي', count: 3, group: 'payment', amount: 2 },
  { id: 'tathmeen', name: 'تثمين', count: 1, group: 'payment' },
  { id: 'doubleRent', name: 'دوبل ايجار', count: 2, group: 'payment' },
  // ب) كروت السرقة والتبديل
  { id: 'boog', name: 'بوق لاتخاف', count: 3, group: 'steal' },
  { id: 'boogDouble', name: 'بوق لاتخاف دبل', count: 1, group: 'steal' },
  { id: 'boogJoker', name: 'بوق الجيكر', count: 1, group: 'steal' },
  { id: 'baddel', name: 'بدل', count: 3, group: 'steal' },
  { id: 'rahatAlek', name: 'راحت عليك', count: 2, group: 'steal' },
  { id: 'endebes', name: 'اندبس', count: 1, group: 'steal' },
  { id: 'ezalah', name: 'ازاله', count: 1, group: 'steal' },
  { id: 'etHas', name: 'اطحس', count: 1, group: 'steal' },
  { id: 'werathtek', name: 'ورثتك', count: 1, group: 'steal' },
  { id: 'mukhalafah', name: 'مخالفه', count: 1, group: 'steal' },
  // ج) كروت الدور واليد
  { id: 'draw2', name: 'اسحب 2', count: 10, group: 'turn' },
  { id: 'extraPlay', name: 'زايد لعبه', count: 2, group: 'turn' },
  { id: 'estareeh', name: 'استريح', count: 1, group: 'turn' },
  { id: 'ekshef', name: 'اكشف', count: 1, group: 'turn' },
  { id: 'tebWetkhayyar', name: 'طب وتخير', count: 1, group: 'turn' },
  // د) كروت الدفاع والرد
  { id: 'malekAmal', name: 'مالك امل', count: 3, group: 'defense' },
  { id: 'hayyour', name: 'حيور', count: 1, group: 'defense' },
  { id: 'fazaah', name: 'فزعه', count: 1, group: 'defense' },
  { id: 'hasanah', name: 'حصانه', count: 1, group: 'defense' },
  { id: 'maTshoofShar', name: 'ماتشوف شر', count: 1, group: 'defense' },
  { id: 'edfaaliEjari', name: 'ادفعلي ايجاري', count: 1, group: 'defense' },
] as const satisfies readonly ActionDef[];

export type ActionId = (typeof ACTIONS)[number]['id'];

// ---------- كروت الإيجار (5.5) ----------

export interface RentDef {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  /** 'any' = يصلح لأي لون */
  readonly colors: readonly ColorId[] | 'any';
  /** من يدفع: لاعب واحد تختاره، أو كل اللاعبين */
  readonly payer: 'one' | 'all';
}

export const RENTS = [
  { id: 'rentOne', name: 'ادفع ايجار — شخص واحد', count: 3, colors: 'any', payer: 'one' },
  { id: 'rentYellowRed', name: 'ادفع ايجار الجميع — أصفر وأحمر', count: 2, colors: ['yellow', 'red'], payer: 'all' },
  { id: 'rentOrangePurple', name: 'ادفع ايجار الجميع — برتقالي وبنفسجي', count: 2, colors: ['orange', 'purple'], payer: 'all' },
  { id: 'rentLightBlueBlack', name: 'ادفع ايجار الجميع — أزرق فاتح وأسود', count: 2, colors: ['lightBlue', 'black'], payer: 'all' },
  { id: 'rentDarkBlueGreen', name: 'ادفع ايجار الجميع — أزرق غامق وأخضر', count: 2, colors: ['darkBlue', 'green'], payer: 'all' },
  { id: 'rentPistachioBlack', name: 'ادفع ايجار الجميع — فستقي وأسود', count: 2, colors: ['pistachio', 'black'], payer: 'all' },
] as const satisfies readonly RentDef[];

export type RentId = (typeof RENTS)[number]['id'];

// ---------- الجيكر (5.4 هـ / 5.6) ----------

export const JOKER = { name: 'جيكر', count: 3 } as const;

// ---------- كروت الفلوس (5.7) ----------

export interface MoneyDef {
  readonly value: number;
  readonly count: number;
}

export const MONEY: readonly MoneyDef[] = [
  { value: 1, count: 8 },
  { value: 2, count: 7 },
  { value: 3, count: 5 },
  { value: 4, count: 5 },
  { value: 5, count: 4 },
  { value: 10, count: 1 },
];

// ---------- كروت المباني (5.8) ----------

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  /** زيادة الإيجار */
  readonly rentBonus: number;
  /** قيمة المبنى بالدينار إذا اندفع فيه (= زيادة الإيجار) */
  readonly value: number;
  readonly count: number;
}

export const BUILDINGS = [
  { id: 'resort', name: 'منتجع', rentBonus: 5, value: 5, count: 1 },
  { id: 'chalet', name: 'شاليه', rentBonus: 4, value: 4, count: 2 },
  { id: 'plot', name: 'قسيمه', rentBonus: 3, value: 3, count: 3 },
  { id: 'apartments', name: 'عماره', rentBonus: 4, value: 4, count: 4 },
] as const satisfies readonly BuildingDef[];

export type BuildingId = (typeof BUILDINGS)[number]['id'];

// ---------- الكرت الواحد داخل اللعبة ----------

export type Card =
  | { readonly id: string; readonly kind: 'action'; readonly action: ActionId }
  | { readonly id: string; readonly kind: 'rent'; readonly rent: RentId }
  | { readonly id: string; readonly kind: 'property'; readonly color: ColorId; readonly region: string }
  | { readonly id: string; readonly kind: 'joker' }
  | { readonly id: string; readonly kind: 'money'; readonly value: number }
  | { readonly id: string; readonly kind: 'building'; readonly building: BuildingId };

export type CardKind = Card['kind'];

/** يبني كل كروت اللعبة بترتيب ثابت (بدون خلط)، وكل كرت له معرّف فريد. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];

  for (const def of ACTIONS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `action:${def.id}:${n}`, kind: 'action', action: def.id });
    }
  }
  for (const def of RENTS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `rent:${def.id}:${n}`, kind: 'rent', rent: def.id });
    }
  }
  for (const color of COLORS) {
    color.regions.forEach((region, index) => {
      deck.push({ id: `property:${color.id}:${index + 1}`, kind: 'property', color: color.id, region });
    });
  }
  for (let n = 1; n <= JOKER.count; n++) {
    deck.push({ id: `joker:${n}`, kind: 'joker' });
  }
  for (const def of MONEY) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `money:${def.value}:${n}`, kind: 'money', value: def.value });
    }
  }
  for (const def of BUILDINGS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `building:${def.id}:${n}`, kind: 'building', building: def.id });
    }
  }

  return deck;
}
