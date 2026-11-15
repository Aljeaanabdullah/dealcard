// صور شخصيات اللاعبين — prd.md القسم 6
// 12 صورة كرتون أصلية خاصة بـ DEAL Q8 في assets/avatars. رقم الشخصية = مكان صورتها هنا.

import { AVATAR_COUNT, normalizeAvatar } from '../data/avatars';

export const AVATAR_IMAGES: readonly number[] = [
  require('../../assets/avatars/avatar-00.png') as number,
  require('../../assets/avatars/avatar-01.png') as number,
  require('../../assets/avatars/avatar-02.png') as number,
  require('../../assets/avatars/avatar-03.png') as number,
  require('../../assets/avatars/avatar-04.png') as number,
  require('../../assets/avatars/avatar-05.png') as number,
  require('../../assets/avatars/avatar-06.png') as number,
  require('../../assets/avatars/avatar-07.png') as number,
  require('../../assets/avatars/avatar-08.png') as number,
  require('../../assets/avatars/avatar-09.png') as number,
  require('../../assets/avatars/avatar-10.png') as number,
  require('../../assets/avatars/avatar-11.png') as number,
];

if (AVATAR_IMAGES.length !== AVATAR_COUNT) throw new Error('عدد صور الشخصيات لازم يساوي AVATAR_COUNT');

/** صورة الشخصية. أي رقم غلط يرجع للشخصية الافتراضية. */
export function avatarImage(avatar: number): number {
  const image = AVATAR_IMAGES[normalizeAvatar(avatar)];
  if (image === undefined) throw new Error('ما فيه صور شخصيات');
  return image;
}
