// محرك اللعب: (حالة، حركة) ← حالة جديدة، مع رفض الحركات المخالفة.
// المصدر: prd.md الأقسام 5.1 إلى 5.8، و plan.md المرحلتين 2 و 3.
// دوال خالصة: بدون واجهة، بدون شبكة، بدون وقت النظام، وبدون عشوائية غير مبذورة.

import { ACTIONS, RENTS, type ActionDef, type Card, type RentDef } from '../data/cards';
import { COLORS, type ColorId } from '../data/colors';
import {
  DRAW_PER_TURN,
  DRAW_WHEN_HAND_EMPTY,
  MAX_HAND_SIZE,
  MAX_PLAYS_PER_TURN,
  PLAYER_COUNT,
} from '../data/rules';
import { isValidPayment, rentFor, rentForAllCompleteSets, suggestPayment, totalPayable } from './payment';
import { createRng, nextSeed, shuffle } from './rng';
import { completeColors, isSetComplete } from './sets';
import type { Debt, GameState, PlayerState } from './state';

export type Move =
  | { readonly type: 'draw'; readonly seat: number }
  | { readonly type: 'playProperty'; readonly seat: number; readonly cardId: string }
  | { readonly type: 'playJoker'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'moveJoker'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'bankMoney'; readonly seat: number; readonly cardId: string }
  | {
      readonly type: 'playRent';
      readonly seat: number;
      readonly cardId: string;
      readonly color: ColorId;
      /** مطلوب لكرت "شخص واحد" فقط */
      readonly targetSeat?: number;
      /** كرت "دوبل ايجار" ينلعب معه (اختياري، واحد فقط) */
      readonly doubleCardId?: string;
    }
  | { readonly type: 'playAction'; readonly seat: number; readonly cardId: string; readonly targetSeat?: number }
  | { readonly type: 'playBuilding'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'placeBuilding'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'pay'; readonly seat: number; readonly cardIds: readonly string[] }
  | { readonly type: 'discard'; readonly seat: number; readonly cardId: string }
  | { readonly type: 'endTurn'; readonly seat: number };

export type MoveError =
  | 'gameOver'
  | 'notYourTurn'
  | 'alreadyDrew'
  | 'mustDrawFirst'
  | 'noPlaysLeft'
  | 'discarding'
  | 'cardNotInHand'
  | 'wrongCardKind'
  | 'jokerNotOnTable'
  | 'sameColor'
  | 'handNotOverLimit'
  | 'handOverLimit'
  | 'paymentPending'
  | 'noPaymentDue'
  | 'invalidPayment'
  | 'invalidTarget'
  | 'colorNotAllowed'
  | 'noPropertyInColor'
  | 'setNotComplete'
  | 'buildingNotLoose'
  | 'noCompleteSet'
  | 'unsupportedAction';

export type MoveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: MoveError };

function fail(error: MoveError): MoveResult {
  return { ok: false, error };
}

function getPlayer(state: GameState, seat: number): PlayerState {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return player;
}

function withPlayer(state: GameState, player: PlayerState): GameState {
  return { ...state, players: state.players.map((p) => (p.seat === player.seat ? player : p)) };
}

function countPlay(state: GameState): GameState {
  return { ...state, turn: { ...state.turn, playsUsed: state.turn.playsUsed + 1 } };
}

function otherSeats(seat: number): number[] {
  const seats: number[] = [];
  for (let s = 0; s < PLAYER_COUNT; s++) {
    if (s !== seat) seats.push(s);
  }
  return seats;
}

function isOtherSeat(seat: number, target: number | undefined): target is number {
  return target !== undefined && Number.isInteger(target) && target >= 0 && target < PLAYER_COUNT && target !== seat;
}

/** إذا انكسر الطقم، مبانيه تصير بدون طقم (بدون تأثير) عند صاحبها. */
function detachBrokenBuildings(player: PlayerState): PlayerState {
  return {
    ...player,
    buildings: player.buildings.map((b) =>
      b.color !== null && !isSetComplete(player.properties, b.color) ? { card: b.card, color: null } : b,
    ),
  };
}

/** يعلن الفائز إذا اللاعب كمّل العدد المطلوب من الأطقم الكاملة المختلفة. */
function checkWin(state: GameState, seat: number): GameState {
  const sets = completeColors(getPlayer(state, seat).properties).length;
  return sets >= state.winTarget ? { ...state, winner: seat } : state;
}

/** فحوصات مشتركة لأي لعب كرت (ينحسب من الـ3). */
function checkCanPlay(state: GameState): MoveError | null {
  if (!state.turn.hasDrawn) return 'mustDrawFirst';
  if (state.turn.discarding) return 'discarding';
  if (state.turn.playsUsed >= MAX_PLAYS_PER_TURN) return 'noPlaysLeft';
  return null;
}

/** يبدأ دفع معلّق. اللي ما عنده شي يدفع فيه ما يدفع، فما ينضاف. */
function startPayment(state: GameState, to: number, debts: readonly Debt[]): GameState {
  const real = debts.filter((d) => d.amount > 0 && totalPayable(getPlayer(state, d.from)) > 0);
  return { ...state, pending: real.length > 0 ? { to, debts: real } : null };
}

function draw(state: GameState, seat: number): MoveResult {
  if (state.turn.hasDrawn) return fail('alreadyDrew');

  const player = getPlayer(state, seat);
  const wanted = player.hand.length === 0 ? DRAW_WHEN_HAND_EMPTY : DRAW_PER_TURN;

  let drawPile = state.drawPile.slice();
  let firePile = state.firePile.slice();
  let seed = state.seed;
  const drawn: Card[] = [];

  while (drawn.length < wanted) {
    if (drawPile.length === 0) {
      // خلصت كومة السحب: تنخلط النار وترجع كومة سحب، واللاعب يكمل سحبه.
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

  const next = withPlayer(
    { ...state, drawPile, firePile, seed, turn: { ...state.turn, hasDrawn: true } },
    { ...player, hand: [...player.hand, ...drawn] },
  );
  return { ok: true, state: next };
}

function playProperty(state: GameState, seat: number, cardId: string): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'property') return fail('wrongCardKind');

  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    properties: [...player.properties, { card, color: card.color }],
  });
  return { ok: true, state: checkWin(next, seat) };
}

function playJoker(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'joker') return fail('wrongCardKind');

  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    properties: [...player.properties, { card, color }],
  });
  return { ok: true, state: checkWin(next, seat) };
}

function moveJoker(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const placed = player.properties.find((p) => p.card.id === cardId && p.card.kind === 'joker');
  if (!placed) return fail('jokerNotOnTable');
  if (placed.color === color) return fail('sameColor');

  const moved = detachBrokenBuildings({
    ...player,
    properties: player.properties.map((p) => (p.card.id === cardId ? { card: p.card, color } : p)),
  });
  return { ok: true, state: checkWin(withPlayer(countPlay(state), moved), seat) };
}

function bankMoney(state: GameState, seat: number, cardId: string): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'money') return fail('wrongCardKind');

  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    bank: [...player.bank, card],
  });
  return { ok: true, state: next };
}

function playRent(
  state: GameState,
  seat: number,
  cardId: string,
  color: ColorId,
  targetSeat: number | undefined,
  doubleCardId: string | undefined,
): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'rent') return fail('wrongCardKind');

  const def: RentDef | undefined = RENTS.find((d) => d.id === card.rent);
  if (!def) return fail('wrongCardKind');
  if (def.colors !== 'any' && !def.colors.includes(color)) return fail('colorNotAllowed');

  const rent = rentFor(player, color);
  if (rent <= 0) return fail('noPropertyInColor');

  const played: Card[] = [card];
  let amount = rent;
  if (doubleCardId !== undefined) {
    const double = player.hand.find((c) => c.id === doubleCardId);
    if (!double) return fail('cardNotInHand');
    if (double.kind !== 'action' || double.action !== 'doubleRent') return fail('wrongCardKind');
    played.push(double);
    amount = rent * 2;
  }

  let payers: number[];
  if (def.payer === 'one') {
    if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
    payers = [targetSeat];
  } else {
    payers = otherSeats(seat);
  }

  const playedIds = new Set(played.map((c) => c.id));
  // "دوبل ايجار" ما ينحسب من الـ3 كروت: ينحسب كرت الإيجار فقط.
  const next = withPlayer(
    { ...countPlay(state), firePile: [...state.firePile, ...played] },
    { ...player, hand: player.hand.filter((c) => !playedIds.has(c.id)) },
  );
  return {
    ok: true,
    state: startPayment(
      next,
      seat,
      payers.map((from) => ({ from, amount })),
    ),
  };
}

function playAction(state: GameState, seat: number, cardId: string, targetSeat: number | undefined): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'action') return fail('wrongCardKind');

  const def: ActionDef | undefined = ACTIONS.find((d) => d.id === card.action);
  let debts: Debt[];

  switch (card.action) {
    case 'qarqash':
    case 'qardIskan': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      debts = [{ from: targetSeat, amount: def?.amount ?? 0 }];
      break;
    }
    case 'eyadi': {
      debts = otherSeats(seat).map((from) => ({ from, amount: def?.amount ?? 0 }));
      break;
    }
    case 'tathmeen': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const amount = rentForAllCompleteSets(player);
      if (amount <= 0) return fail('noCompleteSet');
      debts = [{ from: targetSeat, amount }];
      break;
    }
    default:
      // بقية كروت الأكشن تنضاف في المرحلتين 4 و 5.
      return fail('unsupportedAction');
  }

  const next = withPlayer(
    { ...countPlay(state), firePile: [...state.firePile, card] },
    { ...player, hand: player.hand.filter((c) => c.id !== cardId) },
  );
  return { ok: true, state: startPayment(next, seat, debts) };
}

function playBuilding(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'building') return fail('wrongCardKind');
  if (!isSetComplete(player.properties, color)) return fail('setNotComplete');

  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    buildings: [...player.buildings, { card, color }],
  });
  return { ok: true, state: next };
}

function placeBuilding(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const placed = player.buildings.find((b) => b.card.id === cardId);
  if (!placed || placed.color !== null) return fail('buildingNotLoose');
  if (!isSetComplete(player.properties, color)) return fail('setNotComplete');

  const next = withPlayer(countPlay(state), {
    ...player,
    buildings: player.buildings.map((b) => (b.card.id === cardId ? { card: b.card, color } : b)),
  });
  return { ok: true, state: next };
}

function pay(state: GameState, seat: number, cardIds: readonly string[]): MoveResult {
  const pending = state.pending;
  const debt = pending?.debts.find((d) => d.from === seat);
  if (!pending || !debt) return fail('noPaymentDue');

  const payer = getPlayer(state, seat);
  if (!isValidPayment(payer, debt.amount, cardIds)) return fail('invalidPayment');

  const ids = new Set(cardIds);
  const money = payer.bank.filter((c) => ids.has(c.id));
  const buildings = payer.buildings.filter((b) => ids.has(b.card.id));
  const properties = payer.properties.filter((p) => ids.has(p.card.id));

  const paid = detachBrokenBuildings({
    ...payer,
    bank: payer.bank.filter((c) => !ids.has(c.id)),
    buildings: payer.buildings.filter((b) => !ids.has(b.card.id)),
    properties: payer.properties.filter((p) => !ids.has(p.card.id)),
  });

  const receiver = getPlayer(state, pending.to);
  const received: PlayerState = {
    ...receiver,
    bank: [...receiver.bank, ...money],
    // المبنى المدفوع يروح للمستلم بدون طقم (بدون تأثير).
    buildings: [...receiver.buildings, ...buildings.map((b) => ({ card: b.card, color: null }))],
    properties: [...receiver.properties, ...properties],
  };

  const debts = pending.debts.filter((d) => d.from !== seat);
  const next = withPlayer(
    withPlayer({ ...state, pending: debts.length > 0 ? { to: pending.to, debts } : null }, paid),
    received,
  );
  return { ok: true, state: checkWin(next, pending.to) };
}

function discard(state: GameState, seat: number, cardId: string): MoveResult {
  if (!state.turn.hasDrawn) return fail('mustDrawFirst');

  const player = getPlayer(state, seat);
  if (player.hand.length <= MAX_HAND_SIZE) return fail('handNotOverLimit');
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');

  const next = withPlayer(
    { ...state, firePile: [...state.firePile, card], turn: { ...state.turn, discarding: true } },
    { ...player, hand: player.hand.filter((c) => c.id !== cardId) },
  );
  return { ok: true, state: next };
}

function endTurn(state: GameState, seat: number): MoveResult {
  if (!state.turn.hasDrawn) return fail('mustDrawFirst');
  if (getPlayer(state, seat).hand.length > MAX_HAND_SIZE) return fail('handOverLimit');

  const nextSeat = (seat + 1) % PLAYER_COUNT;
  return {
    ok: true,
    state: { ...state, turn: { seat: nextSeat, hasDrawn: false, playsUsed: 0, discarding: false } },
  };
}

/** يطبّق حركة على الحالة. يرجّع الحالة الجديدة، أو سبب الرفض بدون تغيير الحالة. */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (state.winner !== null) return fail('gameOver');

  // الدفع ينلعب خارج الدور، واللعب يوقف لين يخلص كل الدفع المعلّق.
  if (move.type === 'pay') return pay(state, move.seat, move.cardIds);
  if (state.pending !== null) return fail('paymentPending');
  if (move.seat !== state.turn.seat) return fail('notYourTurn');

  switch (move.type) {
    case 'draw':
      return draw(state, move.seat);
    case 'playProperty':
      return playProperty(state, move.seat, move.cardId);
    case 'playJoker':
      return playJoker(state, move.seat, move.cardId, move.color);
    case 'moveJoker':
      return moveJoker(state, move.seat, move.cardId, move.color);
    case 'bankMoney':
      return bankMoney(state, move.seat, move.cardId);
    case 'playRent':
      return playRent(state, move.seat, move.cardId, move.color, move.targetSeat, move.doubleCardId);
    case 'playAction':
      return playAction(state, move.seat, move.cardId, move.targetSeat);
    case 'playBuilding':
      return playBuilding(state, move.seat, move.cardId, move.color);
    case 'placeBuilding':
      return placeBuilding(state, move.seat, move.cardId, move.color);
    case 'discard':
      return discard(state, move.seat, move.cardId);
    case 'endTurn':
      return endTurn(state, move.seat);
  }
}

/**
 * الحركات القانونية بالحالة الحالية.
 * إذا فيه دفع معلّق: حركة دفع جاهزة لكل مديون. غير كذا: حركات صاحب الدور.
 */
export function legalMoves(state: GameState): Move[] {
  if (state.winner !== null) return [];

  if (state.pending !== null) {
    return state.pending.debts.map((debt) => ({
      type: 'pay',
      seat: debt.from,
      cardIds: suggestPayment(getPlayer(state, debt.from), debt.amount),
    }));
  }

  const seat = state.turn.seat;
  if (!state.turn.hasDrawn) return [{ type: 'draw', seat }];

  const player = getPlayer(state, seat);
  const moves: Move[] = [];

  if (checkCanPlay(state) === null) {
    const complete = completeColors(player.properties);
    const double = player.hand.find((c) => c.kind === 'action' && c.action === 'doubleRent');

    for (const card of player.hand) {
      if (card.kind === 'property') {
        moves.push({ type: 'playProperty', seat, cardId: card.id });
      } else if (card.kind === 'money') {
        moves.push({ type: 'bankMoney', seat, cardId: card.id });
      } else if (card.kind === 'joker') {
        for (const color of COLORS) {
          moves.push({ type: 'playJoker', seat, cardId: card.id, color: color.id });
        }
      } else if (card.kind === 'building') {
        for (const color of complete) {
          moves.push({ type: 'playBuilding', seat, cardId: card.id, color });
        }
      } else if (card.kind === 'rent') {
        const def: RentDef | undefined = RENTS.find((d) => d.id === card.rent);
        if (!def) continue;
        const colors = def.colors === 'any' ? COLORS.map((c) => c.id) : def.colors;
        const targets: (number | undefined)[] = def.payer === 'one' ? otherSeats(seat) : [undefined];
        for (const color of colors) {
          if (rentFor(player, color) <= 0) continue;
          for (const targetSeat of targets) {
            const base = { type: 'playRent' as const, seat, cardId: card.id, color };
            const withTarget = targetSeat === undefined ? base : { ...base, targetSeat };
            moves.push(withTarget);
            if (double) moves.push({ ...withTarget, doubleCardId: double.id });
          }
        }
      } else if (card.kind === 'action') {
        if (card.action === 'eyadi') {
          moves.push({ type: 'playAction', seat, cardId: card.id });
        } else if (
          card.action === 'qarqash' ||
          card.action === 'qardIskan' ||
          (card.action === 'tathmeen' && complete.length > 0)
        ) {
          for (const targetSeat of otherSeats(seat)) {
            moves.push({ type: 'playAction', seat, cardId: card.id, targetSeat });
          }
        }
      }
    }

    for (const placed of player.properties) {
      if (placed.card.kind !== 'joker') continue;
      for (const color of COLORS) {
        if (color.id !== placed.color) {
          moves.push({ type: 'moveJoker', seat, cardId: placed.card.id, color: color.id });
        }
      }
    }

    for (const building of player.buildings) {
      if (building.color !== null) continue;
      for (const color of complete) {
        moves.push({ type: 'placeBuilding', seat, cardId: building.card.id, color });
      }
    }
  }

  if (player.hand.length > MAX_HAND_SIZE) {
    for (const card of player.hand) {
      moves.push({ type: 'discard', seat, cardId: card.id });
    }
  } else {
    moves.push({ type: 'endTurn', seat });
  }

  return moves;
}
