// إخفاء اليد: كل لاعب يستلم يده فقط — prd.md القسم 8 و CLAUDE.md القسم 6
// أيدي الباقين وترتيب كومة السحب وبذرة العشوائية ما توصل للجهاز أبداً.

import type { Card } from '../data/cards';
import type { Effect, GameState } from '../engine/state';

/** كرت مخفي: يحفظ العدد فقط وما يكشف أي معلومة عن الكرت الحقيقي. */
function hiddenCard(index: number): Card {
  return { id: `hidden:${index}`, kind: 'joker' };
}

function hiddenCards(count: number): Card[] {
  return Array.from({ length: count }, (_, index) => hiddenCard(index));
}

export function isHiddenCard(card: Card): boolean {
  return card.id.startsWith('hidden:');
}

/** الكرت المختار بدون رؤية (ورثتك، مخالفه) ما ينكشف إلا لصاحب اليد. */
function maskEffect(effect: Effect, viewerSeat: number): Effect {
  if (effect.params.pickedCardId === undefined || effect.target === viewerSeat) return effect;
  const { pickedCardId: _hidden, ...params } = effect.params;
  return { ...effect, params };
}

/** نسخة من الحالة آمنة للإرسال للاعب معيّن. */
export function maskStateFor(state: GameState, viewerSeat: number): GameState {
  const revealedTarget = state.revealed?.viewer === viewerSeat ? state.revealed.target : null;

  return {
    ...state,
    seed: 0,
    drawPile: hiddenCards(state.drawPile.length),
    players: state.players.map((player) =>
      player.seat === viewerSeat || player.seat === revealedTarget
        ? player
        : { ...player, hand: hiddenCards(player.hand.length) },
    ),
    // اليد المكشوفة بـ"اكشف" تخص اللاعب اللي كشفها فقط.
    revealed: state.revealed?.viewer === viewerSeat ? state.revealed : null,
    queue: state.queue.map((effect) => maskEffect(effect, viewerSeat)),
    response: state.response
      ? {
          ...state.response,
          effect: maskEffect(state.response.effect, viewerSeat),
          standing: state.response.standing
            ? {
                ...state.response.standing,
                bounce: state.response.standing.bounce ? maskEffect(state.response.standing.bounce, viewerSeat) : null,
              }
            : null,
        }
      : null,
  };
}
