// ألوان الواجهة — من المرجع البصري في design/

import type { ActionId } from '../data/cards';
import type { ColorId } from '../data/colors';

export const theme = {
  ground: '#0F2E33',
  panel: '#0B2327',
  felt: '#14464A',
  line: '#2A5F62',
  text: '#F3EFE4',
  muted: '#C9DAD8',
  gold: '#F2C14E',
  danger: '#E4572E',
  cardFace: '#F7F4EC',
  cardInk: '#1B1B1B',
  cardMuted: '#5A5A5A',
  backdrop: 'rgba(7, 26, 29, 0.88)',
} as const;

/** لون كل طقم. */
export const SET_COLORS: Record<ColorId, string> = {
  brown: '#8B5A2B',
  lightBlue: '#7EC8E3',
  pistachio: '#B5CC6A',
  purple: '#8E5BB5',
  orange: '#F08A24',
  red: '#D7372F',
  yellow: '#F4D03F',
  green: '#2E9E5B',
  darkBlue: '#1F3C88',
  black: '#222222',
};

/** كروت أكشن وجهها كله بلون واحد (بنفسجي أو أزرق) — prd.md القسم 4. الباقي وجهه فاتح بشريط ملوّن. */
export const CARD_FILL: Partial<Record<ActionId, string>> = {
  rahatAlek: SET_COLORS.purple,
  hayyour: SET_COLORS.purple,
  hasanah: SET_COLORS.purple,
  tebWetkhayyar: SET_COLORS.purple,
  malekAmal: SET_COLORS.darkBlue,
  estareeh: SET_COLORS.darkBlue,
};

/** لون شريط الكرت حسب نوعه. */
export const BAND = {
  money: '#2E9E5B',
  building: '#6B7280',
  joker: '#F2C14E',
  rentAny: '#F2C14E',
  payment: '#F2C14E',
  steal: '#E4572E',
  turn: '#2BA6A0',
  defense: '#1F3C88',
} as const;
