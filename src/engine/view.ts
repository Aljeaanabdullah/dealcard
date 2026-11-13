// اللي يشوفه كل لاعب من الحالة: يده فقط، وأيدي الباقين كأعداد.
// اليد المكشوفة بـ"اكشف" تبان للاعب اللي لعب الكرت فقط.

import type { Card } from '../data/cards';
import type { GameState, PlacedBuilding, PlacedProperty } from './state';

export interface PlayerView {
  readonly seat: number;
  readonly handCount: number;
  /** كروت اليد إذا مسموح لهذا اللاعب يشوفها، غير كذا null */
  readonly hand: readonly Card[] | null;
  readonly bank: readonly Card[];
  readonly properties: readonly PlacedProperty[];
  readonly buildings: readonly PlacedBuilding[];
}

export function viewFor(state: GameState, viewerSeat: number): PlayerView[] {
  return state.players.map((player) => {
    const isSelf = player.seat === viewerSeat;
    const isRevealed = state.revealed?.viewer === viewerSeat && state.revealed.target === player.seat;
    return {
      seat: player.seat,
      handCount: player.hand.length,
      hand: isSelf || isRevealed ? player.hand : null,
      bank: player.bank,
      properties: player.properties,
      buildings: player.buildings,
    };
  });
}
