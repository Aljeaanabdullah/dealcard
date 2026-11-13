// حساب الإيجار وقواعد الدفع — المصدر: prd.md الأقسام 5.3 و 5.6 و 5.8

import { BUILDINGS, type BuildingDef, type Card } from '../data/cards';
import { getColor, type ColorId } from '../data/colors';
import { completeColors, isSetComplete } from './sets';
import type { PlayerState } from './state';

function buildingDef(card: Card): BuildingDef | undefined {
  return card.kind === 'building' ? BUILDINGS.find((def) => def.id === card.building) : undefined;
}

/**
 * إيجار لون عند لاعب: حسب عدد عقاراته من اللون (الجيكر ينحسب إذا معه عقار حقيقي)،
 * وإذا الطقم كامل تنضاف زيادة مبانيه. يرجّع 0 إذا ما فيه عقار حقيقي من اللون.
 */
export function rentFor(player: PlayerState, color: ColorId): number {
  const inColor = player.properties.filter((p) => p.color === color);
  if (!inColor.some((p) => p.card.kind === 'property')) return 0;

  const def = getColor(color);
  const count = Math.min(inColor.length, def.setSize);
  let rent = def.rent[count - 1] ?? 0;

  if (isSetComplete(player.properties, color)) {
    for (const building of player.buildings) {
      if (building.color === color) {
        rent += buildingDef(building.card)?.rentBonus ?? 0;
      }
    }
  }
  return rent;
}

/** مجموع إيجار كل الأطقم الكاملة عند لاعب (لكرت "تثمين"). */
export function rentForAllCompleteSets(player: PlayerState): number {
  return completeColors(player.properties).reduce((sum, color) => sum + rentFor(player, color), 0);
}

/** قيمة الكرت بالدينار إذا اندفع فيه. الجيكر والأكشن والإيجار ما لهم قيمة. */
export function cardValue(card: Card): number {
  switch (card.kind) {
    case 'money':
      return card.value;
    case 'property':
      return getColor(card.color).propertyValue;
    case 'building':
      return buildingDef(card)?.value ?? 0;
    default:
      return 0;
  }
}

/** مصادر الدفع بالترتيب: البنك، ثم المباني، ثم العقارات الحقيقية. */
export function paymentTiers(player: PlayerState): Card[][] {
  return [
    [...player.bank],
    player.buildings.map((b) => b.card),
    player.properties.map((p) => p.card).filter((card) => card.kind === 'property'),
  ];
}

function sum(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + cardValue(card), 0);
}

/** مجموع كل اللي يقدر اللاعب يدفع فيه. */
export function totalPayable(player: PlayerState): number {
  return paymentTiers(player).reduce((total, tier) => total + sum(tier), 0);
}

/**
 * يتحقق أن اختيار الدفع قانوني:
 * - من البنك أولاً، وما ينتقل للمباني إلا إذا خلص البنك، ولا للعقارات إلا إذا خلصت المباني.
 * - لازم يغطي المبلغ، أو يدفع كل اللي عنده إذا ما يكفي.
 * - ما فيه باقي: الدفع بالزيادة مسموح وما يرجع الفرق.
 */
export function isValidPayment(player: PlayerState, amount: number, cardIds: readonly string[]): boolean {
  const chosenIds = new Set(cardIds);
  if (chosenIds.size !== cardIds.length) return false;

  const tiers = paymentTiers(player);
  const payableIds = new Set(tiers.flat().map((card) => card.id));
  for (const id of chosenIds) {
    if (!payableIds.has(id)) return false;
  }

  let remaining = amount;
  for (const tier of tiers) {
    const chosen = tier.filter((card) => chosenIds.has(card.id));
    if (remaining <= 0) {
      if (chosen.length > 0) return false;
      continue;
    }
    if (sum(chosen) >= remaining) {
      remaining = 0;
      continue;
    }
    // هذا المصدر ما غطّى المبلغ: لازم ينأخذ كله قبل الانتقال للي بعده.
    if (chosen.length !== tier.length) return false;
    remaining -= sum(tier);
  }
  return true;
}

/** اختيار دفع قانوني جاهز (الأكبر قيمة أولاً داخل كل مصدر). */
export function suggestPayment(player: PlayerState, amount: number): string[] {
  const ids: string[] = [];
  let remaining = amount;
  for (const tier of paymentTiers(player)) {
    const sorted = tier.slice().sort((a, b) => cardValue(b) - cardValue(a));
    for (const card of sorted) {
      if (remaining <= 0) return ids;
      ids.push(card.id);
      remaining -= cardValue(card);
    }
  }
  return ids;
}
