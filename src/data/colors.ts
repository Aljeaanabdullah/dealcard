// ألوان العقارات العشرة — المصدر: prd.md القسم 5.6
// الأعداد والقيم والإيجارات تنكتب هنا مرة وحدة فقط.

export type ColorId =
  | 'brown'
  | 'lightBlue'
  | 'pistachio'
  | 'purple'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkBlue'
  | 'black';

export interface ColorDef {
  readonly id: ColorId;
  /** اسم اللون مثل ما هو في prd.md */
  readonly name: string;
  /** عدد العقارات اللي تكمل الطقم */
  readonly setSize: number;
  /** أسماء المناطق مثل ما هي في prd.md */
  readonly regions: readonly string[];
  /** قيمة العقار الواحد بالدينار */
  readonly propertyValue: number;
  /** الإيجار حسب عدد العقارات: العنصر الأول لعقار واحد، وهكذا */
  readonly rent: readonly number[];
}

export function getColor(id: ColorId): ColorDef {
  const def = COLORS.find((color) => color.id === id);
  if (!def) {
    throw new Error(`لون غير معروف: ${id}`);
  }
  return def;
}

export const COLORS: readonly ColorDef[] = [
  { id: 'brown', name: 'بني', setSize: 2, regions: ['الجهراء', 'الصليبية'], propertyValue: 1, rent: [1, 2] },
  { id: 'lightBlue', name: 'أزرق فاتح', setSize: 3, regions: ['الفحيحيل', 'المنقف', 'أبو حليفة'], propertyValue: 1, rent: [1, 2, 3] },
  { id: 'pistachio', name: 'فستقي', setSize: 2, regions: ['الوفرة', 'العبدلي'], propertyValue: 2, rent: [1, 2] },
  { id: 'purple', name: 'بنفسجي', setSize: 3, regions: ['حولي', 'السالمية', 'الجابرية'], propertyValue: 2, rent: [1, 2, 4] },
  { id: 'orange', name: 'برتقالي', setSize: 3, regions: ['الفروانية', 'خيطان', 'الرقعي'], propertyValue: 2, rent: [1, 3, 5] },
  { id: 'red', name: 'أحمر', setSize: 3, regions: ['المباركية', 'شرق', 'المرقاب'], propertyValue: 3, rent: [2, 3, 6] },
  { id: 'yellow', name: 'أصفر', setSize: 3, regions: ['الخيران', 'بنيدر', 'الزور'], propertyValue: 3, rent: [2, 4, 6] },
  { id: 'green', name: 'أخضر', setSize: 3, regions: ['الشامية', 'كيفان', 'الروضة'], propertyValue: 4, rent: [2, 4, 7] },
  { id: 'darkBlue', name: 'أزرق غامق', setSize: 2, regions: ['ضاحية عبدالله السالم', 'النزهة'], propertyValue: 4, rent: [3, 8] },
  { id: 'black', name: 'أسود', setSize: 4, regions: ['الرياض', 'دبي', 'الدوحة', 'المنامة'], propertyValue: 2, rent: [1, 2, 3, 4] },
];
