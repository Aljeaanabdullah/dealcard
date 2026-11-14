// شخصية اللاعب داخل دائرة — الرسم من avatarShapes.ts

import { View } from 'react-native';

import { avatarDrawing } from './avatarShapes';
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
  const drawing = avatarDrawing(avatar, inner);
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
        backgroundColor: drawing.background,
      }}
    >
      {drawing.layers.map((layer) => (
        <View key={layer.key} style={layer.style} />
      ))}
    </View>
  );
}
