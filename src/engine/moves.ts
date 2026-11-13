// محرك اللعب: (حالة، حركة) ← حالة جديدة، مع رفض الحركات المخالفة.
// المصدر: prd.md الأقسام 5.1 إلى 5.8، و plan.md المراحل 2 إلى 5.
// دوال خالصة: بدون واجهة، بدون شبكة، بدون وقت النظام، وبدون عشوائية غير مبذورة.

import { ACTIONS, RENTS, type ActionDef, type ActionId, type Card, type RentDef } from '../data/cards';
import { COLORS, type ColorId } from '../data/colors';
import {
  DRAW_PER_TURN,
  DRAW_WHEN_HAND_EMPTY,
  MAX_HAND_SIZE,
  MAX_PLAYS_PER_TURN,
  PLAYER_COUNT,
} from '../data/rules';
import {
  checkWin,
  detachBrokenBuildings,
  drawCards,
  getPlayer,
  isOtherSeat,
  otherSeats,
  withPlayer,
} from './core';
import { applyEffect, CHOICE_ACTIONS, effectOptions, SWAP_ACTIONS } from './effects';
import { isValidPayment, rentFor, rentForAllCompleteSets, suggestPayment } from './payment';
import { done, fail, type MoveError, type MoveResult } from './result';
import { completeColors, isSetComplete } from './sets';
import type {
  Effect,
  EffectParams,
  GameState,
  PendingPayment,
  PlayerState,
  ResponseKind,
  ResponseWindow,
  StandingResponse,
} from './state';

export type { MoveError, MoveResult } from './result';

/** اختيار كرت من يد لاعب بدون رؤية: المقعد وترتيب الكرت باليد. */
export interface BlindPick {
  readonly seat: number;
  readonly handIndex: number;
}

export interface PlayActionMove {
  readonly type: 'playAction';
  readonly seat: number;
  readonly cardId: string;
  /** لكرت "طب وتخير": الأكشن اللي يصيره */
  readonly asAction?: ActionId;
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

/** اختيار صاحب "حيور": وش ياخذ من صاحب الأكشن. */
export interface BounceChoice {
  readonly targetCardIds?: readonly string[];
  readonly color?: ColorId;
  /** ترتيب الكرت بيد صاحب الأكشن (ورثتك، مخالفه) */
  readonly handIndex?: number;
}

export interface RespondMove {
  readonly type: 'respond';
  readonly seat: number;
  /** كرت الرد. بدون كرت = "ما أرد". */
  readonly cardId?: string;
  /** لكرت "طب وتخير": كرت الرد اللي يصيره */
  readonly as?: ResponseKind;
  /** لكرت "ادفعلي ايجاري": اللاعب اللي يدفع عني */
  readonly payerSeat?: number;
  /** لكرت "حيور" ضد السرقة: وش آخذ من صاحب الأكشن */
  readonly bounce?: BounceChoice;
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
  | RespondMove
  | { readonly type: 'pay'; readonly seat: number; readonly cardIds: readonly string[] }
  | { readonly type: 'discard'; readonly seat: number; readonly cardId: string }
  | { readonly type: 'endTurn'; readonly seat: number };

const RESPONSE_KINDS: readonly ResponseKind[] = ['malekAmal', 'hayyour', 'fazaah', 'maTshoofShar', 'edfaaliEjari'];

function isResponseKind(value: string | undefined): value is ResponseKind {
  return value !== undefined && (RESPONSE_KINDS as readonly string[]).includes(value);
}

function countPlay(state: GameState): GameState {
  return { ...state, turn: { ...state.turn, playsUsed: state.turn.playsUsed + 1 } };
}

/** فحوصات مشتركة لأي لعب كرت ينحسب من كروت الدور. */
function checkCanPlay(state: GameState): MoveError | null {
  if (!state.turn.hasDrawn) return 'mustDrawFirst';
  if (state.turn.discarding) return 'discarding';
  if (state.turn.playsUsed >= MAX_PLAYS_PER_TURN + state.extraPlays) return 'noPlaysLeft';
  return null;
}

// ===================== نوافذ الرد =====================

/** كروت الرد المسموحة للاعب بنافذة معيّنة حسب دوره فيها. */
function allowedResponses(state: GameState, window: ResponseWindow, seat: number): ResponseKind[] {
  const { effect } = window;
  if (seat === effect.actor) return [];
  if (seat === effect.target) {
    const kinds: ResponseKind[] = effect.isRent ? ['malekAmal', 'hayyour', 'maTshoofShar', 'edfaaliEjari'] : ['malekAmal', 'hayyour'];
    // "حيور" يعتبر أكشن على صاحب الأكشن: ما ينلعب إذا هو محمي بـ"حصانه".
    return state.immune.includes(effect.actor) ? kinds.filter((k) => k !== 'hayyour') : kinds;
  }
  // لاعب ثالث: يفزع للمستهدف.
  return ['fazaah'];
}

/** هل بيد اللاعب كرت ينلعب كواحد من هالردود؟ ("طب وتخير" يصير أي رد) */
function holdsResponse(player: PlayerState, kinds: readonly ResponseKind[]): boolean {
  if (kinds.length === 0) return false;
  return player.hand.some(
    (c) => c.kind === 'action' && (c.action === 'tebWetkhayyar' || (kinds as readonly string[]).includes(c.action)),
  );
}

/** اللاعبين اللي نستنى ردهم بجولة الدفاع: عندهم كرت رد وما قالوا "ما أرد". */
function defenders(state: GameState, window: ResponseWindow): number[] {
  return state.players
    .map((p) => p.seat)
    .filter(
      (seat) => !window.passed.includes(seat) && holdsResponse(getPlayer(state, seat), allowedResponses(state, window, seat)),
    );
}

function actorCanCounter(state: GameState, actor: number): boolean {
  return holdsResponse(getPlayer(state, actor), ['malekAmal']);
}

/** ينفذ التأثير، وإذا صار ما ينفذ (تغيّرت الحالة) يطوف بدون أثر. */
function applyOrFizzle(state: GameState, effect: Effect): GameState {
  const result = applyEffect(state, effect);
  return result.ok ? result.state : state;
}

/** يمشّي التأثيرات المنتظرة: يفتح نافذة رد إذا فيه أحد يقدر يرد، وإلا ينفذ مباشرة. */
function advance(state: GameState): GameState {
  let next = state;
  while (next.winner === null && next.response === null && next.queue.length > 0) {
    const [effect, ...rest] = next.queue;
    if (!effect) break;
    next = { ...next, queue: rest };
    const window: ResponseWindow = { effect, standing: null, awaiting: 'defense', passed: [] };
    next = defenders(next, window).length > 0 ? { ...next, response: window } : applyOrFizzle(next, effect);
  }
  return next;
}

/** إذا ما بقى أحد يدافع، التأثير الأصلي يتنفذ. */
function settleDefense(state: GameState): GameState {
  const window = state.response;
  if (!window || defenders(state, window).length > 0) return state;
  return advance(applyOrFizzle({ ...state, response: null }, window.effect));
}

/** كرت الرد ثبت (صاحب الأكشن ما رد عليه): ننفذ أثره. */
function resolveStanding(state: GameState, effect: Effect, standing: StandingResponse): GameState {
  switch (standing.kind) {
    case 'hayyour':
      return standing.bounce ? applyOrFizzle(state, standing.bounce) : state;
    case 'edfaaliEjari':
      // الإيجار يصير على اللاعب المختار، ويقدر يرد بكروته.
      return standing.payer === null ? state : { ...state, queue: [{ ...effect, target: standing.payer }, ...state.queue] };
    default:
      // مالك امل، فزعه، ماتشوف شر: التأثير ينلغي عن المستهدف.
      return state;
  }
}

type BounceResult = { readonly ok: true; readonly bounce: Effect | null } | { readonly ok: false; readonly error: MoveError };

/** يبني التأثير المعكوس لـ"حيور": يرجع على صاحب الأكشن وصاحب حيور هو المستفيد. */
function buildBounce(state: GameState, effect: Effect, choice: BounceChoice | undefined): BounceResult {
  // "حصانه" تحمي صاحب الأكشن من الارتداد، وكروت التبديل تنلغي فقط.
  if (state.immune.includes(effect.actor) || SWAP_ACTIONS.includes(effect.action)) return { ok: true, bounce: null };

  const reversed: Effect = { ...effect, actor: effect.target, target: effect.actor, params: {} };
  if (!CHOICE_ACTIONS.includes(effect.action)) return { ok: true, bounce: reversed };

  // السرقة: صاحب حيور يختار وش ياخذ. بدون اختيار = يلغي فقط.
  if (!choice) return { ok: true, bounce: null };
  const picked =
    choice.handIndex === undefined ? undefined : getPlayer(state, effect.actor).hand[choice.handIndex]?.id;
  const params: EffectParams = {
    ...(choice.targetCardIds ? { targetCardIds: choice.targetCardIds } : {}),
    ...(choice.color ? { color: choice.color } : {}),
    ...(picked ? { pickedCardId: picked } : {}),
  };
  const bounce: Effect = { ...reversed, params };
  return applyEffect(state, bounce).ok ? { ok: true, bounce } : { ok: false, error: 'invalidCard' };
}

function respond(state: GameState, move: RespondMove): MoveResult {
  const window = state.response;
  if (!window) return fail('noResponsePending');
  const { effect } = window;
  const seat = move.seat;

  const allowed: ResponseKind[] =
    window.awaiting === 'actor' ? (seat === effect.actor ? ['malekAmal'] : []) : allowedResponses(state, window, seat);
  const isMyTurnToRespond =
    window.awaiting === 'actor' ? seat === effect.actor : defenders(state, window).includes(seat);
  if (!isMyTurnToRespond) return fail('notYourResponse');

  // ---- "ما أرد" ----
  if (move.cardId === undefined) {
    if (window.awaiting === 'actor') {
      if (!window.standing) return fail('invalidResponse');
      return done(advance(resolveStanding({ ...state, response: null }, effect, window.standing)));
    }
    return done(settleDefense({ ...state, response: { ...window, passed: [...window.passed, seat] } }));
  }

  // ---- لعب كرت رد ----
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === move.cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'action') return fail('wrongCardKind');
  const kind = card.action === 'tebWetkhayyar' ? move.as : card.action;
  if (!isResponseKind(kind) || !allowed.includes(kind)) return fail('invalidResponse');

  // كرت الرد يروح للنار، وما ينحسب من كروت الدور.
  const used = withPlayer(
    { ...state, firePile: [...state.firePile, card] },
    { ...player, hand: player.hand.filter((c) => c.id !== card.id) },
  );

  if (window.awaiting === 'actor') {
    // صاحب الأكشن لغى كرت الرد: يرجع الدور للمدافعين من جديد.
    return done(settleDefense({ ...used, response: { ...window, standing: null, awaiting: 'defense', passed: [] } }));
  }

  let bounce: Effect | null = null;
  let payer: number | null = null;
  if (kind === 'hayyour') {
    const built = buildBounce(used, effect, move.bounce);
    if (!built.ok) return fail(built.error);
    bounce = built.bounce;
  }
  if (kind === 'edfaaliEjari') {
    const chosen = move.payerSeat;
    if (!isOtherSeat(seat, chosen) || chosen === effect.actor || state.immune.includes(chosen)) {
      return fail('invalidTarget');
    }
    payer = chosen;
  }

  const standing: StandingResponse = { kind, by: seat, bounce, payer };
  if (!actorCanCounter(used, effect.actor)) {
    return done(advance(resolveStanding({ ...used, response: null }, effect, standing)));
  }
  return done({ ...used, response: { ...window, standing, awaiting: 'actor' } });
}

// ===================== حركات الدور =====================

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
    // "طب وتخير" يصير أي أكشن، فينلعب كدوبل ايجار بعد.
    if (double.kind !== 'action' || (double.action !== 'doubleRent' && double.action !== 'tebWetkhayyar')) {
      return fail('wrongCardKind');
    }
    played.push(double);
    amount = rent * 2;
  }

  let payers: number[];
  if (def.payer === 'one') {
    if (!isOtherSeat(seat, targetSeat) || state.immune.includes(targetSeat)) return fail('invalidTarget');
    payers = [targetSeat];
  } else {
    // "حصانه": الكرت يتعدى اللاعب المحمي.
    payers = otherSeats(seat).filter((s) => !state.immune.includes(s));
  }

  const playedIds = new Set(played.map((c) => c.id));
  // "دوبل ايجار" ما ينحسب من كروت الدور: ينحسب كرت الإيجار فقط.
  const next = withPlayer(
    { ...countPlay(state), firePile: [...state.firePile, ...played] },
    { ...player, hand: player.hand.filter((c) => !playedIds.has(c.id)) },
  );
  const effects: Effect[] = payers.map((target) => ({
    action: 'rent',
    isRent: true,
    actor: seat,
    target,
    amount,
    params: {},
  }));
  return done(advance({ ...next, queue: effects }));
}

/** يبني تأثيرات كرت الأكشن على كل مستهدف، أو يرجّع سبب الرفض. */
function buildEffects(base: GameState, action: ActionId, move: PlayActionMove): Effect[] | MoveError {
  const { seat, targetSeat } = move;
  const def: ActionDef | undefined = ACTIONS.find((d) => d.id === action);
  const make = (target: number, amount: number, params: EffectParams, isRent = false): Effect => ({
    action,
    isRent,
    actor: seat,
    target,
    amount,
    params,
  });

  switch (action) {
    case 'eyadi':
      // "حصانه": الكرت يتعدى اللاعب المحمي.
      return otherSeats(seat)
        .filter((s) => !base.immune.includes(s))
        .map((target) => make(target, def?.amount ?? 0, {}));
    case 'qarqash':
    case 'qardIskan':
      if (!isOtherSeat(seat, targetSeat)) return 'invalidTarget';
      return [make(targetSeat, def?.amount ?? 0, {})];
    case 'tathmeen': {
      if (!isOtherSeat(seat, targetSeat)) return 'invalidTarget';
      const amount = rentForAllCompleteSets(getPlayer(base, seat));
      if (amount <= 0) return 'noCompleteSet';
      return [make(targetSeat, amount, {}, true)];
    }
    case 'boog':
    case 'boogDouble':
    case 'boogJoker':
    case 'baddel':
    case 'rahatAlek':
    case 'endebes':
    case 'ezalah':
    case 'etHas':
    case 'estareeh':
    case 'ekshef': {
      if (!isOtherSeat(seat, targetSeat)) return 'invalidTarget';
      const params: EffectParams = {
        ...(move.targetCardIds ? { targetCardIds: move.targetCardIds } : {}),
        ...(move.ownCardId ? { ownCardId: move.ownCardId } : {}),
        ...(move.color ? { color: move.color } : {}),
        ...(move.ownColor ? { ownColor: move.ownColor } : {}),
      };
      return [make(targetSeat, 0, params)];
    }
    case 'werathtek': {
      if (!isOtherSeat(seat, targetSeat)) return 'invalidTarget';
      const picked = move.handIndex === undefined ? undefined : getPlayer(base, targetSeat).hand[move.handIndex];
      if (!picked) return 'invalidCard';
      return [make(targetSeat, 0, { pickedCardId: picked.id })];
    }
    case 'mukhalafah': {
      const burns = move.burns ?? [];
      const available = otherSeats(seat).filter((s) => !base.immune.includes(s) && getPlayer(base, s).hand.length > 0);
      // تنلعب على المتوفر: لاعبين إذا موجودين، أو واحد إذا ما فيه غيره بيده كروت.
      const needed = Math.min(2, available.length);
      if (needed === 0) return 'invalidTarget';
      if (burns.length !== needed || new Set(burns.map((b) => b.seat)).size !== needed) return 'invalidTarget';

      const effects: Effect[] = [];
      for (const burn of burns) {
        if (!available.includes(burn.seat)) return 'invalidTarget';
        const picked = getPlayer(base, burn.seat).hand[burn.handIndex];
        if (!picked) return 'invalidCard';
        effects.push(make(burn.seat, 0, { pickedCardId: picked.id }));
      }
      return effects;
    }
    default:
      // "دوبل ايجار" ينلعب مع كرت إيجار فقط، وكروت الرد تنلعب خارج الدور.
      return 'unsupportedAction';
  }
}

function playAction(state: GameState, move: PlayActionMove): MoveResult {
  const { seat, cardId } = move;
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);

  const owner = getPlayer(state, seat);
  const card = owner.hand.find((c) => c.id === cardId);
  if (!card) return fail('cardNotInHand');
  if (card.kind !== 'action') return fail('wrongCardKind');

  // "طب وتخير" يصير أي أكشن تختاره.
  const action = card.action === 'tebWetkhayyar' ? move.asAction : card.action;
  if (action === undefined || action === 'tebWetkhayyar') return fail('unsupportedAction');

  // الحالة بعد لعب الكرت: يطلع من اليد للنار. "زايد لعبه" ما ينحسب من كروت الدور.
  const counted = action === 'extraPlay' ? state : countPlay(state);
  const base = withPlayer(
    { ...counted, firePile: [...state.firePile, card] },
    { ...owner, hand: owner.hand.filter((c) => c.id !== cardId) },
  );

  switch (action) {
    case 'draw2':
      return done(drawCards(base, seat, DRAW_PER_TURN));
    case 'extraPlay':
      return done({ ...base, extraPlays: base.extraPlays + 1 });
    case 'hasanah':
      // تحميك من كل شي لين يرجع دورك.
      return done({ ...base, immune: base.immune.includes(seat) ? base.immune : [...base.immune, seat] });
    default:
      break;
  }

  const effects = buildEffects(base, action, move);
  if (typeof effects === 'string') return fail(effects);
  // لازم كل تأثير يكون قانوني وقت اللعب.
  for (const effect of effects) {
    const trial = applyEffect(base, effect);
    if (!trial.ok) return trial;
  }
  return done(advance({ ...base, queue: effects }));
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
  const debtIndex = pending ? pending.debts.findIndex((d) => d.from === seat) : -1;
  const debt = pending?.debts[debtIndex];
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

  const debts = pending.debts.filter((_, i) => i !== debtIndex);
  let nextPending: PendingPayment | null = debts.length > 0 ? { to: pending.to, debts } : null;
  let pendingQueue = state.pendingQueue;
  if (nextPending === null && pendingQueue.length > 0) {
    nextPending = pendingQueue[0] ?? null;
    pendingQueue = pendingQueue.slice(1);
  }

  const next = withPlayer(withPlayer({ ...state, pending: nextPending, pendingQueue }, paid), received);
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
  let immune = state.immune;
  for (let i = 0; i < PLAYER_COUNT && skips.includes(nextSeat); i++) {
    // ينشال تفويت واحد فقط: إذا عليه أكثر من واحد يبقى الباقي لدوره اللي بعده.
    const index = skips.indexOf(nextSeat);
    const skipped = nextSeat;
    skips = skips.filter((_, j) => j !== index);
    immune = immune.filter((s) => s !== skipped);
    nextSeat = (nextSeat + 1) % PLAYER_COUNT;
  }
  // "حصانه" تنتهي أول ما يرجع دور صاحبها.
  const turnSeat = nextSeat;
  immune = immune.filter((s) => s !== turnSeat);

  return done({
    ...state,
    skips,
    immune,
    extraPlays: 0,
    revealed: null,
    turn: { seat: nextSeat, hasDrawn: false, playsUsed: 0, discarding: false },
  });
}

/** يطبّق حركة على الحالة. يرجّع الحالة الجديدة، أو سبب الرفض بدون تغيير الحالة. */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (state.winner !== null) return fail('gameOver');

  // الرد والدفع ينلعبون خارج الدور، واللعب يوقف لين يخلصون.
  if (move.type === 'respond') return respond(state, move);
  if (state.response !== null) return fail('responsePending');
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

// ===================== الحركات القانونية =====================

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

/** الحركات القانونية لكرت أكشن باليد، ينلعب كأكشن معيّن. */
function actionMoves(state: GameState, player: PlayerState, cardId: string, action: ActionId, viaTeb: boolean): Move[] {
  const seat = player.seat;
  const base: PlayActionMove = viaTeb
    ? { type: 'playAction', seat, cardId, asAction: action }
    : { type: 'playAction', seat, cardId };
  const targets = otherSeats(seat).filter((s) => !state.immune.includes(s));
  const moves: Move[] = [];

  switch (action) {
    case 'eyadi':
    case 'draw2':
    case 'extraPlay':
    case 'hasanah':
      moves.push(base);
      break;
    case 'tathmeen':
      if (completeColors(player.properties).length > 0) {
        for (const targetSeat of targets) moves.push({ ...base, targetSeat });
      }
      break;
    case 'werathtek':
      for (const targetSeat of targets) {
        getPlayer(state, targetSeat).hand.forEach((_, handIndex) => {
          moves.push({ ...base, targetSeat, handIndex });
        });
      }
      break;
    case 'mukhalafah': {
      const available = targets.filter((s) => getPlayer(state, s).hand.length > 0);
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
      // بقية الكروت: كل مستهدف وكل اختيار قانوني عليه.
      for (const targetSeat of targets) {
        for (const option of effectOptions(state, action, seat, targetSeat)) {
          moves.push({ ...base, targetSeat, ...option });
        }
      }
      break;
  }
  return moves;
}

/** حركات الرد القانونية بنافذة الرد المفتوحة. */
function responseMoves(state: GameState, window: ResponseWindow): Move[] {
  const { effect } = window;
  const moves: Move[] = [];

  const seats = window.awaiting === 'actor' ? [effect.actor] : defenders(state, window);
  for (const seat of seats) {
    moves.push({ type: 'respond', seat });
    const allowed: ResponseKind[] = window.awaiting === 'actor' ? ['malekAmal'] : allowedResponses(state, window, seat);

    for (const card of getPlayer(state, seat).hand) {
      if (card.kind !== 'action') continue;
      const viaTeb = card.action === 'tebWetkhayyar';
      const kinds = viaTeb ? allowed : allowed.filter((k) => k === card.action);

      for (const kind of kinds) {
        const base: RespondMove = viaTeb
          ? { type: 'respond', seat, cardId: card.id, as: kind }
          : { type: 'respond', seat, cardId: card.id };

        if (kind === 'edfaaliEjari') {
          for (const payerSeat of otherSeats(seat)) {
            if (payerSeat !== effect.actor && !state.immune.includes(payerSeat)) moves.push({ ...base, payerSeat });
          }
        } else if (kind === 'hayyour' && CHOICE_ACTIONS.includes(effect.action) && !state.immune.includes(effect.actor)) {
          // صاحب حيور يختار وش ياخذ من صاحب الأكشن.
          const actorHand = getPlayer(state, effect.actor).hand;
          const choices: BounceChoice[] = effectOptions(state, effect.action, seat, effect.actor).map((option) => ({
            ...(option.targetCardIds ? { targetCardIds: option.targetCardIds } : {}),
            ...(option.color ? { color: option.color } : {}),
            ...(option.pickedCardId ? { handIndex: actorHand.findIndex((c) => c.id === option.pickedCardId) } : {}),
          }));
          if (choices.length === 0) moves.push(base);
          for (const bounce of choices) moves.push({ ...base, bounce });
        } else {
          moves.push(base);
        }
      }
    }
  }
  return moves;
}

/** مقاعد اللاعبين اللي عليهم يتحركون الحين (صاحب الدور، أو اللي عليهم رد أو دفع). */
export function seatsToAct(state: GameState): number[] {
  return [...new Set(legalMoves(state).map((move) => move.seat))];
}

/**
 * الحركات القانونية بالحالة الحالية.
 * نافذة رد مفتوحة: حركات الرد. دفع معلّق: حركة دفع جاهزة لكل مديون. غير كذا: حركات صاحب الدور.
 */
export function legalMoves(state: GameState): Move[] {
  if (state.winner !== null) return [];

  if (state.response !== null) return responseMoves(state, state.response);

  if (state.pending !== null) {
    const seen = new Set<number>();
    const moves: Move[] = [];
    for (const debt of state.pending.debts) {
      if (seen.has(debt.from)) continue;
      seen.add(debt.from);
      moves.push({ type: 'pay', seat: debt.from, cardIds: suggestPayment(getPlayer(state, debt.from), debt.amount) });
    }
    return moves;
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
        const targets: (number | undefined)[] =
          def.payer === 'one' ? otherSeats(seat).filter((s) => !state.immune.includes(s)) : [undefined];
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
        if (card.action === 'tebWetkhayyar') {
          // "طب وتخير" يصير أي أكشن ينلعب بالدور.
          for (const def of ACTIONS) {
            if (def.id !== 'tebWetkhayyar') moves.push(...actionMoves(state, player, card.id, def.id, true));
          }
        } else {
          moves.push(...actionMoves(state, player, card.id, card.action, false));
        }
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
