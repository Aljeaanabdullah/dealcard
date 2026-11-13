// محرك الدور الأساسي: (حالة، حركة) ← حالة جديدة، مع رفض الحركات المخالفة.
// المصدر: prd.md الأقسام 5.1 و 5.2 و 5.6، و plan.md المرحلة 2.
// دوال خالصة: بدون واجهة، بدون شبكة، بدون وقت النظام، وبدون عشوائية غير مبذورة.

import type { Card } from '../data/cards';
import { COLORS, type ColorId } from '../data/colors';
import {
  DRAW_PER_TURN,
  DRAW_WHEN_HAND_EMPTY,
  MAX_HAND_SIZE,
  MAX_PLAYS_PER_TURN,
  PLAYER_COUNT,
} from '../data/rules';
import { createRng, nextSeed, shuffle } from './rng';
import { completeColors } from './sets';
import type { GameState, PlayerState } from './state';

export type Move =
  | { readonly type: 'draw'; readonly seat: number }
  | { readonly type: 'playProperty'; readonly seat: number; readonly cardId: string }
  | { readonly type: 'playJoker'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'moveJoker'; readonly seat: number; readonly cardId: string; readonly color: ColorId }
  | { readonly type: 'bankMoney'; readonly seat: number; readonly cardId: string }
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
  | 'handOverLimit';

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

/** يعلن الفائز إذا صاحب الدور كمّل العدد المطلوب من الأطقم الكاملة المختلفة. */
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

  const next = withPlayer(countPlay(state), {
    ...player,
    properties: player.properties.map((p) => (p.card.id === cardId ? { card: p.card, color } : p)),
  });
  return { ok: true, state: checkWin(next, seat) };
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
    case 'discard':
      return discard(state, move.seat, move.cardId);
    case 'endTurn':
      return endTurn(state, move.seat);
  }
}

/** كل الحركات القانونية لصاحب الدور بالحالة الحالية. */
export function legalMoves(state: GameState): Move[] {
  if (state.winner !== null) return [];

  const seat = state.turn.seat;
  if (!state.turn.hasDrawn) return [{ type: 'draw', seat }];

  const player = getPlayer(state, seat);
  const moves: Move[] = [];

  if (checkCanPlay(state) === null) {
    for (const card of player.hand) {
      if (card.kind === 'property') {
        moves.push({ type: 'playProperty', seat, cardId: card.id });
      } else if (card.kind === 'money') {
        moves.push({ type: 'bankMoney', seat, cardId: card.id });
      } else if (card.kind === 'joker') {
        for (const color of COLORS) {
          moves.push({ type: 'playJoker', seat, cardId: card.id, color: color.id });
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
