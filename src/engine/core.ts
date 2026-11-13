// أدوات مشتركة داخل المحرك: الوصول للاعبين، نقل العقارات، السحب، والديون.

import type { Card } from '../data/cards';
import type { ColorId } from '../data/colors';
import { PLAYER_COUNT } from '../data/rules';
import { totalPayable } from './payment';
import { createRng, nextSeed, shuffle } from './rng';
import { completeColors, isSetComplete } from './sets';
import type { GameState, PlacedProperty, PlayerState } from './state';

export function getPlayer(state: GameState, seat: number): PlayerState {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return player;
}

export function withPlayer(state: GameState, player: PlayerState): GameState {
  return { ...state, players: state.players.map((p) => (p.seat === player.seat ? player : p)) };
}

export function otherSeats(seat: number): number[] {
  const seats: number[] = [];
  for (let s = 0; s < PLAYER_COUNT; s++) {
    if (s !== seat) seats.push(s);
  }
  return seats;
}

export function isOtherSeat(seat: number, target: number | undefined): target is number {
  return target !== undefined && Number.isInteger(target) && target >= 0 && target < PLAYER_COUNT && target !== seat;
}

function isReal(placed: PlacedProperty): boolean {
  return placed.card.kind === 'property';
}

/** عقارات حقيقية مو داخل طقم كامل: تنسرق وتتبدل بالكروت العادية. */
export function stealableProperties(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => isReal(p) && !isSetComplete(player.properties, p.color));
}

/** جيكرات مو داخل طقم كامل: تنسرق بـ"بوق الجيكر". */
export function stealableJokers(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => p.card.kind === 'joker' && !isSetComplete(player.properties, p.color));
}

/** عقارات حقيقية داخل طقم كامل: تنأخذ بـ"ازاله". */
export function removableFromCompleteSets(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => isReal(p) && isSetComplete(player.properties, p.color));
}

/** إذا انكسر الطقم، مبانيه تصير بدون طقم (بدون تأثير) عند صاحبها. */
export function detachBrokenBuildings(player: PlayerState): PlayerState {
  return {
    ...player,
    buildings: player.buildings.map((b) =>
      b.color !== null && !isSetComplete(player.properties, b.color) ? { card: b.card, color: null } : b,
    ),
  };
}

/** يعلن الفائز: أول لاعب من القائمة كمّل العدد المطلوب من الأطقم الكاملة المختلفة. */
export function checkWin(state: GameState, ...seats: number[]): GameState {
  if (state.winner !== null) return state;
  for (const seat of seats) {
    if (completeColors(getPlayer(state, seat).properties).length >= state.winTarget) {
      return { ...state, winner: seat };
    }
  }
  return state;
}

/** يسحب عدد من الكروت ليد اللاعب. إذا خلصت كومة السحب تنخلط النار ويكمل السحب. */
export function drawCards(state: GameState, seat: number, wanted: number): GameState {
  let drawPile = state.drawPile.slice();
  let firePile = state.firePile.slice();
  let seed = state.seed;
  const drawn: Card[] = [];

  while (drawn.length < wanted) {
    if (drawPile.length === 0) {
      if (firePile.length === 0) break;
      const rng = createRng(seed);
      drawPile = shuffle(firePile, rng);
      firePile = [];
      seed = nextSeed(rng);
    }
    const card = drawPile.pop();
    if (!card) break;
    drawn.push(card);
  }

  const player = getPlayer(state, seat);
  return withPlayer({ ...state, drawPile, firePile, seed }, { ...player, hand: [...player.hand, ...drawn] });
}

/** ينقل عقارات من لاعب للاعب. اللون يبقى مثل ما هو إلا إذا انحدد لون جديد (للجيكر). */
export function transferProperties(
  state: GameState,
  fromSeat: number,
  toSeat: number,
  cardIds: readonly string[],
  newColor?: ColorId,
): GameState {
  const ids = new Set(cardIds);
  const from = getPlayer(state, fromSeat);
  const moving = from.properties.filter((p) => ids.has(p.card.id));
  const to = getPlayer(state, toSeat);

  const nextFrom = detachBrokenBuildings({ ...from, properties: from.properties.filter((p) => !ids.has(p.card.id)) });
  const nextTo: PlayerState = {
    ...to,
    properties: [...to.properties, ...moving.map((p) => ({ card: p.card, color: newColor ?? p.color }))],
  };
  return withPlayer(withPlayer(state, nextFrom), nextTo);
}

/** يضيف دين. اللي ما عنده شي يدفع فيه ما يدفع، فما ينضاف عليه دين. */
export function addDebt(state: GameState, from: number, to: number, amount: number): GameState {
  if (amount <= 0 || totalPayable(getPlayer(state, from)) <= 0) return state;
  const debt = { from, amount };

  if (state.pending === null) {
    return { ...state, pending: { to, debts: [debt] } };
  }
  if (state.pending.to === to) {
    return { ...state, pending: { to, debts: [...state.pending.debts, debt] } };
  }
  const index = state.pendingQueue.findIndex((p) => p.to === to);
  if (index >= 0) {
    return {
      ...state,
      pendingQueue: state.pendingQueue.map((p, i) => (i === index ? { to, debts: [...p.debts, debt] } : p)),
    };
  }
  return { ...state, pendingQueue: [...state.pendingQueue, { to, debts: [debt] }] };
}
