// مدخل كود الخادم: نفس منطق الغرفة والمحرك، ينحزم بملف واحد لدالة Supabase (npm run build:server).
export {
  createRoom,
  generateRoomCode,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick,
} from './room';
export type { Room, RoomError, RoomResult, RoomSnapshot } from './room';
export { createRng } from '../engine/rng';
