import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { WinTarget } from './src/data/rules';
import { GameScreen } from './src/ui/GameScreen';
import { StartScreen } from './src/ui/StartScreen';

interface Match {
  readonly winTarget: WinTarget;
  readonly seed: number;
}

// المرحلة 7: لعب محلي ضد 3 بوتات. الشاشة مقفولة على العرض من app.json.
export default function App() {
  const [match, setMatch] = useState<Match | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      {match ? (
        <GameScreen key={match.seed} winTarget={match.winTarget} seed={match.seed} onPlayAgain={() => setMatch(null)} />
      ) : (
        // بذرة الخلط تجي من الواجهة (الوقت الحالي)؛ المحرك نفسه ما يستخدم وقت النظام.
        <StartScreen onStart={(winTarget) => setMatch({ winTarget, seed: Date.now() % 2147483647 })} />
      )}
    </SafeAreaProvider>
  );
}
