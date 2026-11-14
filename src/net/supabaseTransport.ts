// الاتصال بالخادم الحقيقي على Supabase.
//
// تنبيه: هذا الملف ما انختبر، يحتاج مشروع Supabase حقيقي (انظر README).
// المفاتيح تنقرأ من .env فقط: رابط المشروع والمفتاح العام (anon). مفتاح service_role ما ينحط هنا أبداً.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Move } from '../engine/moves';
import type { RoomSnapshot } from './room';
import type { NetResult, Transport } from './transport';

/** كل كم ملي ثانية يطلب التطبيق نبضة من الخادم (البوتات والمؤقت)، وتشتغل كبديل إذا تأخر التحديث المباشر. */
const TICK_MS = 1000;

/** يرجّع null إذا مفاتيح Supabase مو موجودة بالـ.env (اللعب أونلاين مو مجهز). */
export function createSupabaseTransport(): Transport | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });

  /** دخول كضيف (مرة وحدة لكل تشغيل). */
  let signIn: Promise<string | null> | null = null;
  const userId = (): Promise<string | null> => {
    signIn ??= client.auth.signInAnonymously().then(({ data, error }) => (error ? null : (data.user?.id ?? null)));
    return signIn;
  };

  const call = async (body: Record<string, unknown>): Promise<NetResult> => {
    if ((await userId()) === null) return { ok: false, error: 'unauthorized' };
    const { data, error } = await client.functions.invoke('room', { body });
    if (error || data === null || typeof data !== 'object') return { ok: false, error: 'network' };
    return data as NetResult;
  };

  return {
    createRoom: (name) => call({ action: 'create', name }),
    joinRoom: (code, name) => call({ action: 'join', code, name }),
    joinRandom: (name) => call({ action: 'random', name }),
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
}
