// الاتصال بالخادم الحقيقي على Supabase: الغرف واللعب (Transport) وحساب اللاعب (Account).
//
// المفاتيح تنقرأ من .env فقط: رابط المشروع والمفتاح العام (anon). مفتاح service_role ما ينحط هنا أبداً.
// الدخول: اللاعب ضيف افتراضياً، وإذا سجّل دخوله بإيميل وكلمة سر يلعب بحسابه.
// تنبيه: التسجيل بالإيميل يشتغل بدون رسالة تأكيد فقط إذا "Confirm email" مطفي بإعدادات المشروع.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Move } from '../engine/moves';
import { checkCredentials, cleanEmail, readProfile, type Account, type AccountError, type AccountResult } from './account';
import type { RoomSnapshot } from './room';
import type { NetResult, Transport } from './transport';

/** كل كم ملي ثانية يطلب التطبيق نبضة من الخادم (البوتات والمؤقت)، وتشتغل كبديل إذا تأخر التحديث المباشر. */
const TICK_MS = 1000;

export interface Backend {
  readonly transport: Transport;
  readonly account: Account;
}

function accountError(code: string | undefined): AccountError {
  switch (code) {
    case 'invalid_credentials':
      return 'wrongLogin';
    case 'user_already_exists':
    case 'email_exists':
      return 'emailTaken';
    case 'weak_password':
      return 'weakPassword';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalidEmail';
    case 'email_not_confirmed':
      return 'confirmEmail';
    default:
      return 'network';
  }
}

/** يرجّع null إذا مفاتيح Supabase مو موجودة بالـ.env (اللعب أونلاين مو مجهز). */
export function createSupabaseBackend(): Backend | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });

  /** هوية اللاعب الحالية: حسابه إذا سجّل دخوله، وإلا دخول كضيف (مرة وحدة لكل تشغيل). */
  let signedIn: Promise<string | null> | null = null;
  const userId = (): Promise<string | null> => {
    signedIn ??= client.auth.signInAnonymously().then(({ data, error }) => (error ? null : (data.user?.id ?? null)));
    return signedIn;
  };

  const call = async (body: Record<string, unknown>): Promise<NetResult> => {
    if ((await userId()) === null) return { ok: false, error: 'unauthorized' };
    const { data, error } = await client.functions.invoke('room', { body });
    if (error || data === null || typeof data !== 'object') return { ok: false, error: 'network' };
    return data as NetResult;
  };

  const account: Account = {
    signIn: async (email, password): Promise<AccountResult> => {
      const invalid = checkCredentials(email, password);
      if (invalid) return { ok: false, error: invalid };
      const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail(email), password });
      if (error || !data.user) return { ok: false, error: accountError(error?.code) };
      signedIn = Promise.resolve(data.user.id);
      return { ok: true, email: data.user.email ?? cleanEmail(email), profile: readProfile(data.user.user_metadata) };
    },
    signUp: async (email, password, profile): Promise<AccountResult> => {
      const invalid = checkCredentials(email, password);
      if (invalid) return { ok: false, error: invalid };
      const { data, error } = await client.auth.signUp({
        email: cleanEmail(email),
        password,
        options: { data: { name: profile.name, avatar: profile.avatar } },
      });
      if (error || !data.user) return { ok: false, error: accountError(error?.code) };
      // بدون جلسة = المشروع يطلب تأكيد الإيميل برسالة.
      if (!data.session) return { ok: false, error: 'confirmEmail' };
      signedIn = Promise.resolve(data.user.id);
      return { ok: true, email: data.user.email ?? cleanEmail(email), profile };
    },
    signOut: async () => {
      await client.auth.signOut();
      // يرجع ضيف بأول طلب بعدها.
      signedIn = null;
    },
    saveProfile: async (profile) => {
      const { data } = await client.auth.getSession();
      // الضيف ما له حساب ينحفظ عليه.
      if (!data.session || data.session.user.is_anonymous) return;
      await client.auth.updateUser({ data: { name: profile.name, avatar: profile.avatar } });
    },
  };

  const transport: Transport = {
    createRoom: (name, avatar) => call({ action: 'create', name, avatar }),
    joinRoom: (code, name, avatar) => call({ action: 'join', code, name, avatar }),
    joinRandom: (name, winTarget, avatar) => call({ action: 'random', name, winTarget, avatar }),
    setWinTarget: (code, winTarget) => call({ action: 'setWinTarget', code, winTarget }),
    start: (code) => call({ action: 'start', code }),
    sendMove: (code, move: Move) => call({ action: 'move', code, move }),
    leave: (code) => call({ action: 'leave', code }),
    subscribe: (code, onSnapshot) => {
      let stopped = false;
      const deliver = (snapshot: RoomSnapshot | null | undefined) => {
        if (!stopped && snapshot) onSnapshot(snapshot);
      };

      // التحديث المباشر: تغييرات صف اللاعب في player_views (RLS يسمح له بصفه فقط).
      const channel = client
        .channel(`room-${code}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'player_views', filter: `room_code=eq.${code}` }, (payload) => {
          const row = payload.new as { snapshot?: RoomSnapshot } | null;
          deliver(row?.snapshot);
        })
        .subscribe();

      // نبض الخادم: يحرك البوتات والمؤقت، ويرجّع اللقطة الحالية.
      const interval = setInterval(() => {
        void call({ action: 'tick', code }).then((result) => {
          if (result.ok) deliver(result.snapshot);
        });
      }, TICK_MS);

      return () => {
        stopped = true;
        clearInterval(interval);
        void client.removeChannel(channel);
      };
    },
  };

  return { transport, account };
}
