// تنفيذ تأثير كرت أكشن أو إيجار على مستهدف واحد — المصدر: prd.md القسم 5.4
// نفس الدالة تُستخدم للتأثير الأصلي وللتأثير المعكوس بـ"حيور" (تتبدل الأدوار فقط).

import type { ActionId } from '../data/cards';
import { COLORS } from '../data/colors';
import {
  addDebt,
  checkWin,
  detachBrokenBuildings,
  getPlayer,
  removableFromCompleteSets,
  stealableJokers,
  stealableProperties,
  transferProperties,
  withPlayer,
} from './core';
import { done, fail, type MoveResult } from './result';
import { completeColors, isSetComplete } from './sets';
import type { Effect, EffectParams, GameState } from './state';

/** كروت التبديل: "حيور" يلغيها فقط. */
export const SWAP_ACTIONS: readonly (ActionId | 'rent')[] = ['baddel', 'endebes', 'etHas'];

/** كروت السرقة اللي صاحب "حيور" يختار فيها وش ياخذ من صاحب الأكشن. */
export const CHOICE_ACTIONS: readonly (ActionId | 'rent')[] = [
  'boog',
  'boogDouble',
  'boogJoker',
  'rahatAlek',
  'ezalah',
  'werathtek',
  'mukhalafah',
];

/** ينفذ التأثير. يرجّع الحالة الجديدة، أو سبب عدم إمكانية التنفيذ. */
export function applyEffect(state: GameState, effect: Effect): MoveResult {
  const { actor, target, params } = effect;
  // "حصانه" تحمي من كل شي.
  if (state.immune.includes(target)) return fail('invalidTarget');

  const me = getPlayer(state, actor);
  const them = getPlayer(state, target);
  const targetIds = params.targetCardIds ?? [];

  switch (effect.action) {
    // ---------- الدفع والإيجار ----------
    case 'rent':
    case 'qarqash':
    case 'qardIskan':
    case 'eyadi':
    case 'tathmeen':
      return done(addDebt(state, target, actor, effect.amount));

    // ---------- السرقة والتبديل ----------
    case 'boog':
    case 'boogDouble': {
      const stealable = stealableProperties(them);
      // "دبل" يسرق عقارين، وإذا ما فيه إلا واحد ينسرق يسرق الواحد.
      const needed = effect.action === 'boog' ? 1 : Math.min(2, stealable.length);
      if (needed === 0 || targetIds.length !== needed || new Set(targetIds).size !== needed) return fail('invalidCard');
      if (!targetIds.every((id) => stealable.some((p) => p.card.id === id))) return fail('invalidCard');
      return done(checkWin(transferProperties(state, target, actor, targetIds), actor));
    }
    case 'boogJoker': {
      const jokerId = targetIds[0];
      if (targetIds.length !== 1 || !stealableJokers(them).some((p) => p.card.id === jokerId)) return fail('invalidCard');
      if (params.color === undefined) return fail('colorRequired');
      return done(checkWin(transferProperties(state, target, actor, targetIds, params.color), actor));
    }
    case 'baddel': {
      const theirId = targetIds[0];
      const ownId = params.ownCardId;
      if (targetIds.length !== 1 || ownId === undefined) return fail('invalidCard');
      if (!stealableProperties(them).some((p) => p.card.id === theirId)) return fail('invalidCard');
      if (!stealableProperties(me).some((p) => p.card.id === ownId)) return fail('invalidCard');
      const swapped = transferProperties(transferProperties(state, target, actor, targetIds), actor, target, [ownId]);
      return done(checkWin(swapped, actor, target));
    }
    case 'rahatAlek': {
      const color = params.color;
      if (color === undefined) return fail('colorRequired');
      if (!isSetComplete(them.properties, color)) return fail('setNotComplete');
      // الطقم ينتقل كامل: عقاراته والجيكر اللي فيه ومبانيه.
      const next = withPlayer(
        withPlayer(state, {
          ...them,
          properties: them.properties.filter((p) => p.color !== color),
          buildings: them.buildings.filter((b) => b.color !== color),
        }),
        {
          ...me,
          properties: [...me.properties, ...them.properties.filter((p) => p.color === color)],
          buildings: [...me.buildings, ...them.buildings.filter((b) => b.color === color)],
        },
      );
      return done(checkWin(next, actor));
    }
    case 'endebes': {
      const mine = params.ownColor;
      const theirs = params.color;
      if (mine === undefined || theirs === undefined) return fail('colorRequired');
      if (!isSetComplete(me.properties, mine)) return fail('noCompleteSet');
      if (!isSetComplete(them.properties, theirs)) return fail('setNotComplete');
      const nextMe = detachBrokenBuildings({
        ...me,
        properties: [...me.properties.filter((p) => p.color !== mine), ...them.properties.filter((p) => p.color === theirs)],
        buildings: [...me.buildings.filter((b) => b.color !== mine), ...them.buildings.filter((b) => b.color === theirs)],
      });
      const nextThem = detachBrokenBuildings({
        ...them,
        properties: [...them.properties.filter((p) => p.color !== theirs), ...me.properties.filter((p) => p.color === mine)],
        buildings: [...them.buildings.filter((b) => b.color !== theirs), ...me.buildings.filter((b) => b.color === mine)],
      });
      return done(checkWin(withPlayer(withPlayer(state, nextMe), nextThem), actor, target));
    }
    case 'ezalah': {
      const removeId = targetIds[0];
      if (targetIds.length !== 1 || !removableFromCompleteSets(them).some((p) => p.card.id === removeId)) {
        return fail('invalidCard');
      }
      return done(checkWin(transferProperties(state, target, actor, targetIds), actor));
    }

    // ---------- اليد ----------
    case 'etHas':
      return done(withPlayer(withPlayer(state, { ...me, hand: them.hand }), { ...them, hand: me.hand }));
    case 'werathtek': {
      const taken = them.hand.find((c) => c.id === params.pickedCardId);
      if (!taken) return fail('invalidCard');
      return done(
        withPlayer(withPlayer(state, { ...them, hand: them.hand.filter((c) => c.id !== taken.id) }), {
          ...me,
          hand: [...me.hand, taken],
        }),
      );
    }
    case 'mukhalafah': {
      const burned = them.hand.find((c) => c.id === params.pickedCardId);
      if (!burned) return fail('invalidCard');
      return done(
        withPlayer(
          { ...state, firePile: [...state.firePile, burned] },
          { ...them, hand: them.hand.filter((c) => c.id !== burned.id) },
        ),
      );
    }

    // ---------- الدور ----------
    case 'estareeh':
      // التفويت يتراكم: إذا انلعب مرتين على نفس اللاعب يفوّت دورين.
      return done({ ...state, skips: [...state.skips, target] });
    case 'ekshef':
      return done({ ...state, revealed: { viewer: actor, target } });

    default:
      return fail('unsupportedAction');
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

/** كل الاختيارات القانونية لتأثير كرت من لاعب على لاعب. قائمة فاضية = ما ينلعب عليه. */
export function effectOptions(state: GameState, action: ActionId | 'rent', actor: number, target: number): EffectParams[] {
  if (state.immune.includes(target)) return [];
  const me = getPlayer(state, actor);
  const them = getPlayer(state, target);

  switch (action) {
    case 'rent':
    case 'qarqash':
    case 'qardIskan':
    case 'eyadi':
    case 'tathmeen':
    case 'etHas':
    case 'estareeh':
    case 'ekshef':
      return [{}];
    case 'boog':
      return stealableProperties(them).map((p) => ({ targetCardIds: [p.card.id] }));
    case 'boogDouble': {
      const stealable = stealableProperties(them);
      if (stealable.length === 1) return [{ targetCardIds: stealable.map((p) => p.card.id) }];
      return pairs(stealable).map(([a, b]) => ({ targetCardIds: [a.card.id, b.card.id] }));
    }
    case 'boogJoker':
      return stealableJokers(them).flatMap((p) => COLORS.map((color) => ({ targetCardIds: [p.card.id], color: color.id })));
    case 'baddel':
      return stealableProperties(them).flatMap((theirs) =>
        stealableProperties(me).map((mine) => ({ targetCardIds: [theirs.card.id], ownCardId: mine.card.id })),
      );
    case 'rahatAlek':
      return completeColors(them.properties).map((color) => ({ color }));
    case 'endebes':
      return completeColors(me.properties).flatMap((ownColor) =>
        completeColors(them.properties).map((color) => ({ color, ownColor })),
      );
    case 'ezalah':
      return removableFromCompleteSets(them).map((p) => ({ targetCardIds: [p.card.id] }));
    case 'werathtek':
    case 'mukhalafah':
      return them.hand.map((c) => ({ pickedCardId: c.id }));
    default:
      return [];
  }
}
