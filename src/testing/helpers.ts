// أدوات للاختبارات فقط: تجهيز حالات لعب محددة بدون ما يضيع كرت أو يتكرر.

import type { Card } from '../data/cards';
import { getColor, type ColorId } from '../data/colors';
import type { WinTarget } from '../data/rules';
import type { MoveResult } from '../engine/moves';
import { allCards, createGame, type GameState, type TurnState } from '../engine/state';

export type Target =
  | { readonly zone: 'hand' | 'bank'; readonly seat: number }
  | { readonly zone: 'properties'; readonly seat: number; readonly color: ColorId }
  | { readonly zone: 'buildings'; readonly seat: number; readonly color: ColorId | null }
  | { readonly zone: 'draw' | 'fire' };

/** ينقل كرت من مكانه الحالي (أينما كان) إلى المكان المطلوب. */
export function place(state: GameState, cardId: string, to: Target): GameState {
  const card = allCards(state).find((c) => c.id === cardId);
  if (!card) {
    throw new Error(`كرت غير موجود: ${cardId}`);
  }
  const without = (cards: readonly Card[]) => cards.filter((c) => c.id !== cardId);

  let drawPile = without(state.drawPile);
  let firePile = without(state.firePile);
  const players = state.players.map((p) => ({
    ...p,
    hand: without(p.hand),
    bank: without(p.bank),
    properties: p.properties.filter((placed) => placed.card.id !== cardId),
    buildings: p.buildings.filter((placed) => placed.card.id !== cardId),
  }));

  const seatPlayer = (seat: number) => {
    const index = players.findIndex((p) => p.seat === seat);
    const player = players[index];
    if (!player) {
      throw new Error(`مقعد غير موجود: ${seat}`);
    }
    return { index, player };
  };

  switch (to.zone) {
    case 'draw':
      drawPile = [...drawPile, card];
      break;
    case 'fire':
      firePile = [...firePile, card];
      break;
    case 'hand': {
      const { index, player } = seatPlayer(to.seat);
      players[index] = { ...player, hand: [...player.hand, card] };
      break;
    }
    case 'bank': {
      const { index, player } = seatPlayer(to.seat);
      players[index] = { ...player, bank: [...player.bank, card] };
      break;
    }
    case 'properties': {
      const { index, player } = seatPlayer(to.seat);
      players[index] = { ...player, properties: [...player.properties, { card, color: to.color }] };
      break;
    }
    case 'buildings': {
      const { index, player } = seatPlayer(to.seat);
      players[index] = { ...player, buildings: [...player.buildings, { card, color: to.color }] };
      break;
    }
  }

  return { ...state, drawPile, firePile, players };
}

/** ينقل عدة كروت لنفس المكان. */
export function placeAll(state: GameState, cardIds: readonly string[], to: Target): GameState {
  return cardIds.reduce((s, id) => place(s, id, to), state);
}

/** يفضّي يد اللاعب: كروته ترجع لأسفل كومة السحب. */
export function emptyHand(state: GameState, seat: number): GameState {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return {
    ...state,
    drawPile: [...player.hand, ...state.drawPile],
    players: state.players.map((p) => (p.seat === seat ? { ...p, hand: [] } : p)),
  };
}

/** معرّفات كل عقارات لون معيّن. */
export function propertyIds(color: ColorId): string[] {
  return getColor(color).regions.map((_, index) => `property:${color}:${index + 1}`);
}

/** يعطي اللاعب طقم كامل من لون معيّن على الطاولة. */
export function giveFullSet(state: GameState, seat: number, color: ColorId): GameState {
  return placeAll(state, propertyIds(color), { zone: 'properties', seat, color });
}

export function setTurn(state: GameState, patch: Partial<TurnState>): GameState {
  return { ...state, turn: { ...state.turn, ...patch } };
}

/**
 * لعبة جاهزة للاختبار: الدور عند المقعد 0 وهو ساحب، ويده فيها الكروت المطلوبة فقط،
 * وبقية اللاعبين أيديهم فاضية (كل شي ثاني بكومة السحب).
 */
export function readyState(handIds: readonly string[], winTarget: WinTarget = 6): GameState {
  let state = createGame(1, winTarget);
  for (const player of state.players) {
    state = emptyHand(state, player.seat);
  }
  state = placeAll(state, handIds, { zone: 'hand', seat: 0 });
  return setTurn(state, { seat: 0, hasDrawn: true, playsUsed: 0, discarding: false });
}

/** يرجّع الحالة الجديدة، أو يرمي خطأ إذا الحركة انرفضت. */
export function must(result: MoveResult): GameState {
  if (!result.ok) {
    throw new Error(`الحركة انرفضت: ${result.error}`);
  }
  return result.state;
}

/** سبب الرفض، أو null إذا الحركة انقبلت. */
export function errorOf(result: MoveResult): string | null {
  return result.ok ? null : result.error;
}
