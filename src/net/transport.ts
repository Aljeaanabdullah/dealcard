// واجهة الاتصال بالخادم. التطبيق يكلم هذي الواجهة فقط، وتحتها تطبيقين:
// - memoryHost: خادم داخل الذاكرة (للاختبار والتجربة بدون إنترنت).
// - supabaseTransport: الخادم الحقيقي على Supabase.

import type { Move } from '../engine/moves';
import type { RoomError, RoomSnapshot } from './room';

export type NetError = RoomError | 'network' | 'unauthorized';

export type NetResult =
  | { readonly ok: true; readonly snapshot: RoomSnapshot | null }
  | { readonly ok: false; readonly error: NetError };

export interface Transport {
  /** avatar = رقم الشخصية اللي اختارها اللاعب (بدون تحديد = الافتراضية) */
  createRoom(name: string, avatar?: number): Promise<NetResult>;
  joinRoom(code: string, name: string, avatar?: number): Promise<NetResult>;
  /** لعب عشوائي: يدخل اللاعب طابور المطابقة بشرط الفوز اللي اختاره (6 أو 8). الإلغاء = leave بكود الغرفة اللي رجعت. */
  joinRandom(name: string, winTarget: number, avatar?: number): Promise<NetResult>;
  setWinTarget(code: string, winTarget: number): Promise<NetResult>;
  start(code: string): Promise<NetResult>;
  sendMove(code: string, move: Move): Promise<NetResult>;
  leave(code: string): Promise<NetResult>;
  /** يتابع تحديثات الغرفة للاعب. يرجّع دالة توقف المتابعة. */
  subscribe(code: string, onSnapshot: (snapshot: RoomSnapshot) => void): () => void;
}
