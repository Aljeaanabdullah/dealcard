// شخصية اللاعب داخل دائرة — صورة من avatarImages.ts، والمقعد اللي ما له شخصية يطلع له وجه روبوت مرسوم

import { Image, View } from 'react-native';

import { BOT_AVATAR } from '../data/avatars';
import { avatarImage } from './avatarImages';
import { botDrawing } from './avatarShapes';
import { theme } from './theme';

interface AvatarProps {
  /** رقم الشخصية، أو BOT_AVATAR للبوت */
  readonly avatar: number;
  readonly size: number;
  /** إطار ذهبي (الشخصية المختارة) */
  readonly selected?: boolean;
  readonly testID?: string;
}

export function Avatar({ avatar, size, selected = false, testID }: AvatarProps) {
  const ring = Math.max(2, Math.round(size * 0.06));
  const inner = size - ring * 2;
  const drawing = avatar === BOT_AVATAR ? botDrawing(inner) : null;
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: selected ? theme.gold : theme.text,
        overflow: 'hidden',
        backgroundColor: drawing?.background ?? theme.panel,
      }}
    >
      {drawing ? (
        drawing.layers.map((layer) => <View key={layer.key} style={layer.style} />)
      ) : (
        <Image source={avatarImage(avatar)} style={{ width: inner, height: inner }} resizeMode="cover" />
      )}
    </View>
  );
}
