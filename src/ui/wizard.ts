// خطوات اختيار الحركة: من قائمة الحركات القانونية لكرت واحد، نطلع الاختيارات خطوة خطوة
// (وش تسوي بالكرت ← اللاعب ← العقار/اللون ← ...). منطق فقط بدون عرض.

import { ACTIONS } from '../data/cards';
import type { ColorId } from '../data/colors';
import type { Move } from '../engine/moves';
import { cardValue } from '../engine/payment';
import type { GameState } from '../engine/state';
import {
  cardById,
  cardInfo,
  colorName,
  effectText,
  seatName,
  type Naming,
} from './describe';
import { S } from './strings';
import { SET_COLORS, theme } from './theme';

export type StepId =
  | 'type'
  | 'as'
  | 'target'
  | 'cards'
  | 'own'
  | 'color'
  | 'ownColor'
  | 'hand'
  | 'burn0'
  | 'burn1'
  | 'double';

export interface Pick {
  readonly step: StepId;
  readonly value: string;
}

export interface Option {
  readonly value: string;
  readonly label: string;
  /** سطر شرح صغير */
  readonly detail?: string;
  /** لون المربع (للعقارات والأطقم) */
  readonly color?: string;
  /** زر رد ذهبي */
  readonly gold?: boolean;
}

export interface Step {
  readonly id: StepId;
  readonly title: string;
  /** players = خانات لاعبين، tiles = مربعات ألوان، buttons = أزرار نص */
  readonly kind: 'buttons' | 'players' | 'tiles';
  readonly options: readonly Option[];
}

function targetCards(move: Move): readonly string[] {
  if (move.type === 'playAction') return move.targetCardIds ?? [];
  if (move.type === 'respond') return move.bounce?.targetCardIds ?? [];
  return [];
}

/** قيمة الحركة عند كل خطوة. فاضي = الخطوة ما تخص هالحركة. */
function keyOf(step: StepId, move: Move): string {
  switch (step) {
    case 'type':
      if (move.type !== 'respond') return move.type;
      return move.cardId === undefined ? 'pass' : `respond|${move.cardId}|${move.as ?? ''}`;
    case 'as':
      return move.type === 'playAction' ? (move.asAction ?? '') : '';
    case 'target':
      if (move.type === 'playAction') {
        if (move.burns !== undefined) return move.burns.map((b) => b.seat).join('+');
        return move.targetSeat === undefined ? '' : String(move.targetSeat);
      }
      if (move.type === 'playRent') return move.targetSeat === undefined ? '' : String(move.targetSeat);
      if (move.type === 'respond') return move.payerSeat === undefined ? '' : String(move.payerSeat);
      return '';
    case 'own':
      return move.type === 'playAction' ? (move.ownCardId ?? '') : '';
    case 'color':
      if (move.type === 'playJoker' || move.type === 'moveJoker' || move.type === 'placeBuilding' || move.type === 'playRent') {
        return move.color;
      }
      if (move.type === 'playBuilding') return move.color ?? 'loose';
      if (move.type === 'playAction') return move.color ?? '';
      if (move.type === 'respond') return move.bounce?.color ?? '';
      return '';
    case 'ownColor':
      return move.type === 'playAction' ? (move.ownColor ?? '') : '';
    case 'hand':
      if (move.type === 'playAction') return move.handIndex === undefined ? '' : String(move.handIndex);
      if (move.type === 'respond') return move.bounce?.handIndex === undefined ? '' : String(move.bounce.handIndex);
      return '';
    case 'burn0':
    case 'burn1': {
      const burn = move.type === 'playAction' ? move.burns?.[step === 'burn0' ? 0 : 1] : undefined;
      return burn === undefined ? '' : String(burn.handIndex);
    }
    case 'double':
      return move.type === 'playRent' ? (move.doubleCardId === undefined ? 'no' : 'yes') : '';
    case 'cards':
      return '';
  }
}

/** الحركات الباقية بعد تطبيق الاختيارات. */
export function applyPicks(moves: readonly Move[], picks: readonly Pick[]): Move[] {
  return moves.filter((move) =>
    picks.every((pick) =>
      pick.step === 'cards' ? targetCards(move).includes(pick.value) : keyOf(pick.step, move) === pick.value,
    ),
  );
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function seatOption(seat: number, game: GameState, naming: Naming): Option {
  const player = game.players[seat];
  const bank = player ? player.bank.reduce((sum, card) => sum + cardValue(card), 0) : 0;
  return {
    value: String(seat),
    label: seatName(seat, naming),
    detail: S.playerInfo(bank, player?.properties.length ?? 0),
  };
}

function cardOption(cardId: string): Option {
  const card = cardById(cardId);
  if (!card) return { value: cardId, label: cardId };
  const info = cardInfo(card);
  return { value: cardId, label: info.name, color: card.kind === 'joker' ? theme.gold : info.band };
}

function colorOption(value: string): Option {
  if (value === 'loose') return { value, label: S.buildLoose };
  const color = value as ColorId;
  return { value, label: colorName(color), color: SET_COLORS[color] };
}

/** اسم كرت الأكشن من معرّفه كنص. */
function actionLabel(action: string): string {
  return ACTIONS.find((def) => def.id === action)?.name ?? action;
}

function typeOption(value: string): Option {
  if (value === 'pass') return { value, label: S.noResponse };
  if (value.startsWith('respond|')) {
    const [, cardId = '', as = ''] = value.split('|');
    const card = cardById(cardId);
    const cardName = card ? cardInfo(card).name : '';
    // "طب وتخير" ينلعب ككرت رد ثاني: نكتب الاثنين.
    const kind = as !== '' ? as : card?.kind === 'action' ? card.action : '';
    const name = as !== '' ? `${cardName} ${S.as(actionLabel(as))}` : cardName;
    return { value, label: S.respondWith(name), detail: S.effect[kind] ?? '', gold: true };
  }
  switch (value) {
    case 'playProperty':
      return { value, label: S.playProperty };
    case 'bankMoney':
      return { value, label: S.bankMoney };
    case 'playJoker':
      return { value, label: S.playJoker };
    case 'moveJoker':
    case 'placeBuilding':
      return { value, label: S.moveIt };
    case 'playRent':
      return { value, label: S.askRent };
    case 'burnAction':
      return { value, label: S.burn };
    case 'discard':
      return { value, label: S.discard };
    default:
      return { value, label: S.playIt };
  }
}

/** ترتيب الخطوات. كرت الإيجار يبدأ باللون ثم اللاعب. */
function sequence(moves: readonly Move[]): StepId[] {
  const rentOnly = moves.length > 0 && moves.every((move) => move.type === 'playRent');
  return rentOnly
    ? ['type', 'color', 'target', 'double']
    : ['type', 'as', 'target', 'cards', 'own', 'color', 'ownColor', 'hand', 'burn0', 'burn1', 'double'];
}

/** الخطوة التالية اللي تحتاج اختيار من اللاعب، أو null إذا خلصت الاختيارات. */
export function nextStep(
  allMoves: readonly Move[],
  picks: readonly Pick[],
  game: GameState,
  naming: Naming,
): Step | null {
  const moves = applyPicks(allMoves, picks);
  if (moves.length === 0) return null;
  const picked = new Set(picks.map((pick) => pick.step));

  for (const id of sequence(moves)) {
    if (id === 'cards') {
      const chosen = picks.filter((pick) => pick.step === 'cards').map((pick) => pick.value);
      const needed = Math.max(...moves.map((move) => targetCards(move).length));
      if (chosen.length >= needed) continue;
      const options = distinct(moves.flatMap((move) => targetCards(move))).filter((cardId) => !chosen.includes(cardId));
      if (options.length >= 2) return { id, title: S.chooseProperty, kind: 'tiles', options: options.map(cardOption) };
      continue;
    }
    if (picked.has(id)) continue;

    const values = distinct(moves.map((move) => keyOf(id, move)));
    // أول خطوة تنعرض دائماً (حتى لو خيار واحد) عشان اللاعب يشوف وش بيصير قبل ما يضغط.
    const always = id === 'type' && picks.length === 0;
    if (values.length < 2 && !always) continue;

    switch (id) {
      case 'type':
        return { id, title: S.chooseAction, kind: 'buttons', options: values.map(typeOption) };
      case 'as':
        return {
          id,
          title: S.chooseAs,
          kind: 'buttons',
          options: values.map((value) => ({ value, label: actionLabel(value), detail: S.effect[value] ?? '' })),
        };
      case 'target': {
        const single = values.every((value) => /^\d+$/.test(value));
        return {
          id,
          title: S.chooseTarget,
          kind: single ? 'players' : 'buttons',
          options: values.map((value) =>
            single
              ? seatOption(Number(value), game, naming)
              : { value, label: value.split('+').map((seat) => seatName(Number(seat), naming)).join(' + ') },
          ),
        };
      }
      case 'own':
        return { id, title: S.chooseYours, kind: 'tiles', options: values.map(cardOption) };
      case 'color':
        return { id, title: S.chooseColor, kind: 'tiles', options: values.map(colorOption) };
      case 'ownColor':
        return { id, title: S.chooseYourSet, kind: 'tiles', options: values.map(colorOption) };
      case 'hand':
        return {
          id,
          title: S.chooseHandCard,
          kind: 'tiles',
          options: values.map((value) => ({ value, label: S.cardNumber(Number(value) + 1) })),
        };
      case 'burn0':
      case 'burn1': {
        const seats = keyOf('target', moves[0] as Move).split('+');
        const seat = Number(seats[id === 'burn0' ? 0 : 1]);
        return {
          id,
          title: S.chooseHandCardOf(seatName(seat, naming)),
          kind: 'tiles',
          options: values.map((value) => ({ value, label: S.cardNumber(Number(value) + 1) })),
        };
      }
      case 'double':
        return {
          id,
          title: S.chooseDouble,
          kind: 'buttons',
          options: values.map((value) => ({ value, label: value === 'yes' ? S.withDouble : S.withoutDouble })),
        };
    }
  }
  return null;
}

/** نص تأثير الكرت الملعوب (يطلع تحت الكرت بالنافذة). */
export function cardEffect(cardId: string): string {
  const card = cardById(cardId);
  return card ? effectText(card) : '';
}
