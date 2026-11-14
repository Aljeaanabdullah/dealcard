// مباراة محلية ضد 3 بوتات: تدير المباراة وتعرضها على شاشة الطاولة.
// اللاعب يشوف يده فقط حتى باللعب المحلي (نفس إخفاء الأيدي المستخدم أونلاين).

import type { WinTarget } from '../data/rules';
import { legalMoves } from '../engine/moves';
import { maskStateFor } from '../net/mask';
import { HUMAN_SEAT, LOCAL_NAMING } from './describe';
import { TableScreen } from './TableScreen';
import { useGame } from './useGame';

interface GameScreenProps {
  readonly winTarget: WinTarget;
  readonly seed: number;
  /** مباراة جديدة بنفس شرط الفوز */
  readonly onPlayAgain: () => void;
  /** خروج للبداية */
  readonly onExit: () => void;
}

export function GameScreen({ winTarget, seed, onPlayAgain, onExit }: GameScreenProps) {
  const { game, secondsLeft, event, lastAttack, play } = useGame(winTarget, seed);

  return (
    <TableScreen
      game={maskStateFor(game, HUMAN_SEAT)}
      moves={legalMoves(game).filter((move) => move.seat === HUMAN_SEAT)}
      naming={LOCAL_NAMING}
      secondsLeft={secondsLeft}
      event={event}
      lastAttack={lastAttack}
      onMove={play}
      onPlayAgain={onPlayAgain}
      onExit={onExit}
    />
  );
}
