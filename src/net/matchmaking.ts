// اللعب العشوائي (المطابقة التلقائية) — plan.md المرحلة 9، و prd.md القسمين 4 و 6
// طابور انتظار يجمع اللاعبين في غرف من 4. دوال خالصة: الخادم يعطيها الغرف الحالية والوقت.

import { createMatchRoom, isActiveFor, isOpenMatch, joinMatchRoom, type Room, type RoomError } from './room';

export type MatchResult =
  | {
      readonly ok: true;
      readonly room: Room;
      /** الغرفة تغيّرت ولازم تنحفظ (false = اللاعب أصلاً داخلها) */
      readonly changed: boolean;
    }
  | { readonly ok: false; readonly error: RoomError };

/**
 * لاعب يضغط "لعب عشوائي":
 * - إذا هو أصلاً داخل غرفة ما انتهت، يرجع لها (لاعب ما يدخل مباراتين بنفس الوقت).
 * - وإلا يدخل أقدم غرفة عشوائية مفتوحة، وإذا اكتمل العدد تبدأ اللعبة.
 * - وإلا تنفتح له غرفة جديدة وينتظر.
 */
export function joinRandomMatch(
  rooms: readonly Room[],
  playerId: string,
  name: string,
  newCode: string,
  seed: number,
  now: number,
): MatchResult {
  const current = rooms.find((room) => isActiveFor(room, playerId));
  if (current) return { ok: true, room: current, changed: false };

  const open = rooms
    .filter(isOpenMatch)
    .sort((a, b) => (a.match?.openedAt ?? 0) - (b.match?.openedAt ?? 0))[0];
  const result = open ? joinMatchRoom(open, playerId, name, now) : createMatchRoom(newCode, playerId, name, seed, now);
  return result.ok ? { ok: true, room: result.room, changed: true } : result;
}
