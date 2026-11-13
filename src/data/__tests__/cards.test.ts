// اختبارات بيانات الكروت — الأرقام المتوقعة من prd.md الأقسام 5.4 إلى 5.9
import { ACTIONS, BUILDINGS, JOKER, MONEY, RENTS, buildDeck, type CardKind } from '../cards';
import { COLORS } from '../colors';

function countKind(kind: CardKind): number {
  return buildDeck().filter((card) => card.kind === kind).length;
}

function actionCount(id: string): number {
  return buildDeck().filter((card) => card.kind === 'action' && card.action === id).length;
}

describe('ملخص الكروت (PRD 5.9)', () => {
  it('مجموع الكروت 132', () => {
    expect(buildDeck()).toHaveLength(132);
  });

  it('عدد كل نوع يطابق PRD', () => {
    expect(countKind('action')).toBe(48);
    expect(countKind('rent')).toBe(13);
    expect(countKind('property')).toBe(28);
    expect(countKind('joker')).toBe(3);
    expect(countKind('money')).toBe(30);
    expect(countKind('building')).toBe(10);
  });

  it('كل كرت له معرّف فريد', () => {
    const ids = buildDeck().map((card) => card.id);
    expect(new Set(ids).size).toBe(132);
  });
});

describe('كروت الأكشن (PRD 5.4)', () => {
  it('26 نوع', () => {
    expect(ACTIONS).toHaveLength(26);
  });

  it('عدد كل كرت أكشن يطابق PRD', () => {
    const expected: Record<string, number> = {
      'قرقش': 3,
      'قرض اسكان': 1,
      'العيادي': 3,
      'تثمين': 1,
      'دوبل ايجار': 2,
      'بوق لاتخاف': 3,
      'بوق لاتخاف دبل': 1,
      'بوق الجيكر': 1,
      'بدل': 3,
      'راحت عليك': 2,
      'اندبس': 1,
      'ازاله': 1,
      'اطحس': 1,
      'ورثتك': 1,
      'مخالفه': 1,
      'اسحب 2': 10,
      'زايد لعبه': 2,
      'استريح': 1,
      'اكشف': 1,
      'طب وتخير': 1,
      'مالك امل': 3,
      'حيور': 1,
      'فزعه': 1,
      'حصانه': 1,
      'ماتشوف شر': 1,
      'ادفعلي ايجاري': 1,
    };
    expect(ACTIONS.map((def) => def.name).sort()).toEqual(Object.keys(expected).sort());
    for (const def of ACTIONS) {
      expect(actionCount(def.id)).toBe(expected[def.name]);
    }
  });
});

describe('كروت الإيجار (PRD 5.5)', () => {
  it('كرت الشخص الواحد 3 ويصلح لأي لون', () => {
    const one = RENTS.filter((def) => def.payer === 'one');
    expect(one).toHaveLength(1);
    expect(one[0]?.count).toBe(3);
    expect(one[0]?.colors).toBe('any');
  });

  it('خمسة كروت للجميع، كل واحد للونين وعدده 2', () => {
    const all = RENTS.filter((def) => def.payer === 'all');
    expect(all.map((def) => def.colors)).toEqual([
      ['yellow', 'red'],
      ['orange', 'purple'],
      ['lightBlue', 'black'],
      ['darkBlue', 'green'],
      ['pistachio', 'black'],
    ]);
    for (const def of all) {
      expect(def.count).toBe(2);
    }
  });
});

describe('العقارات والأطقم (PRD 5.6)', () => {
  it('10 ألوان و28 عقار', () => {
    expect(COLORS).toHaveLength(10);
    expect(COLORS.reduce((sum, color) => sum + color.regions.length, 0)).toBe(28);
  });

  it('عدد الطقم والقيمة والإيجار لكل لون يطابق PRD', () => {
    const table = COLORS.map((c) => [c.name, c.setSize, c.propertyValue, c.rent]);
    expect(table).toEqual([
      ['بني', 2, 1, [1, 2]],
      ['أزرق فاتح', 3, 1, [1, 2, 3]],
      ['فستقي', 2, 2, [1, 2]],
      ['بنفسجي', 3, 2, [1, 2, 4]],
      ['برتقالي', 3, 2, [1, 3, 5]],
      ['أحمر', 3, 3, [2, 3, 6]],
      ['أصفر', 3, 3, [2, 4, 6]],
      ['أخضر', 3, 4, [2, 4, 7]],
      ['أزرق غامق', 2, 4, [3, 8]],
      ['أسود', 4, 2, [1, 2, 3, 4]],
    ]);
  });

  it('عدد المناطق وجدول الإيجار بطول الطقم، وأسماء المناطق ما تتكرر', () => {
    for (const color of COLORS) {
      expect(color.regions).toHaveLength(color.setSize);
      expect(color.rent).toHaveLength(color.setSize);
    }
    const regions = COLORS.flatMap((color) => color.regions);
    expect(new Set(regions).size).toBe(28);
  });

  it('الجيكر 3 كروت', () => {
    expect(JOKER.count).toBe(3);
  });
});

describe('كروت الفلوس (PRD 5.7)', () => {
  it('30 كرت ومجموعها 87 دينار', () => {
    expect(MONEY.reduce((sum, def) => sum + def.count, 0)).toBe(30);
    expect(MONEY.reduce((sum, def) => sum + def.value * def.count, 0)).toBe(87);
  });

  it('عدد كل فئة يطابق PRD', () => {
    expect(MONEY.map((def) => [def.value, def.count])).toEqual([
      [1, 8],
      [2, 7],
      [3, 5],
      [4, 5],
      [5, 4],
      [10, 1],
    ]);
  });
});

describe('كروت المباني (PRD 5.8)', () => {
  it('الاسم والزيادة والعدد لكل مبنى', () => {
    expect(BUILDINGS.map((def) => [def.name, def.rentBonus, def.count])).toEqual([
      ['منتجع', 5, 1],
      ['شاليه', 4, 2],
      ['قسيمه', 3, 3],
      ['عماره', 4, 4],
    ]);
  });
});
