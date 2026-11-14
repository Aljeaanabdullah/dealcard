// منطق الغرفة والحكم — plan.md المرحلة 8، و prd.md الأقسام 4 و 8
// دوال خالصة: الخادم يشغّلها بنفس المحرك، والتطبيق ما يقرر نتيجة.
// الوقت يدخل كرقم (now) من الخادم؛ هذا الملف ما يقرأ وقت النظام.

import { chooseMove } from '../bot/bot';
import { pickBotAvatars, pickBotNames } from '../bot/names';
import { DEFAULT_AVATAR, normalizeAvatar } from '../data/avatars';
import {
  MATCH_WAIT_SECONDS,
  PLAYER_COUNT,
  TURN_SECONDS,
  WIN_TARGETS,
  type WinTarget,
} from '../data/rules';
import { applyMove, legalMoves, seatsToAct, type Move, type MoveError } from '../engine/moves';
import { suggestPayment } from '../engine/payment';
import { createRng, nextSeed, randomInt, type Rng } from '../engine/rng';
import { createGame, type GameState } from '../engine/state';
import { forceEndTurn } from '../engine/timeout';
import { maskStateFor } from './mask';

/** تأخير حركة البوت على الخادم حتى يبدو طبيعياً. */
export const BOT_DELAY_MS = 700;

export interface Seat {
  /** معرّف اللاعب، أو null للبوت */
  readonly playerId: string | null;
  /** الاسم المستعار. البوت ياخذ اسم عشوائي من قائمة أسماء البوتات. */
  readonly name: string;
  /** رقم الشخصية اللي اختارها اللاعب. البوت ياخذ شخصية عشوائية. */
  readonly avatar?: number;
  readonly isBot: boolean;
  readonly connected: boolean;
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface Room {
  readonly code: string;
  readonly hostId: string;
  readonly winTarget: WinTarget;
  readonly status: RoomStatus;
  readonly seats: readonly Seat[];
  readonly game: GameState | null;
  /** آخر حركة انلعبت (معلومة مكشوفة للجميع) */
  readonly lastMove: Move | null;
  /** آخر أكشن أو إيجار انلعب بهذا الدور (لسهم المستهدف ونوافذ الرد والدفع)، ينمسح بنهاية الدور */
  readonly lastAttack: Move | null;
  /** وقت آخر حركة بالملي ثانية */
  readonly lastMoveAt: number;
  /** موعد انتهاء الدور الحالي بالملي ثانية (المؤقت على الخادم) */
  readonly turnDeadline: number;
  /** بذرة عشوائية البوتات */
  readonly botSeed: number;
  /**
   * غرفة لعب عشوائي (مطابقة تلقائية): وقت فتحها وبذرة الخلط.
   * بدونها = غرفة خاصة بكود.
   */
  readonly match?: { readonly openedAt: number; readonly seed: number } | null;
}

export type RoomError =
  | 'nameRequired'
  | 'roomFull'
  | 'alreadyJoined'
  | 'alreadyStarted'
  | 'notStarted'
  | 'notHost'
  | 'notInRoom'
  | 'invalidWinTarget'
  | 'fixedWinTarget'
  | MoveError;

export type RoomResult = { readonly ok: true; readonly room: Room } | { readonly ok: false; readonly error: RoomError };

function fail(error: RoomError): RoomResult {
  return { ok: false, error };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

/** كود غرفة من 5 خانات بدون الحروف والأرقام المتشابهة (O و 0، I و 1). */
export function generateRoomCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(rng, CODE_ALPHABET.length)];
  }
  return code;
}

function seatOf(room: Room, playerId: string): number {
  return room.seats.findIndex((seat) => seat.playerId === playerId);
}

export function createRoom(code: string, hostId: string, name: string, avatar: number = DEFAULT_AVATAR): RoomResult {
  if (name.trim().length === 0) return fail('nameRequired');
  return {
    ok: true,
    room: {
      code,
      hostId,
      winTarget: WIN_TARGETS[0],
      status: 'lobby',
      seats: [{ playerId: hostId, name: name.trim(), avatar: normalizeAvatar(avatar), isBot: false, connected: true }],
      game: null,
      lastMove: null,
      lastAttack: null,
      lastMoveAt: 0,
      turnDeadline: 0,
      botSeed: 0,
    },
  };
}

export function joinRoom(room: Room, playerId: string, name: string, avatar: number = DEFAULT_AVATAR): RoomResult {
  if (name.trim().length === 0) return fail('nameRequired');
  if (seatOf(room, playerId) >= 0) return fail('alreadyJoined');
  if (room.status !== 'lobby') return fail('alreadyStarted');
  if (room.seats.length >= PLAYER_COUNT) return fail('roomFull');
  return {
    ok: true,
    room: {
      ...room,
      seats: [...room.seats, { playerId, name: name.trim(), avatar: normalizeAvatar(avatar), isBot: false, connected: true }],
    },
  };
}

// ---------------- اللعب العشوائي (المرحلة 9) ----------------

/**
 * غرفة لعب عشوائي جديدة: شرط الفوز يختاره اللاعب قبل البحث (6 أو 8) وما يتغير بعدها، وتبدأ تلقائياً.
 */
export function createMatchRoom(
  code: string,
  playerId: string,
  name: string,
  winTarget: number,
  seed: number,
  now: number,
  avatar: number = DEFAULT_AVATAR,
): RoomResult {
  const target = WIN_TARGETS.find((allowed) => allowed === winTarget);
  if (target === undefined) return fail('invalidWinTarget');
  const created = createRoom(code, playerId, name, avatar);
  if (!created.ok) return created;
  return { ok: true, room: { ...created.room, winTarget: target, match: { openedAt: now, seed } } };
}

/** لاعب يدخل غرفة لعب عشوائي مفتوحة. إذا اكتمل 4 لاعبين اللعبة تبدأ مباشرة. */
export function joinMatchRoom(
  room: Room,
  playerId: string,
  name: string,
  now: number,
  avatar: number = DEFAULT_AVATAR,
): RoomResult {
  if (!room.match) return fail('notInRoom');
  const joined = joinRoom(room, playerId, name, avatar);
  if (!joined.ok) return joined;
  return joined.room.seats.length >= PLAYER_COUNT ? begin(joined.room, room.match.seed, now) : joined;
}

/**
 * غرفة لعب عشوائي تنتظر لاعبين وفيها مكان.
 * ما تنحسب: الغرفة الفاضية (كلهم ألغوا)، والغرفة اللي خلصت مهلتها وما بدأت
 * (لاعبها سكّر التطبيق بدون ما يلغي، فما يدخل عليها لاعب جديد).
 */
export function isOpenMatch(room: Room, now: number): boolean {
  if (!room.match || room.status !== 'lobby') return false;
  if (room.seats.length === 0 || room.seats.length >= PLAYER_COUNT) return false;
  return now < room.match.openedAt + MATCH_WAIT_SECONDS * 1000;
}

/** اللاعب داخل هالغرفة وهي ما انتهت (انتظار أو لعب). */
export function isActiveFor(room: Room, playerId: string): boolean {
  return room.status !== 'finished' && seatOf(room, playerId) >= 0;
}

/** شرط الفوز يختاره صاحب الغرفة قبل بداية اللعبة. */
export function setWinTarget(room: Room, playerId: string, winTarget: number): RoomResult {
  // اللعب العشوائي شرط فوزه ثابت.
  if (room.match) return fail('fixedWinTarget');
  if (playerId !== room.hostId) return fail('notHost');
  if (room.status !== 'lobby') return fail('alreadyStarted');
  const target = WIN_TARGETS.find((allowed) => allowed === winTarget);
  if (target === undefined) return fail('invalidWinTarget');
  return { ok: true, room: { ...room, winTarget: target } };
}

/** صاحب الغرفة يبدأ اللعبة، والبوتات تكمل العدد إلى 4. */
export function startRoom(room: Room, playerId: string, seed: number, now: number): RoomResult {
  // اللعب العشوائي يبدأ تلقائياً (لما يكتمل العدد أو تخلص مهلة الانتظار)، مو بيد لاعب.
  if (room.match || playerId !== room.hostId) return fail('notHost');
  return begin(room, seed, now);
}

/** يبدأ اللعبة: البوتات تكمل العدد إلى 4، ثم الخلط والتوزيع. */
function begin(room: Room, seed: number, now: number): RoomResult {
  if (room.status !== 'lobby') return fail('alreadyStarted');

  // البوتات تكمل العدد بأسماء وشخصيات عشوائية (بذرة مستقلة عن بذرة لعب البوتات).
  const seats: Seat[] = [...room.seats];
  const identityRng = createRng(seed + 1);
  const botNames = pickBotNames(
    identityRng,
    PLAYER_COUNT - seats.length,
    seats.map((seat) => seat.name),
  );
  const botAvatars = pickBotAvatars(
    identityRng,
    botNames,
    seats.map((seat) => normalizeAvatar(seat.avatar)),
  );
  botNames.forEach((name, index) => {
    seats.push({ playerId: null, name, avatar: botAvatars[index] ?? DEFAULT_AVATAR, isBot: true, connected: true });
  });
  const rng = createRng(seed);
  const game = createGame(seed, room.winTarget);
  return {
    ok: true,
    room: {
      ...room,
      status: 'playing',
      seats,
      game,
      lastMove: null,
      lastAttack: null,
      lastMoveAt: now,
      turnDeadline: now + TURN_SECONDS * 1000,
      botSeed: nextSeed(rng),
    },
  };
}

/** يطبّق حركة على لعبة الغرفة ويحدّث المؤقت وحالة الغرفة. */
function applyToRoom(room: Room, game: GameState, move: Move, now: number): RoomResult {
  const result = applyMove(game, move);
  if (!result.ok) return fail(result.error);
  const next = result.state;
  const turnChanged = next.turn.seat !== game.turn.seat || (move.type === 'endTurn' && next.turn.seat === game.turn.seat);
  return {
    ok: true,
    room: {
      ...room,
      game: next,
      status: next.winner !== null ? 'finished' : 'playing',
      lastMove: move,
      lastAttack:
        move.type === 'playAction' || move.type === 'playRent' ? move : move.type === 'endTurn' ? null : room.lastAttack,
      lastMoveAt: now,
      turnDeadline: turnChanged ? now + TURN_SECONDS * 1000 : room.turnDeadline,
    },
  };
}

/**
 * حركة لاعب: الخادم يحدد مقعده من هويته (مو من اللي يرسله التطبيق)،
 * ويتحقق منها بنفس المحرك.
 */
export function submitMove(room: Room, playerId: string, move: Move, now: number): RoomResult {
  if (room.status !== 'playing' || !room.game) return fail(room.status === 'lobby' ? 'notStarted' : 'gameOver');
  const seat = seatOf(room, playerId);
  if (seat < 0 || room.seats[seat]?.isBot) return fail('notInRoom');
  return applyToRoom(room, room.game, { ...move, seat }, now);
}

/** لاعب خرج أو انقطع: قبل البداية ينشال من الغرفة، وبعد البداية يكمل مكانه بوت. */
export function leaveRoom(room: Room, playerId: string): RoomResult {
  const seat = seatOf(room, playerId);
  if (seat < 0) return fail('notInRoom');

  if (room.status === 'lobby') {
    const seats = room.seats.filter((_, index) => index !== seat);
    const nextHost = seats[0]?.playerId ?? room.hostId;
    return { ok: true, room: { ...room, seats, hostId: playerId === room.hostId ? nextHost : room.hostId } };
  }
  // البوت اللي يستلم المكان ياخذ اسم بوت وشخصية مو مستخدمين بالغرفة.
  const identityRng = createRng(room.botSeed + seat + 1);
  const [botName] = pickBotNames(
    identityRng,
    1,
    room.seats.map((s) => s.name),
  );
  const [botAvatar] = pickBotAvatars(
    identityRng,
    botName === undefined ? [] : [botName],
    room.seats.map((s) => normalizeAvatar(s.avatar)),
  );
  return {
    ok: true,
    room: {
      ...room,
      seats: room.seats.map((s, index) =>
        index === seat
          ? { ...s, playerId: null, name: botName ?? s.name, avatar: botAvatar ?? DEFAULT_AVATAR, isBot: true, connected: false }
          : s,
      ),
    },
  };
}

/**
 * نبضة الخادم: تنفذ خطوة وحدة إذا حان وقتها.
 * - إذا انتهى وقت الدور: أي رد أو دفع معلّق ينحل تلقائياً، ثم الدور ينتهي تلقائياً.
 * - غير كذا: إذا بوت عليه حركة ومر التأخير، يلعب حركة وحدة.
 * ترجّع نفس الغرفة إذا ما فيه شي ينسوى.
 */
export function tick(room: Room, now: number): Room {
  // اللعب العشوائي: إذا خلصت مهلة الانتظار وما اكتمل العدد، البوتات تكمل وتبدأ اللعبة.
  if (room.status === 'lobby' && room.match && room.seats.length > 0) {
    if (now < room.match.openedAt + MATCH_WAIT_SECONDS * 1000) return room;
    const started = begin(room, room.match.seed, now);
    return started.ok ? started.room : room;
  }

  const game = room.game;
  if (room.status !== 'playing' || !game) return room;

  const seats = seatsToAct(game);
  const rng = createRng(room.botSeed);
  const withSeed = (next: Room): Room => ({ ...next, botSeed: nextSeed(rng) });

  if (now >= room.turnDeadline) {
    const seat = seats[0];
    if (seat === undefined) return room;
    let move: Move | null = null;
    if (game.response !== null) {
      move = { type: 'respond', seat };
    } else if (game.pending !== null) {
      const debt = game.pending.debts.find((d) => d.from === seat);
      const player = game.players[seat];
      move = debt && player ? { type: 'pay', seat, cardIds: suggestPayment(player, debt.amount) } : null;
    } else {
      const ended = forceEndTurn(game, game.turn.seat);
      if (ended === game) return room;
      return withSeed({
        ...room,
        game: ended,
        lastAttack: null,
        lastMove: { type: 'endTurn', seat: game.turn.seat },
        lastMoveAt: now,
        turnDeadline: now + TURN_SECONDS * 1000,
      });
    }
    if (!move) return room;
    const result = applyToRoom(room, game, move, now);
    return result.ok ? withSeed(result.room) : room;
  }

  const botSeat = seats.find((seat) => room.seats[seat]?.isBot);
  if (botSeat === undefined || now - room.lastMoveAt < BOT_DELAY_MS) return room;
  const move = chooseMove(game, botSeat, rng);
  if (!move) return room;
  const result = applyToRoom(room, game, move, now);
  return result.ok ? withSeed(result.room) : room;
}

/** اللي يوصل لجهاز لاعب واحد: حالة الغرفة، ولعبته بيده فقط، وحركاته القانونية. */
export interface RoomSnapshot {
  readonly code: string;
  readonly status: RoomStatus;
  readonly winTarget: WinTarget;
  readonly mySeat: number;
  readonly isHost: boolean;
  readonly seats: readonly {
    readonly name: string;
    readonly avatar: number;
    readonly isBot: boolean;
    readonly connected: boolean;
  }[];
  /** الحالة بعد إخفاء أيدي الباقين وكومة السحب */
  readonly state: GameState | null;
  /** حركاتي القانونية الحين (يحسبها الخادم) */
  readonly moves: readonly Move[];
  readonly lastMove: Move | null;
  readonly lastAttack: Move | null;
  readonly turnDeadline: number;
  /** غرفة لعب عشوائي (شاشة "جاري البحث عن لاعبين") */
  readonly matchmaking: boolean;
  /** موعد بدء المباراة العشوائية إذا ما اكتمل العدد (بالملي ثانية)، أو 0 */
  readonly matchDeadline: number;
}

export function snapshotFor(room: Room, playerId: string): RoomSnapshot | null {
  const mySeat = seatOf(room, playerId);
  if (mySeat < 0) return null;
  const game = room.game;
  return {
    code: room.code,
    status: room.status,
    winTarget: room.winTarget,
    mySeat,
    isHost: playerId === room.hostId,
    seats: room.seats.map((seat) => ({
      name: seat.name,
      avatar: normalizeAvatar(seat.avatar),
      isBot: seat.isBot,
      connected: seat.connected,
    })),
    state: game ? maskStateFor(game, mySeat) : null,
    moves: game ? legalMoves(game).filter((move) => move.seat === mySeat) : [],
    lastMove: room.lastMove,
    lastAttack: room.lastAttack ?? null,
    turnDeadline: room.turnDeadline,
    matchmaking: Boolean(room.match),
    matchDeadline: room.match ? room.match.openedAt + MATCH_WAIT_SECONDS * 1000 : 0,
  };
}
