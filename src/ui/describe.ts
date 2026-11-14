// معلومات عرض الكروت، ووصف الحركات والتأثيرات كنص للاعب.

import { pickBotAvatars, pickBotNames } from '../bot/names';
import { BOT_AVATAR, DEFAULT_AVATAR } from '../data/avatars';
import { PLAYER_COUNT } from '../data/rules';
import { createRng } from '../engine/rng';
import { ACTIONS, buildDeck, BUILDINGS, RENTS, type ActionId, type Card } from '../data/cards';
import { getColor, type ColorId } from '../data/colors';
import type { Move } from '../engine/moves';
import { cardValue, rentFor } from '../engine/payment';
import type { Effect, GameState } from '../engine/state';
import { S } from './strings';
import { BAND, CARD_FILL, SET_COLORS } from './theme';

/** مقعد اللاعب باللعب المحلي ضد البوتات. */
export const HUMAN_SEAT = 0;

/** من أنا، وأسماء اللاعبين حسب المقعد. الاسم الفاضي = بوت. */
export interface Naming {
  readonly mySeat: number;
  readonly names: readonly string[];
  /** أي المقاعد بوتات (بدون تحديد: المقعد اللي اسمه فاضي) */
  readonly bots?: readonly boolean[];
  /** شخصية كل مقعد (بدون تحديد: الافتراضية لي، والروبوت للباقين) */
  readonly avatars?: readonly number[];
}

/** التسمية باللعب المحلي: أنا بالمقعد 0 والباقي بوتات. */
export const LOCAL_NAMING: Naming = { mySeat: HUMAN_SEAT, names: ['', '', '', ''] };

export function seatName(seat: number, naming: Naming): string {
  if (seat === naming.mySeat) return S.you;
  const name = naming.names[seat] ?? '';
  if (name.length === 0) return S.bot(seat);
  // البوت يبان باسمه ويمّه إيموجي.
  return naming.bots?.[seat] === true ? S.botName(name) : name;
}

/** شخصية اللاعب بالمقعد. */
export function seatAvatar(seat: number, naming: Naming): number {
  const avatar = naming.avatars?.[seat];
  if (avatar !== undefined) return avatar;
  return seat === naming.mySeat ? DEFAULT_AVATAR : BOT_AVATAR;
}

/** التسمية بمباراة محلية: أنا بالمقعد 0، والبوتات الثلاثة ياخذون أسماء وشخصيات عشوائية (مبذورة). */
export function localNaming(seed: number, avatar: number): Naming {
  const rng = createRng(seed + 1);
  const botNames = pickBotNames(rng, PLAYER_COUNT - 1);
  const botAvatars = pickBotAvatars(rng, botNames, [avatar]);
  return {
    mySeat: HUMAN_SEAT,
    names: ['', ...botNames],
    bots: [false, ...botNames.map(() => true)],
    avatars: [avatar, ...botAvatars],
  };
}

export function colorName(color: ColorId): string {
  return getColor(color).name;
}

export function actionName(action: ActionId): string {
  return ACTIONS.find((def) => def.id === action)?.name ?? action;
}

export interface CardInfo {
  /** لون الشريط العلوي */
  readonly band: string;
  /** لون الشريط السفلي (كرت إيجار بلونين: لون فوق ولون تحت) */
  readonly bandBottom?: string;
  /** شريط بكل الألوان (كرت الإيجار اللي يصلح لأي لون) */
  readonly stripes?: readonly string[];
  /** لون وجه الكرت كله (كروت اللون الكامل)؛ والكتابة عليه فاتحة */
  readonly fill?: string;
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
        // يصلح لأي لون: الشريط فوق وتحت بكل ألوان الأطقم.
        return {
          band: BAND.rentAny,
          stripes: Object.values(SET_COLORS),
          kind: S.kindRent,
          name: S.rentOne,
          sub: S.anyColor,
        };
      }
      // كرت بلونين: لون فوق ولون تحت.
      const [first, second] = def.colors;
      return {
        band: first ? SET_COLORS[first] : BAND.rentAny,
        ...(second ? { bandBottom: SET_COLORS[second] } : {}),
        kind: S.kindRent,
        name: S.rentAll,
        sub: def.colors.map(colorName).join(' / '),
      };
    }
    case 'action': {
      const def = ACTIONS.find((d) => d.id === card.action);
      const group = def?.group ?? 'turn';
      const fill = CARD_FILL[card.action];
      return {
        band: fill ?? BAND[group],
        ...(fill !== undefined ? { fill } : {}),
        kind: group === 'defense' ? S.kindDefense : S.kindAction,
        name: def?.name ?? '',
        sub: def && 'amount' in def && def.amount !== undefined ? S.amount(def.amount) : '',
      };
    }
  }
}

/** كل كروت اللعبة حسب المعرّف. المعرّفات ثابتة، فالبحث ما يحتاج الحالة (وأيدي الباقين مخفية أونلاين). */
const DECK = new Map<string, Card>(buildDeck().map((card) => [card.id, card]));

function findCard(cardId: string | undefined): Card | undefined {
  return cardId === undefined ? undefined : DECK.get(cardId);
}

function cardLabel(cardId: string | undefined): string {
  const card = findCard(cardId);
  return card ? cardInfo(card).name : '';
}

function names(cardIds: readonly string[] | undefined): string {
  return (cardIds ?? []).map((id) => cardLabel(id)).join('، ');
}

function join(parts: (string | undefined | false)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' · ');
}

/** يلقى الكرت من معرّفه (المعرّفات ثابتة). */
export function cardById(cardId: string | undefined): Card | undefined {
  return findCard(cardId);
}

/** نص تأثير الكرت مثل ما هو في prd.md. */
export function effectText(card: Card): string {
  if (card.kind === 'action') return S.effect[card.action] ?? '';
  if (card.kind === 'rent') return S.effect.rent ?? '';
  return '';
}

/** الكرت اللي يمثل الأكشن المنتظر بنافذة الرد: الكرت الملعوب نفسه إذا معروف، وإلا كرت من نفس النوع. */
export function attackCard(action: ActionId | 'rent', lastAttack: Move | null): Card | undefined {
  const played = lastAttack && 'cardId' in lastAttack ? findCard(lastAttack.cardId) : undefined;
  if (played && (action === 'rent' ? played.kind === 'rent' : played.kind === 'action')) return played;
  return findCard(action === 'rent' ? 'rent:rentOne:1' : `action:${action}:1`);
}

/** المقاعد اللي انلعب عليها الكرت (عشان ينحط عليهم سهم بالطاولة). */
export function moveTargets(move: Move | null): number[] {
  if (!move) return [];
  const others = [0, 1, 2, 3].filter((seat) => seat !== move.seat);
  if (move.type === 'playRent') return move.targetSeat === undefined ? others : [move.targetSeat];
  if (move.type !== 'playAction') return [];
  if (move.burns !== undefined) return move.burns.map((burn) => burn.seat);
  if (move.targetSeat !== undefined) return [move.targetSeat];
  // "العيادي" على كل اللاعبين.
  const card = findCard(move.cardId);
  const action = move.asAction ?? (card?.kind === 'action' ? card.action : undefined);
  return action === 'eyadi' ? others : [];
}

/** وصف حركة كخيار للاعب (بدون اسم اللاعب). */
export function describeMove(move: Move, state: GameState, naming: Naming): string {
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
      return move.color === undefined ? S.buildLoose : S.buildOn(colorName(move.color));
    case 'placeBuilding':
      return S.buildOn(colorName(move.color));
    case 'burnAction':
      return S.burn;
    case 'pay':
      return S.payConfirm;
    case 'playRent': {
      const base = me ? rentFor(me, move.color) : 0;
      const amount = move.doubleCardId !== undefined ? base * 2 : base;
      return join([
        S.rentOf(colorName(move.color), amount),
        move.targetSeat === undefined ? S.fromAll : S.from(seatName(move.targetSeat, naming)),
        move.doubleCardId !== undefined && S.withDouble,
      ]);
    }
    case 'playAction': {
      const picks = (move.burns ?? []).map((b) => `${seatName(b.seat, naming)}: ${S.handCard(b.handIndex + 1)}`).join('، ');
      return join([
        move.asAction !== undefined && S.as(actionName(move.asAction)),
        move.targetSeat !== undefined && S.on(seatName(move.targetSeat, naming)),
        move.targetCardIds !== undefined && S.takes(names(move.targetCardIds)),
        move.ownCardId !== undefined && S.gives(cardLabel(move.ownCardId)),
        move.ownColor !== undefined && S.gives(S.wholeSet(colorName(move.ownColor))),
        move.color !== undefined &&
          (move.targetCardIds !== undefined ? S.inColor(colorName(move.color)) : S.takes(S.wholeSet(colorName(move.color)))),
        move.handIndex !== undefined && S.handCard(move.handIndex + 1),
        picks,
      ]) || S.playIt;
    }
    case 'respond': {
      if (move.cardId === undefined) return S.noResponse;
      const card = findCard(move.cardId);
      const cardName = move.as !== undefined ? actionName(move.as) : card ? cardInfo(card).name : '';
      const viaTeb = card?.kind === 'action' && card.action === 'tebWetkhayyar';
      return join([
        S.respondWith(viaTeb ? `${actionName('tebWetkhayyar')} ${S.as(cardName)}` : cardName),
        move.payerSeat !== undefined && S.payer(seatName(move.payerSeat, naming)),
        move.bounce?.targetCardIds !== undefined && S.takes(names(move.bounce.targetCardIds)),
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
export function describeEffect(effect: Effect): string {
  const title = effect.action === 'rent' ? S.kindRent : actionName(effect.action);
  return join([
    title,
    effect.amount > 0 && S.amount(effect.amount),
    effect.params.targetCardIds !== undefined && S.takes(names(effect.params.targetCardIds)),
    effect.params.ownCardId !== undefined && S.gives(cardLabel(effect.params.ownCardId)),
    effect.params.ownColor !== undefined && S.gives(S.wholeSet(colorName(effect.params.ownColor))),
    effect.params.color !== undefined &&
      effect.params.targetCardIds === undefined &&
      S.takes(S.wholeSet(colorName(effect.params.color))),
  ]);
}

/** نص الحدث اللي يطلع بعد حركة لاعب. */
export function describeEvent(move: Move, state: GameState, naming: Naming): string {
  const name = seatName(move.seat, naming);
  switch (move.type) {
    case 'draw':
      return S.eventDraw(name);
    case 'endTurn':
      return S.eventEndTurn(name);
    case 'pay': {
      const paid = move.cardIds.reduce((total, id) => {
        const card = findCard(id);
        return total + (card ? cardValue(card) : 0);
      }, 0);
      return S.eventPaid(name, paid);
    }
    case 'respond':
      return move.cardId === undefined ? S.eventPassed(name) : S.eventPlayed(name, describeMove(move, state, naming));
    default: {
      const cardName = 'cardId' in move ? cardLabel(move.cardId) : '';
      return S.eventPlayed(name, join([cardName, describeMove(move, state, naming)]));
    }
  }
}
