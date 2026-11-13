// الأطقم — المصدر: prd.md القسمين 5.1 و 5.6

import { COLORS, getColor, type ColorId } from '../data/colors';
import type { PlacedProperty } from './state';

/** عدد العقارات (مع الجيكرات) من لون معيّن. */
export function countInColor(properties: readonly PlacedProperty[], color: ColorId): number {
  return properties.filter((p) => p.color === color).length;
}

/**
 * الطقم كامل إذا وصل عدد العقارات لعدد الطقم، وفيه عقار حقيقي واحد على الأقل.
 * الجيكرات لحالها ما تكوّن طقم كامل.
 */
export function isSetComplete(properties: readonly PlacedProperty[], color: ColorId): boolean {
  const inColor = properties.filter((p) => p.color === color);
  const hasRealProperty = inColor.some((p) => p.card.kind === 'property');
  return hasRealProperty && inColor.length >= getColor(color).setSize;
}

/** الألوان اللي طقمها كامل. كل لون ينحسب مرة وحدة فقط. */
export function completeColors(properties: readonly PlacedProperty[]): ColorId[] {
  return COLORS.map((color) => color.id).filter((id) => isSetComplete(properties, id));
}
