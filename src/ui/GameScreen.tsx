// مباراة محلية ضد 3 بوتات: تدير المباراة وتعرضها على شاشة الطاولة.
// اللاعب يشوف يده فقط حتى باللعب المحلي (نفس إخفاء الأيدي المستخدم أونلاين).

import { useMemo } from 'react';

import type { WinTarget } from '../data/rules';
import { legalMoves } from '../engine/moves';
import { maskStateFor } from '../net/mask';
import { HUMAN_SEAT, localNaming } from './describe';
import { TableScreen } from './TableScreen';
import { useGame } from './useGame';

interface GameScreenProps {
  readonly winTarget: WinTarget;
  readonly seed: number;
  /** شخصية اللاعب */
  readonly avatar: number;
  /** مباراة جديدة بنفس شرط الفوز */
  readonly onPlayAgain: () => void;
  /** خروج للبداية */
  readonly onExit: () => void;
}

export function GameScreen({ winTarget, seed, avatar, onPlayAgain, onExit }: GameScreenProps) {
  // أسماء البوتات تتغير كل مباراة (من بذرة المباراة).
  const naming = useMemo(() => localNaming(seed, avatar), [seed, avatar]);
  const { game, secondsLeft, event, lastAttack, play } = useGame(winTarget, seed, naming);

  return (
    <TableScreen
      game={maskStateFor(game, HUMAN_SEAT)}
      moves={legalMoves(game).filter((move) => move.seat === HUMAN_SEAT)}
      naming={naming}
      secondsLeft={secondsLeft}
      event={event}
      lastAttack={lastAttack}
      onMove={play}
      onPlayAgain={onPlayAgain}
      onExit={onExit}
    />
  );
}
