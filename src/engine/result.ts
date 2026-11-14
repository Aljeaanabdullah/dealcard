// نتيجة الحركة: حالة جديدة، أو سبب الرفض.

import type { GameState } from './state';

export type MoveError =
  | 'gameOver'
  | 'notYourTurn'
  | 'alreadyDrew'
  | 'mustDrawFirst'
  | 'noPlaysLeft'
  | 'cardNotInHand'
  | 'wrongCardKind'
  | 'jokerNotOnTable'
  | 'jokerNeedsProperty'
  | 'sameColor'
  | 'paymentPending'
  | 'noPaymentDue'
  | 'invalidPayment'
  | 'invalidTarget'
  | 'invalidCard'
  | 'colorRequired'
  | 'colorNotAllowed'
  | 'noPropertyInColor'
  | 'setNotComplete'
  | 'buildingNotOnTable'
  | 'noCompleteSet'
  | 'unsupportedAction'
  | 'responsePending'
  | 'noResponsePending'
  | 'notYourResponse'
  | 'invalidResponse';

export type MoveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: MoveError };

export function fail(error: MoveError): MoveResult {
  return { ok: false, error };
}

export function done(state: GameState): MoveResult {
  return { ok: true, state };
}
