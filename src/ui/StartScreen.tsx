// شاشة بداية بسيطة للمرحلة 7: اختيار شرط الفوز وبدء اللعب ضد البوتات.
// شاشات البداية الكاملة (اللغة، الاسم، الرئيسية) تنبني في المرحلة 10.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WIN_TARGETS, type WinTarget } from '../data/rules';
import { S } from './strings';
import { theme } from './theme';

interface StartScreenProps {
  readonly onStart: (winTarget: WinTarget) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [winTarget, setWinTarget] = useState<WinTarget>(WIN_TARGETS[0]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.brand}>
        <Text style={styles.logo}>{S.appName}</Text>
        <Text style={styles.text}>{S.tagline}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{S.playVsBots}</Text>
        <Text style={styles.label}>{S.winCondition}</Text>
        <View style={styles.row}>
          {WIN_TARGETS.map((target) => (
            <Pressable
              key={target}
              testID={`start-${target}`}
              accessibilityRole="button"
              accessibilityState={{ selected: winTarget === target }}
              style={[styles.choice, winTarget === target && styles.choiceOn]}
              onPress={() => setWinTarget(target)}
            >
              <Text style={[styles.choiceText, winTarget === target && styles.choiceTextOn]}>{S.sets(target)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable testID="start-go" accessibilityRole="button" style={styles.primary} onPress={() => onStart(winTarget)}>
          <Text style={styles.primaryText}>{S.start}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.ground,
  },
  brand: {
    flex: 1,
    backgroundColor: theme.felt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  logo: {
    color: theme.gold,
    fontSize: 56,
    fontWeight: '800',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  label: {
    color: theme.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  text: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  choice: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: {
    backgroundColor: theme.gold,
    borderColor: theme.gold,
  },
  choiceText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  choiceTextOn: {
    color: theme.cardInk,
    fontWeight: '800',
  },
  primary: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.cardInk,
    fontSize: 20,
    fontWeight: '800',
  },
});
