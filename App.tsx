import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { WinTarget } from './src/data/rules';
import type { RoomSnapshot } from './src/net/room';
import { createSupabaseTransport } from './src/net/supabaseTransport';
import type { Transport } from './src/net/transport';
import { GameScreen } from './src/ui/GameScreen';
import { HomeScreen } from './src/ui/HomeScreen';
import { OnlineGame } from './src/ui/OnlineGame';

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'bots'; readonly winTarget: WinTarget; readonly seed: number }
  | { readonly kind: 'online'; readonly snapshot: RoomSnapshot };

interface AppProps {
  /** للاختبارات فقط: خادم بديل. بدون تحديد = Supabase من .env (أو null إذا مو مجهز). */
  readonly transport?: Transport | null;
}

// الشاشة مقفولة على العرض من app.json.
export default function App({ transport }: AppProps) {
  const [net] = useState<Transport | null>(() => (transport === undefined ? createSupabaseTransport() : transport));
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  // الاسم المستعار ينكتب مرة وحدة ويبقى طول ما التطبيق مفتوح.
  const [name, setName] = useState('');
  const goHome = () => setScreen({ kind: 'home' });
  // بذرة الخلط تجي من الواجهة (الوقت الحالي)؛ المحرك نفسه ما يستخدم وقت النظام.
  const playBots = (winTarget: WinTarget) => setScreen({ kind: 'bots', winTarget, seed: Date.now() % 2147483647 });
  const enterRoom = (snapshot: RoomSnapshot) => setScreen({ kind: 'online', snapshot });

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      {screen.kind === 'bots' ? (
        <GameScreen
          key={screen.seed}
          winTarget={screen.winTarget}
          seed={screen.seed}
          onPlayAgain={() => playBots(screen.winTarget)}
          onExit={goHome}
        />
      ) : screen.kind === 'online' && net ? (
        <OnlineGame key={screen.snapshot.code} transport={net} initial={screen.snapshot} onExit={goHome} onEnterRoom={enterRoom} />
      ) : (
        <HomeScreen
          transport={net}
          name={name}
          onNameChange={setName}
          onPlayBots={playBots}
          onEnterRoom={enterRoom}
        />
      )}
    </SafeAreaProvider>
  );
}
