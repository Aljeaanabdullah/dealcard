import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_AVATAR } from './src/data/avatars';
import type { WinTarget } from './src/data/rules';
import type { Account, Profile } from './src/net/account';
import type { RoomSnapshot } from './src/net/room';
import { createSupabaseBackend } from './src/net/supabaseTransport';
import type { Transport } from './src/net/transport';
import { AuthScreen } from './src/ui/AuthScreen';
import { GameScreen } from './src/ui/GameScreen';
import { HomeScreen } from './src/ui/HomeScreen';
import { OnlineGame } from './src/ui/OnlineGame';
import { SplashScreen } from './src/ui/SplashScreen';

type Screen =
  | { readonly kind: 'splash' }
  | { readonly kind: 'auth' }
  | { readonly kind: 'home' }
  | { readonly kind: 'bots'; readonly winTarget: WinTarget; readonly seed: number }
  | { readonly kind: 'online'; readonly snapshot: RoomSnapshot };

/** مدة شاشة البداية (اللوقو وشريط التحميل). */
const SPLASH_MS = 2500;

interface AppProps {
  /** للاختبارات فقط: خادم بديل. بدون تحديد = Supabase من .env (أو null إذا مو مجهز). */
  readonly transport?: Transport | null;
  /** للاختبارات فقط: خدمة حسابات بديلة (تنستخدم مع transport). */
  readonly account?: Account | null;
  /** للاختبارات: 0 = بدون شاشة البداية. */
  readonly splashMs?: number;
}

// الشاشة مقفولة على العرض من app.json.
export default function App({ transport, account, splashMs = SPLASH_MS }: AppProps) {
  const [backend] = useState<{ readonly transport: Transport | null; readonly account: Account | null }>(() => {
    if (transport !== undefined) return { transport, account: account ?? null };
    return createSupabaseBackend() ?? { transport: null, account: null };
  });
  // بعد اللوقو: شاشة الدخول (حسابي / حساب جديد / ضيف). بدون خدمة حسابات يروح للرئيسية مباشرة كضيف.
  const first: Screen = backend.account ? { kind: 'auth' } : { kind: 'home' };
  const [screen, setScreen] = useState<Screen>(splashMs > 0 ? { kind: 'splash' } : first);
  // الاسم والشخصية يبقون طول ما التطبيق مفتوح، وينحفظون على الحساب إذا اللاعب مسجل دخوله.
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [email, setEmail] = useState<string | null>(null);

  const goHome = () => setScreen({ kind: 'home' });
  // بذرة الخلط تجي من الواجهة (الوقت الحالي)؛ المحرك نفسه ما يستخدم وقت النظام.
  const playBots = (winTarget: WinTarget) => setScreen({ kind: 'bots', winTarget, seed: Date.now() % 2147483647 });
  const enterRoom = (snapshot: RoomSnapshot) => setScreen({ kind: 'online', snapshot });

  const changeProfile = (profile: Profile) => {
    setName(profile.name);
    setAvatar(profile.avatar);
    if (email !== null) void backend.account?.saveProfile(profile);
  };

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      {screen.kind === 'splash' ? (
        <SplashScreen durationMs={splashMs} onDone={() => setScreen(first)} />
      ) : screen.kind === 'auth' && backend.account ? (
        <AuthScreen
          account={backend.account}
          name={name}
          avatar={avatar}
          onSignedIn={(signedEmail, profile) => {
            setEmail(signedEmail);
            // الحساب اللي ما فيه اسم محفوظ يحتفظ بالاسم الحالي.
            setName(profile.name === '' ? name : profile.name);
            setAvatar(profile.avatar);
            goHome();
          }}
          onGuest={(guestName) => {
            setName(guestName);
            goHome();
          }}
        />
      ) : screen.kind === 'bots' ? (
        <GameScreen
          key={screen.seed}
          winTarget={screen.winTarget}
          seed={screen.seed}
          avatar={avatar}
          onPlayAgain={() => playBots(screen.winTarget)}
          onExit={goHome}
        />
      ) : screen.kind === 'online' && backend.transport ? (
        <OnlineGame
          key={screen.snapshot.code}
          transport={backend.transport}
          initial={screen.snapshot}
          onExit={goHome}
          onEnterRoom={enterRoom}
        />
      ) : (
        <HomeScreen
          transport={backend.transport}
          account={backend.account}
          name={name}
          avatar={avatar}
          email={email}
          onProfileChange={changeProfile}
          onOpenAuth={() => setScreen({ kind: 'auth' })}
          onSignedOut={() => {
            setEmail(null);
            setScreen({ kind: 'auth' });
          }}
          onPlayBots={playBots}
          onEnterRoom={enterRoom}
        />
      )}
    </SafeAreaProvider>
  );
}
