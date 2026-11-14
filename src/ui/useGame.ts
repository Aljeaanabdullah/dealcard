// إدارة مباراة محلية: لاعب واحد (المقعد 0) ضد 3 بوتات، بدون إنترنت.
// كل الحركات تمر من نفس المحرك، والبوتات تلعب بتأخير بسيط.

import { useEffect, useReducer, useRef } from 'react';

import { chooseMove } from '../bot/bot';
import { TURN_SECONDS, type WinTarget } from '../data/rules';
import { applyMove, seatsToAct, type Move, type MoveError } from '../engine/moves';
import { suggestPayment } from '../engine/payment';
import { createRng } from '../engine/rng';
import { createGame, type GameState } from '../engine/state';
import { forceEndTurn } from '../engine/timeout';
import { describeEvent, HUMAN_SEAT, type Naming } from './describe';
import { S } from './strings';

/** تأخير حركة البوت بالملي ثانية حتى يبدو طبيعياً. */
const BOT_DELAY_MS = 700;

interface Session {
  readonly game: GameState;
  /** أسماء اللاعبين بهالمباراة (لوصف الأحداث) */
  readonly naming: Naming;
  readonly secondsLeft: number;
  readonly event: string;
  readonly error: MoveError | null;
  /** آخر أكشن أو إيجار انلعب بهذا الدور (لسهم المستهدف ونوافذ الرد والدفع) */
  readonly lastAttack: Move | null;
}

type SessionAction =
  | { readonly type: 'move'; readonly move: Move; readonly expect?: GameState }
  | { readonly type: 'set'; readonly game: GameState; readonly expect: GameState; readonly event: string }
  | { readonly type: 'tick' };

function reducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'move': {
      // حركة بوت محسوبة على حالة قديمة تنتجاهل.
      if (action.expect !== undefined && action.expect !== session.game) return session;
      const result = applyMove(session.game, action.move);
      if (!result.ok) return { ...session, error: result.error };
      const turnChanged = action.move.type === 'endTurn';
      return {
        game: result.state,
        naming: session.naming,
        secondsLeft: turnChanged ? TURN_SECONDS : session.secondsLeft,
        event: describeEvent(action.move, session.game, session.naming),
        error: null,
        lastAttack:
          action.move.type === 'playAction' || action.move.type === 'playRent'
            ? action.move
            : turnChanged
              ? null
              : session.lastAttack,
      };
    }
    case 'set':
      if (action.expect !== session.game) return session;
      return { game: action.game, naming: session.naming, secondsLeft: TURN_SECONDS, event: action.event, error: null, lastAttack: null };
    case 'tick': {
      const myTurn = session.game.turn.seat === HUMAN_SEAT && session.game.winner === null;
      return myTurn && session.secondsLeft > 0 ? { ...session, secondsLeft: session.secondsLeft - 1 } : session;
    }
  }
}

export interface GameController {
  readonly game: GameState;
  readonly secondsLeft: number;
  readonly event: string;
  readonly error: MoveError | null;
  readonly lastAttack: Move | null;
  /** يلعب حركة اللاعب. */
  readonly play: (move: Move) => void;
}

export function useGame(winTarget: WinTarget, seed: number, naming: Naming): GameController {
  const [session, dispatch] = useReducer(reducer, null, (): Session => ({
    game: createGame(seed, winTarget),
    naming,
    secondsLeft: TURN_SECONDS,
    event: '',
    error: null,
    lastAttack: null,
  }));
  const rngRef = useRef(createRng(seed ^ 0x51f15e));
  const { game, secondsLeft } = session;

  // البوتات: أي بوت عليه حركة (دور أو رد أو دفع) يلعب بعد تأخير بسيط.
  useEffect(() => {
    if (game.winner !== null) return undefined;
    const botSeat = seatsToAct(game).find((seat) => seat !== HUMAN_SEAT);
    if (botSeat === undefined) return undefined;
    const timer = setTimeout(() => {
      const move = chooseMove(game, botSeat, rngRef.current);
      if (move) dispatch({ type: 'move', move, expect: game });
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game]);

  // مؤقت الدور: ينقص كل ثانية بدور اللاعب.
  const myTurn = game.turn.seat === HUMAN_SEAT && game.winner === null;
  useEffect(() => {
    if (!myTurn) return undefined;
    const interval = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(interval);
  }, [myTurn]);

  // انتهى الوقت: الدور ينتهي تلقائياً، وأي رد أو دفع على اللاعب ينحل تلقائياً أول.
  useEffect(() => {
    if (!myTurn || secondsLeft > 0) return;
    if (!seatsToAct(game).includes(HUMAN_SEAT)) return;

    if (game.response !== null) {
      dispatch({ type: 'move', move: { type: 'respond', seat: HUMAN_SEAT }, expect: game });
      return;
    }
    const debt = game.pending?.debts.find((d) => d.from === HUMAN_SEAT);
    const me = game.players[HUMAN_SEAT];
    if (debt && me) {
      dispatch({
        type: 'move',
        move: { type: 'pay', seat: HUMAN_SEAT, cardIds: suggestPayment(me, debt.amount) },
        expect: game,
      });
      return;
    }
    const next = forceEndTurn(game, HUMAN_SEAT);
    if (next !== game) dispatch({ type: 'set', game: next, expect: game, event: S.eventTimeout });
  }, [game, myTurn, secondsLeft]);

  return {
    game,
    secondsLeft,
    event: session.event,
    error: session.error,
    lastAttack: session.lastAttack,
    play: (move: Move) => dispatch({ type: 'move', move }),
  };
}
