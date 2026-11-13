// معلومات عرض الكروت، ووصف الحركات والتأثيرات كنص للاعب.

import { ACTIONS, BUILDINGS, RENTS, type ActionId, type Card } from '../data/cards';
import { getColor, type ColorId } from '../data/colors';
import type { Move } from '../engine/moves';
import { cardValue, rentFor } from '../engine/payment';
import { allCards, type Effect, type GameState } from '../engine/state';
import { S } from './strings';
import { BAND, SET_COLORS } from './theme';

export const HUMAN_SEAT = 0;

export function seatName(seat: number): string {
  return seat === HUMAN_SEAT ? S.you : S.bot(seat);
}

export function colorName(color: ColorId): string {
  return getColor(color).name;
}

export function actionName(action: ActionId): string {
  return ACTIONS.find((def) => def.id === action)?.name ?? action;
}

export interface CardInfo {
  readonly band: string;
  readonly kind: string;
  readonly name: string;
  readonly sub: string;
}

/** معلومات عرض الكرت: لون الشريط، النوع، الاسم، والسطر الصغير. */
export function cardInfo(card: Card): CardInfo {
  switch (card.kind) {
    case 'property':
      return {
        band: SET_COLORS[card.color],
        kind: S.kindProperty,
        name: card.region,
        sub: S.value(getColor(card.color).propertyValue),
      };
    case 'joker':
      return { band: BAND.joker, kind: S.kindProperty, name: S.joker, sub: S.anyColor };
    case 'money':
      return { band: BAND.money, kind: S.kindMoney, name: String(card.value), sub: S.dinar };
    case 'building': {
      const def = BUILDINGS.find((d) => d.id === card.building);
      return { band: BAND.building, kind: S.kindBuilding, name: def?.name ?? '', sub: S.rentBonus(def?.rentBonus ?? 0) };
    }
    case 'rent': {
      const def = RENTS.find((d) => d.id === card.rent);
      if (!def || def.colors === 'any') {
        return { band: BAND.rentAny, kind: S.kindRent, name: S.rentOne, sub: S.anyColor };
      }
      const first = def.colors[0];
      return {
        band: first ? SET_COLORS[first] : BAND.rentAny,
        kind: S.kindRent,
        name: S.rentAll,
        sub: def.colors.map(colorName).join(' / '),
      };
    }
    case 'action': {
      const def = ACTIONS.find((d) => d.id === card.action);
      const group = def?.group ?? 'turn';
      return {
        band: BAND[group],
        kind: group === 'defense' ? S.kindDefense : S.kindAction,
        name: def?.name ?? '',
        sub: def && 'amount' in def && def.amount !== undefined ? S.amount(def.amount) : '',
      };
    }
  }
}

function findCard(state: GameState, cardId: string | undefined): Card | undefined {
  return cardId === undefined ? undefined : allCards(state).find((card) => card.id === cardId);
}

function cardLabel(state: GameState, cardId: string | undefined): string {
  const card = findCard(state, cardId);
  return card ? cardInfo(card).name : '';
}

function names(state: GameState, cardIds: readonly string[] | undefined): string {
  return (cardIds ?? []).map((id) => cardLabel(state, id)).join('، ');
}

function join(parts: (string | undefined | false)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' · ');
}

/** وصف حركة كخيار للاعب (بدون اسم اللاعب). */
export function describeMove(move: Move, state: GameState): string {
  const me = state.players[move.seat];

  switch (move.type) {
    case 'draw':
      return S.draw;
    case 'endTurn':
      return S.endTurn;
    case 'playProperty':
      return S.playProperty;
    case 'bankMoney':
      return S.bankMoney;
    case 'playJoker':
      return S.playJokerIn(colorName(move.color));
    case 'moveJoker':
      return S.moveJokerTo(colorName(move.color));
    case 'playBuilding':
    case 'placeBuilding':
      return S.buildOn(colorName(move.color));
    case 'burnAction':
      return S.burn;
    case 'discard':
      return S.discard;
    case 'pay':
      return S.payConfirm;
    case 'playRent': {
      const base = me ? rentFor(me, move.color) : 0;
      const amount = move.doubleCardId !== undefined ? base * 2 : base;
      return join([
        S.rentOf(colorName(move.color), amount),
        move.targetSeat === undefined ? S.fromAll : S.from(seatName(move.targetSeat)),
        move.doubleCardId !== undefined && S.withDouble,
      ]);
    }
    case 'playAction': {
      const picks = (move.burns ?? []).map((b) => `${seatName(b.seat)}: ${S.handCard(b.handIndex + 1)}`).join('، ');
      return join([
        move.asAction !== undefined && S.as(actionName(move.asAction)),
        move.targetSeat !== undefined && S.on(seatName(move.targetSeat)),
        move.targetCardIds !== undefined && S.takes(names(state, move.targetCardIds)),
        move.ownCardId !== undefined && S.gives(cardLabel(state, move.ownCardId)),
        move.ownColor !== undefined && S.gives(S.wholeSet(colorName(move.ownColor))),
        move.color !== undefined &&
          (move.targetCardIds !== undefined ? S.inColor(colorName(move.color)) : S.takes(S.wholeSet(colorName(move.color)))),
        move.handIndex !== undefined && S.handCard(move.handIndex + 1),
        picks,
      ]);
    }
    case 'respond': {
      if (move.cardId === undefined) return S.noResponse;
      const card = findCard(state, move.cardId);
      const cardName = move.as !== undefined ? actionName(move.as) : card ? cardInfo(card).name : '';
      const viaTeb = card?.kind === 'action' && card.action === 'tebWetkhayyar';
      return join([
        S.respondWith(viaTeb ? `${actionName('tebWetkhayyar')} ${S.as(cardName)}` : cardName),
        move.payerSeat !== undefined && S.payer(seatName(move.payerSeat)),
        move.bounce?.targetCardIds !== undefined && S.takes(names(state, move.bounce.targetCardIds)),
        move.bounce?.color !== undefined &&
          (move.bounce.targetCardIds !== undefined
            ? S.inColor(colorName(move.bounce.color))
            : S.takes(S.wholeSet(colorName(move.bounce.color)))),
        move.bounce?.handIndex !== undefined && S.handCard(move.bounce.handIndex + 1),
      ]);
    }
  }
}

/** وصف التأثير المنتظر بنافذة الرد. */
export function describeEffect(effect: Effect, state: GameState): string {
  const title = effect.action === 'rent' ? S.kindRent : actionName(effect.action);
  return join([
    title,
    effect.amount > 0 && S.amount(effect.amount),
    effect.params.targetCardIds !== undefined && S.takes(names(state, effect.params.targetCardIds)),
    effect.params.ownCardId !== undefined && S.gives(cardLabel(state, effect.params.ownCardId)),
    effect.params.ownColor !== undefined && S.gives(S.wholeSet(colorName(effect.params.ownColor))),
    effect.params.color !== undefined &&
      effect.params.targetCardIds === undefined &&
      S.takes(S.wholeSet(colorName(effect.params.color))),
  ]);
}

/** نص الحدث اللي يطلع بعد حركة لاعب. */
export function describeEvent(move: Move, state: GameState): string {
  const name = seatName(move.seat);
  switch (move.type) {
    case 'draw':
      return S.eventDraw(name);
    case 'endTurn':
      return S.eventEndTurn(name);
    case 'pay': {
      const paid = move.cardIds.reduce((total, id) => {
        const card = findCard(state, id);
        return total + (card ? cardValue(card) : 0);
      }, 0);
      return S.eventPaid(name, paid);
    }
    case 'respond':
      return move.cardId === undefined ? S.eventPassed(name) : S.eventPlayed(name, describeMove(move, state));
    case 'discard':
      return S.eventPlayed(name, S.discard);
    default: {
      const cardName = 'cardId' in move ? cardLabel(state, move.cardId) : '';
      return S.eventPlayed(name, join([cardName, describeMove(move, state)]));
    }
  }
}
