// خادم داخل الذاكرة: يشغّل نفس منطق الغرفة (room.ts) بدون شبكة.
// يُستخدم للاختبارات، ويثبت أن التطبيق يشتغل على واجهة Transport قبل ربط Supabase.

import { createRng, nextSeed } from '../engine/rng';
import {
  createRoom,
  generateRoomCode,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick,
  type Room,
  type RoomResult,
  type RoomSnapshot,
} from './room';
import type { NetResult, Transport } from './transport';

/** كل كم ملي ثانية ينبض الخادم (حركات البوتات والمؤقت). */
const TICK_MS = 250;

export interface MemoryHost {
  /** اتصال لاعب واحد بهوية ثابتة. */
  transportFor(playerId: string): Transport;
  /** الحالة الكاملة للغرفة (للاختبارات فقط، ما توصل لأي لاعب). */
  roomOf(code: string): Room | undefined;
}

export function createMemoryHost(seed: number, now: () => number): MemoryHost {
  const rooms = new Map<string, Room>();
  const listeners = new Map<string, Map<string, Set<(snapshot: RoomSnapshot) => void>>>();
  let nextRandom = seed;

  const random = (): number => {
    nextRandom = nextSeed(createRng(nextRandom));
    return nextRandom;
  };

  /** يبث لكل لاعب لقطته الخاصة (يده فقط). */
  const broadcast = (code: string): void => {
    const room = rooms.get(code);
    const roomListeners = listeners.get(code);
    if (!room || !roomListeners) return;
    for (const [playerId, callbacks] of roomListeners) {
      const snapshot = snapshotFor(room, playerId);
      if (!snapshot) continue;
      for (const callback of callbacks) callback(snapshot);
    }
  };

  const commit = (result: RoomResult, playerId: string): NetResult => {
    if (!result.ok) return result;
    rooms.set(result.room.code, result.room);
    broadcast(result.room.code);
    return { ok: true, snapshot: snapshotFor(result.room, playerId) };
  };

  const withRoom = (code: string, playerId: string, run: (room: Room) => RoomResult): NetResult => {
    const room = rooms.get(code.toUpperCase());
    return room ? commit(run(room), playerId) : { ok: false, error: 'notInRoom' };
  };

  return {
    roomOf: (code) => rooms.get(code),
    transportFor: (playerId) => ({
      createRoom: async (name) => {
        let code = generateRoomCode(createRng(random()));
        while (rooms.has(code)) code = generateRoomCode(createRng(random()));
        return commit(createRoom(code, playerId, name), playerId);
      },
      joinRoom: async (code, name) => withRoom(code, playerId, (room) => joinRoom(room, playerId, name)),
      setWinTarget: async (code, winTarget) => withRoom(code, playerId, (room) => setWinTarget(room, playerId, winTarget)),
      start: async (code) => withRoom(code, playerId, (room) => startRoom(room, playerId, random(), now())),
      sendMove: async (code, move) => withRoom(code, playerId, (room) => submitMove(room, playerId, move, now())),
      leave: async (code) => withRoom(code, playerId, (room) => leaveRoom(room, playerId)),
      subscribe: (code, onSnapshot) => {
        const key = code.toUpperCase();
        const roomListeners = listeners.get(key) ?? new Map<string, Set<(snapshot: RoomSnapshot) => void>>();
        listeners.set(key, roomListeners);
        const callbacks = roomListeners.get(playerId) ?? new Set<(snapshot: RoomSnapshot) => void>();
        roomListeners.set(playerId, callbacks);
        callbacks.add(onSnapshot);

        // نبض الخادم: البوتات والمؤقت.
        const interval = setInterval(() => {
          const room = rooms.get(key);
          if (!room) return;
          const next = tick(room, now());
          if (next !== room) {
            rooms.set(key, next);
            broadcast(key);
          }
        }, TICK_MS);

        return () => {
          clearInterval(interval);
          callbacks.delete(onSnapshot);
        };
      },
    }),
  };
}
