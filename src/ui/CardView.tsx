// شكل الكرت: مجسم بحدود وظل، شريط ملوّن، النوع، الاسم، وسطر صغير — حسب المرجع البصري في design/

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Card } from '../data/cards';
import { cardInfo, type CardInfo } from './describe';
import { theme } from './theme';

interface CardViewProps {
  readonly card: Card;
  readonly width: number;
  readonly height: number;
  readonly selected?: boolean;
  /** نص تأثير الكرت، يطلع بدل السطر الصغير (للكروت الكبيرة بالنوافذ) */
  readonly description?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
}

export function CardView({ card, width, height, selected = false, description, onPress, testID }: CardViewProps) {
  const info = cardInfo(card);
  const nameSize = Math.max(10, Math.min(18, width * 0.2));
  const bandHeight = Math.max(8, height * 0.13);

  const body = (
    <View style={[styles.card, { width, height }, selected && styles.selected]}>
      <Band info={info} top height={bandHeight} />
      <Text style={styles.kind} numberOfLines={1}>
        {info.kind}
      </Text>
      <View style={styles.nameBox}>
        <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
          {info.name}
        </Text>
      </View>
      <Text style={styles.sub} numberOfLines={description ? 3 : 1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {description ?? info.sub}
      </Text>
      {info.bandBottom !== undefined || info.stripes !== undefined ? <Band info={info} top={false} height={bandHeight} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${info.kind} ${info.name}`}
    >
      {body}
    </Pressable>
  );
}

/** شريط لون الكرت. كرت الإيجار له شريطين: لون فوق ولون تحت، أو كل الألوان إذا يصلح لأي لون. */
function Band({ info, top, height }: { readonly info: CardInfo; readonly top: boolean; readonly height: number }) {
  if (info.stripes !== undefined) {
    return (
      <View style={[styles.band, styles.stripes, { height }]}>
        {info.stripes.map((color) => (
          <View key={color} style={[styles.stripe, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }
  const color = top ? info.band : (info.bandBottom ?? info.band);
  return <View style={[styles.band, { backgroundColor: color, height }]} />;
}

/** ظهر الكرت (كومة السحب). */
export function CardBack({ width, height, label }: { readonly width: number; readonly height: number; readonly label: string }) {
  return (
    <View style={[styles.back, { width, height }]}>
      <Text style={styles.backText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // شكل مجسم: حد واضح حول الكرت، حافة سفلية أثخن، وظل.
  card: {
    backgroundColor: theme.cardFace,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#8E8674',
    borderBottomWidth: 4,
    borderBottomColor: '#6F6858',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  selected: {
    borderColor: theme.gold,
    borderBottomColor: theme.gold,
    borderWidth: 3,
  },
  band: {
    alignSelf: 'stretch',
  },
  stripes: {
    flexDirection: 'row',
  },
  stripe: {
    flex: 1,
  },
  kind: {
    fontSize: 10,
    color: theme.cardMuted,
    marginTop: 2,
  },
  nameBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  name: {
    color: theme.cardInk,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    fontSize: 10,
    color: theme.cardMuted,
    marginBottom: 3,
    paddingHorizontal: 3,
    textAlign: 'center',
  },
  back: {
    backgroundColor: '#1F3C88',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  backText: {
    color: theme.gold,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
});
