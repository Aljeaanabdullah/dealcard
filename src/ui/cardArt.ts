// رسومات الكروت — prd.md القسم 4
// صور كرتون أصلية خاصة بـ DEAL Q8 في assets/cards، تطلع بوسط الكرت فوق اسمه.

import type { ActionId, BuildingId } from '../data/cards';

/** كروت الأكشن اللي عليها رسمة. */
export const ACTION_ART: Partial<Record<ActionId, number>> = {
  malekAmal: require('../../assets/cards/malekAmal.png') as number,
  hayyour: require('../../assets/cards/hayyour.png') as number,
  estareeh: require('../../assets/cards/estareeh.png') as number,
  hasanah: require('../../assets/cards/hasanah.png') as number,
};

/** كل مبنى له رسمته. */
export const BUILDING_ART: Record<BuildingId, number> = {
  resort: require('../../assets/cards/resort.png') as number,
  chalet: require('../../assets/cards/chalet.png') as number,
  plot: require('../../assets/cards/plot.png') as number,
  apartments: require('../../assets/cards/apartments.png') as number,
};
