// شكل الكرت: شريط ملوّن، النوع، الاسم، وسطر صغير — حسب المرجع البصري في design/

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Card } from '../data/cards';
import { cardInfo } from './describe';
import { theme } from './theme';

interface CardViewProps {
  readonly card: Card;
  readonly width: number;
  readonly height: number;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly testID?: string;
}

export function CardView({ card, width, height, selected = false, onPress, testID }: CardViewProps) {
  const info = cardInfo(card);
  const nameSize = Math.max(11, Math.min(16, width * 0.2));

  const body = (
    <View style={[styles.card, { width, height }, selected && styles.selected]}>
      <View style={[styles.band, { backgroundColor: info.band, height: Math.max(10, height * 0.15) }]} />
      <Text style={styles.kind} numberOfLines={1}>
        {info.kind}
      </Text>
      <View style={styles.nameBox}>
        <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={2} adjustsFontSizeToFit>
          {info.name}
        </Text>
      </View>
      <Text style={styles.sub} numberOfLines={1}>
        {info.sub}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={`${info.kind} ${info.name}`}>
      {body}
    </Pressable>
  );
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
  card: {
    backgroundColor: theme.cardFace,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  selected: {
    borderWidth: 3,
    borderColor: theme.gold,
  },
  band: {
    alignSelf: 'stretch',
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
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  back: {
    backgroundColor: '#1F3C88',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: theme.gold,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
});
