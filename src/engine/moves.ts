// محرك اللعب: (حالة، حركة) ← حالة جديدة، مع رفض الحركات المخالفة.
// المصدر: prd.md الأقسام 5.1 إلى 5.8، و plan.md المراحل 2 إلى 4.
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
import type { Debt, GameState, PlacedProperty, PlayerState } from './state';

/** حرق كرت من يد لاعب بدون رؤية: المقعد وترتيب الكرت باليد. */
export interface BlindPick {
  readonly seat: number;
  readonly handIndex: number;
}

export interface PlayActionMove {
  readonly type: 'playAction';
  readonly seat: number;
  readonly cardId: string;
  /** اللاعب المستهدف */
  readonly targetSeat?: number;
  /** عقارات (أو جيكر) عند المستهدف */
  readonly targetCardIds?: readonly string[];
  /** عقار من عندي (لكرت "بدل") */
  readonly ownCardId?: string;
  /** لون الطقم عند المستهدف، أو اللون اللي ينحط فيه الجيكر المسروق */
  readonly color?: ColorId;
  /** لون طقمي الكامل (لكرت "اندبس") */
  readonly ownColor?: ColorId;
  /** ترتيب الكرت بيد المستهدف (لكرت "ورثتك") */
  readonly handIndex?: number;
  /** الكروت المحروقة (لكرت "مخالفه") */
  readonly burns?: readonly BlindPick[];
}

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
  | PlayActionMove
  | { readonly type: 'burnAction'; readonly seat: number; readonly cardId: string }
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
  | 'invalidCard'
  | 'colorRequired'
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

function done(state: GameState): MoveResult {
  return { ok: true, state };
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

function isReal(placed: PlacedProperty): boolean {
  return placed.card.kind === 'property';
}

/** عقارات حقيقية مو داخل طقم كامل: تنسرق وتتبدل بالكروت العادية. */
function stealableProperties(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => isReal(p) && !isSetComplete(player.properties, p.color));
}

/** جيكرات مو داخل طقم كامل: تنسرق بـ"بوق الجيكر". */
function stealableJokers(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => p.card.kind === 'joker' && !isSetComplete(player.properties, p.color));
}

/** عقارات حقيقية داخل طقم كامل: تنأخذ بـ"ازاله". */
function removableFromCompleteSets(player: PlayerState): PlacedProperty[] {
  return player.properties.filter((p) => isReal(p) && isSetComplete(player.properties, p.color));
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

/** يعلن الفائز: أول لاعب من القائمة كمّل العدد المطلوب من الأطقم الكاملة المختلفة. */
function checkWin(state: GameState, ...seats: number[]): GameState {
  for (const seat of seats) {
    if (completeColors(getPlayer(state, seat).properties).length >= state.winTarget) {
      return { ...state, winner: seat };
    }
  }
  return state;
}

/** فحوصات مشتركة لأي لعب كرت ينحسب من كروت الدور. */
function checkCanPlay(state: GameState): MoveError | null {
  if (!state.turn.hasDrawn) return 'mustDrawFirst';
  if (state.turn.discarding) return 'discarding';
  if (state.turn.playsUsed >= MAX_PLAYS_PER_TURN + state.extraPlays) return 'noPlaysLeft';
  return null;
}

/** يبدأ دفع معلّق. اللي ما عنده شي يدفع فيه ما يدفع، فما ينضاف. */
function startPayment(state: GameState, to: number, debts: readonly Debt[]): GameState {
  const real = debts.filter((d) => d.amount > 0 && totalPayable(getPlayer(state, d.from)) > 0);
  return { ...state, pending: real.length > 0 ? { to, debts: real } : null };
}

/** يسحب عدد من الكروت ليد اللاعب. إذا خلصت كومة السحب تنخلط النار ويكمل السحب. */
function drawCards(state: GameState, seat: number, wanted: number): GameState {
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
function transferProperties(
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

function draw(state: GameState, seat: number): MoveResult {
  if (state.turn.hasDrawn) return fail('alreadyDrew');
  const wanted = getPlayer(state, seat).hand.length === 0 ? DRAW_WHEN_HAND_EMPTY : DRAW_PER_TURN;
  const next = drawCards(state, seat, wanted);
  return done({ ...next, turn: { ...next.turn, hasDrawn: true } });
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
  return done(checkWin(next, seat));
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
  return done(checkWin(next, seat));
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
  return done(checkWin(withPlayer(countPlay(state), moved), seat));
}

function bankMoney(state: GameState, seat: number, cardId: string): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'money') return fail('wrongCardKind');

  return done(
    withPlayer(countPlay(state), {
      ...player,
      hand: player.hand.filter((c) => c.id !== cardId),
      bank: [...player.bank, card],
    }),
  );
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
  // "دوبل ايجار" ما ينحسب من كروت الدور: ينحسب كرت الإيجار فقط.
  const next = withPlayer(
    { ...countPlay(state), firePile: [...state.firePile, ...played] },
    { ...player, hand: player.hand.filter((c) => !playedIds.has(c.id)) },
  );
  return done(
    startPayment(
      next,
      seat,
      payers.map((from) => ({ from, amount })),
    ),
  );
}

function playAction(state: GameState, move: PlayActionMove): MoveResult {
  const { seat, cardId, targetSeat } = move;
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const owner = getPlayer(state, seat);
  const card = owner.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'action') return fail('wrongCardKind');

  const def: ActionDef | undefined = ACTIONS.find((d) => d.id === card.action);

  // الحالة بعد لعب الكرت: يطلع من اليد للنار. "زايد لعبه" ما ينحسب من كروت الدور.
  const counted = card.action === 'extraPlay' ? state : countPlay(state);
  const base = withPlayer(
    { ...counted, firePile: [...state.firePile, card] },
    { ...owner, hand: owner.hand.filter((c) => c.id !== cardId) },
  );
  const me = getPlayer(base, seat);
  const targetIds = move.targetCardIds ?? [];

  switch (card.action) {
    // ---------- كروت الدفع ----------
    case 'qarqash':
    case 'qardIskan': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      return done(startPayment(base, seat, [{ from: targetSeat, amount: def?.amount ?? 0 }]));
    }
    case 'eyadi': {
      const debts = otherSeats(seat).map((from) => ({ from, amount: def?.amount ?? 0 }));
      return done(startPayment(base, seat, debts));
    }
    case 'tathmeen': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const amount = rentForAllCompleteSets(me);
      if (amount <= 0) return fail('noCompleteSet');
      return done(startPayment(base, seat, [{ from: targetSeat, amount }]));
    }

    // ---------- كروت السرقة والتبديل ----------
    case 'boog':
    case 'boogDouble': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const stealable = stealableProperties(getPlayer(base, targetSeat));
      // "دبل" يسرق عقارين، وإذا ما فيه إلا واحد ينسرق يسرق الواحد.
      const needed = card.action === 'boog' ? 1 : Math.min(2, stealable.length);
      if (needed === 0 || targetIds.length !== needed || new Set(targetIds).size !== needed) return fail('invalidCard');
      if (!targetIds.every((id) => stealable.some((p) => p.card.id === id))) return fail('invalidCard');
      return done(checkWin(transferProperties(base, targetSeat, seat, targetIds), seat));
    }
    case 'boogJoker': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const jokers = stealableJokers(getPlayer(base, targetSeat));
      const jokerId = targetIds[0];
      if (targetIds.length !== 1 || !jokers.some((p) => p.card.id === jokerId)) return fail('invalidCard');
      if (move.color === undefined) return fail('colorRequired');
      return done(checkWin(transferProperties(base, targetSeat, seat, targetIds, move.color), seat));
    }
    case 'baddel': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const theirId = targetIds[0];
      const ownId = move.ownCardId;
      if (targetIds.length !== 1 || ownId === undefined) return fail('invalidCard');
      if (!stealableProperties(getPlayer(base, targetSeat)).some((p) => p.card.id === theirId)) return fail('invalidCard');
      if (!stealableProperties(me).some((p) => p.card.id === ownId)) return fail('invalidCard');
      const swapped = transferProperties(transferProperties(base, targetSeat, seat, targetIds), seat, targetSeat, [ownId]);
      return done(checkWin(swapped, seat, targetSeat));
    }
    case 'rahatAlek': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const color = move.color;
      if (color === undefined) return fail('colorRequired');
      const target = getPlayer(base, targetSeat);
      if (!isSetComplete(target.properties, color)) return fail('setNotComplete');
      // الطقم ينتقل كامل: عقاراته والجيكر اللي فيه ومبانيه.
      const next = withPlayer(
        withPlayer(base, {
          ...target,
          properties: target.properties.filter((p) => p.color !== color),
          buildings: target.buildings.filter((b) => b.color !== color),
        }),
        {
          ...me,
          properties: [...me.properties, ...target.properties.filter((p) => p.color === color)],
          buildings: [...me.buildings, ...target.buildings.filter((b) => b.color === color)],
        },
      );
      return done(checkWin(next, seat));
    }
    case 'endebes': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const mine = move.ownColor;
      const theirs = move.color;
      if (mine === undefined || theirs === undefined) return fail('colorRequired');
      if (!isSetComplete(me.properties, mine)) return fail('noCompleteSet');
      const target = getPlayer(base, targetSeat);
      if (!isSetComplete(target.properties, theirs)) return fail('setNotComplete');
      const nextMe = detachBrokenBuildings({
        ...me,
        properties: [...me.properties.filter((p) => p.color !== mine), ...target.properties.filter((p) => p.color === theirs)],
        buildings: [...me.buildings.filter((b) => b.color !== mine), ...target.buildings.filter((b) => b.color === theirs)],
      });
      const nextTarget = detachBrokenBuildings({
        ...target,
        properties: [...target.properties.filter((p) => p.color !== theirs), ...me.properties.filter((p) => p.color === mine)],
        buildings: [...target.buildings.filter((b) => b.color !== theirs), ...me.buildings.filter((b) => b.color === mine)],
      });
      return done(checkWin(withPlayer(withPlayer(base, nextMe), nextTarget), seat, targetSeat));
    }
    case 'ezalah': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const removable = removableFromCompleteSets(getPlayer(base, targetSeat));
      const removeId = targetIds[0];
      if (targetIds.length !== 1 || !removable.some((p) => p.card.id === removeId)) return fail('invalidCard');
      return done(checkWin(transferProperties(base, targetSeat, seat, targetIds), seat));
    }
    case 'etHas': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const target = getPlayer(base, targetSeat);
      return done(withPlayer(withPlayer(base, { ...me, hand: target.hand }), { ...target, hand: me.hand }));
    }
    case 'werathtek': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      const target = getPlayer(base, targetSeat);
      const taken = move.handIndex === undefined ? undefined : target.hand[move.handIndex];
      if (!taken) return fail('invalidCard');
      return done(
        withPlayer(
          withPlayer(base, { ...target, hand: target.hand.filter((c) => c.id !== taken.id) }),
          { ...me, hand: [...me.hand, taken] },
        ),
      );
    }
    case 'mukhalafah': {
      const burns = move.burns ?? [];
      const available = otherSeats(seat).filter((s) => getPlayer(base, s).hand.length > 0);
      // تنلعب على المتوفر: لاعبين إذا موجودين، أو واحد إذا ما فيه غيره بيده كروت.
      const needed = Math.min(2, available.length);
      if (needed === 0) return fail('invalidTarget');
      if (burns.length !== needed || new Set(burns.map((b) => b.seat)).size !== needed) return fail('invalidTarget');

      let next = base;
      for (const burn of burns) {
        if (!available.includes(burn.seat)) return fail('invalidTarget');
        const target = getPlayer(next, burn.seat);
        const burned = target.hand[burn.handIndex];
        if (!burned) return fail('invalidCard');
        next = withPlayer(
          { ...next, firePile: [...next.firePile, burned] },
          { ...target, hand: target.hand.filter((c) => c.id !== burned.id) },
        );
      }
      return done(next);
    }

    // ---------- كروت الدور واليد ----------
    case 'draw2':
      return done(drawCards(base, seat, DRAW_PER_TURN));
    case 'extraPlay':
      return done({ ...base, extraPlays: base.extraPlays + 1 });
    case 'estareeh': {
      if (!isOtherSeat(seat, targetSeat) || base.skips.includes(targetSeat)) return fail('invalidTarget');
      return done({ ...base, skips: [...base.skips, targetSeat] });
    }
    case 'ekshef': {
      if (!isOtherSeat(seat, targetSeat)) return fail('invalidTarget');
      return done({ ...base, revealed: { viewer: seat, target: targetSeat } });
    }

    default:
      // "دوبل ايجار" ينلعب مع كرت إيجار فقط، وكروت الرد و"طب وتخير" تنضاف في المرحلة 5.
      return fail('unsupportedAction');
  }
}

/** حرق كرت أكشن: ينرمي بالنار بدون تنفيذ، وينحسب من كروت الدور. */
function burnAction(state: GameState, seat: number, cardId: string): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'action') return fail('wrongCardKind');

  return done(
    withPlayer(
      { ...countPlay(state), firePile: [...state.firePile, card] },
      { ...player, hand: player.hand.filter((c) => c.id !== cardId) },
    ),
  );
}

function playBuilding(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'building') return fail('wrongCardKind');
  if (!isSetComplete(player.properties, color)) return fail('setNotComplete');

  return done(
    withPlayer(countPlay(state), {
      ...player,
      hand: player.hand.filter((c) => c.id !== cardId),
      buildings: [...player.buildings, { card, color }],
    }),
  );
}

function placeBuilding(state: GameState, seat: number, cardId: string, color: ColorId): MoveResult {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const player = getPlayer(state, seat);
  const placed = player.buildings.find((b) => b.card.id === cardId);
  if (!placed || placed.color !== null) return fail('buildingNotLoose');
  if (!isSetComplete(player.properties, color)) return fail('setNotComplete');

  return done(
    withPlayer(countPlay(state), {
      ...player,
      buildings: player.buildings.map((b) => (b.card.id === cardId ? { card: b.card, color } : b)),
    }),
  );
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
  return done(checkWin(next, pending.to));
}

function discard(state: GameState, seat: number, cardId: string): MoveResult {
  if (!state.turn.hasDrawn) return fail('mustDrawFirst');

  const player = getPlayer(state, seat);
  if (player.hand.length <= MAX_HAND_SIZE) return fail('handNotOverLimit');
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');

  return done(
    withPlayer(
      { ...state, firePile: [...state.firePile, card], turn: { ...state.turn, discarding: true } },
      { ...player, hand: player.hand.filter((c) => c.id !== cardId) },
    ),
  );
}

function endTurn(state: GameState, seat: number): MoveResult {
  if (!state.turn.hasDrawn) return fail('mustDrawFirst');
  if (getPlayer(state, seat).hand.length > MAX_HAND_SIZE) return fail('handOverLimit');

  // اللاعب اللي عليه "استريح" دوره يتفوّت: ما يسحب ولا يلعب.
  let nextSeat = (seat + 1) % PLAYER_COUNT;
  let skips = state.skips;
  for (let i = 0; i < PLAYER_COUNT && skips.includes(nextSeat); i++) {
    const skipped = nextSeat;
    skips = skips.filter((s) => s !== skipped);
    nextSeat = (nextSeat + 1) % PLAYER_COUNT;
  }

  return done({
    ...state,
    skips,
    extraPlays: 0,
    revealed: null,
    turn: { seat: nextSeat, hasDrawn: false, playsUsed: 0, discarding: false },
  });
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
      return playAction(state, move);
    case 'burnAction':
      return burnAction(state, move.seat, move.cardId);
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

/** كل الأزواج من قائمة. */
function pairs<T>(items: readonly T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      result.push([items[i] as T, items[j] as T]);
    }
  }
  return result;
}

/** الحركات القانونية لكرت أكشن واحد باليد. */
function actionMoves(state: GameState, player: PlayerState, card: Card & { kind: 'action' }): Move[] {
  const seat = player.seat;
  const base = { type: 'playAction' as const, seat, cardId: card.id };
  const others = otherSeats(seat);
  const moves: Move[] = [];

  switch (card.action) {
    case 'eyadi':
    case 'draw2':
    case 'extraPlay':
      moves.push(base);
      break;
    case 'qarqash':
    case 'qardIskan':
    case 'etHas':
    case 'ekshef':
      for (const targetSeat of others) moves.push({ ...base, targetSeat });
      break;
    case 'tathmeen':
      if (completeColors(player.properties).length > 0) {
        for (const targetSeat of others) moves.push({ ...base, targetSeat });
      }
      break;
    case 'estareeh':
      for (const targetSeat of others) {
        if (!state.skips.includes(targetSeat)) moves.push({ ...base, targetSeat });
      }
      break;
    case 'boog':
      for (const targetSeat of others) {
        for (const p of stealableProperties(getPlayer(state, targetSeat))) {
          moves.push({ ...base, targetSeat, targetCardIds: [p.card.id] });
        }
      }
      break;
    case 'boogDouble':
      for (const targetSeat of others) {
        const stealable = stealableProperties(getPlayer(state, targetSeat));
        if (stealable.length === 1) {
          moves.push({ ...base, targetSeat, targetCardIds: stealable.map((p) => p.card.id) });
        }
        for (const [a, b] of pairs(stealable)) {
          moves.push({ ...base, targetSeat, targetCardIds: [a.card.id, b.card.id] });
        }
      }
      break;
    case 'boogJoker':
      for (const targetSeat of others) {
        for (const p of stealableJokers(getPlayer(state, targetSeat))) {
          for (const color of COLORS) {
            moves.push({ ...base, targetSeat, targetCardIds: [p.card.id], color: color.id });
          }
        }
      }
      break;
    case 'baddel':
      for (const targetSeat of others) {
        for (const theirs of stealableProperties(getPlayer(state, targetSeat))) {
          for (const mine of stealableProperties(player)) {
            moves.push({ ...base, targetSeat, targetCardIds: [theirs.card.id], ownCardId: mine.card.id });
          }
        }
      }
      break;
    case 'rahatAlek':
      for (const targetSeat of others) {
        for (const color of completeColors(getPlayer(state, targetSeat).properties)) {
          moves.push({ ...base, targetSeat, color });
        }
      }
      break;
    case 'endebes':
      for (const ownColor of completeColors(player.properties)) {
        for (const targetSeat of others) {
          for (const color of completeColors(getPlayer(state, targetSeat).properties)) {
            moves.push({ ...base, targetSeat, color, ownColor });
          }
        }
      }
      break;
    case 'ezalah':
      for (const targetSeat of others) {
        for (const p of removableFromCompleteSets(getPlayer(state, targetSeat))) {
          moves.push({ ...base, targetSeat, targetCardIds: [p.card.id] });
        }
      }
      break;
    case 'werathtek':
      for (const targetSeat of others) {
        getPlayer(state, targetSeat).hand.forEach((_, handIndex) => {
          moves.push({ ...base, targetSeat, handIndex });
        });
      }
      break;
    case 'mukhalafah': {
      const available = others.filter((s) => getPlayer(state, s).hand.length > 0);
      const picks = (s: number): BlindPick[] => getPlayer(state, s).hand.map((_, handIndex) => ({ seat: s, handIndex }));
      if (available.length === 1) {
        for (const pick of picks(available[0] as number)) moves.push({ ...base, burns: [pick] });
      }
      for (const [a, b] of pairs(available)) {
        for (const first of picks(a)) {
          for (const second of picks(b)) moves.push({ ...base, burns: [first, second] });
        }
      }
      break;
    }
    default:
      break;
  }
  return moves;
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
        moves.push(...actionMoves(state, player, card));
        moves.push({ type: 'burnAction', seat, cardId: card.id });
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
