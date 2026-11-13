// الشاشة الرئيسية: الاسم المستعار، لعب ضد البوتات، إنشاء غرفة خاصة، أو دخول بكود.
// (اختيار اللغة والإعدادات تنضاف في المرحلة 10.)

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WIN_TARGETS, type WinTarget } from '../data/rules';
import type { RoomSnapshot } from '../net/room';
import type { NetResult, Transport } from '../net/transport';
import { S } from './strings';
import { theme } from './theme';

interface HomeScreenProps {
  /** null = اللعب أونلاين مو مجهز */
  readonly transport: Transport | null;
  readonly onPlayBots: (winTarget: WinTarget) => void;
  readonly onEnterRoom: (snapshot: RoomSnapshot) => void;
}

export function HomeScreen({ transport, onPlayBots, onEnterRoom }: HomeScreenProps) {
  const [winTarget, setWinTarget] = useState<WinTarget>(WIN_TARGETS[0]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const enter = (request: Promise<NetResult>) => {
    setBusy(true);
    setError('');
    void request.then((result) => {
      setBusy(false);
      if (result.ok && result.snapshot) {
        onEnterRoom(result.snapshot);
      } else {
        setError(S.netError(result.ok ? 'network' : result.error));
      }
    });
  };

  const online = transport !== null && !busy;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.brand}>
        <Text style={styles.logo}>{S.appName}</Text>
        <Text style={styles.text}>{S.tagline}</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          testID="name-input"
          accessibilityLabel={S.nickname}
          style={styles.input}
          placeholder={S.namePlaceholder}
          placeholderTextColor={theme.muted}
          value={name}
          onChangeText={setName}
          maxLength={16}
        />

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
        <Pressable testID="start-go" accessibilityRole="button" style={styles.primary} onPress={() => onPlayBots(winTarget)}>
          <Text style={styles.primaryText}>{S.playVsBots}</Text>
        </Pressable>

        <Pressable
          testID="create-room"
          accessibilityRole="button"
          accessibilityState={{ disabled: !online }}
          disabled={!online}
          style={[styles.secondary, !online && styles.disabled]}
          onPress={() => transport && enter(transport.createRoom(name))}
        >
          <Text style={styles.secondaryText}>{S.createRoom}</Text>
        </Pressable>
        <View style={styles.row}>
          <TextInput
            testID="code-input"
            accessibilityLabel={S.codePlaceholder}
            style={[styles.input, styles.flex]}
            placeholder={S.codePlaceholder}
            placeholderTextColor={theme.muted}
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={5}
          />
          <Pressable
            testID="join-room"
            accessibilityRole="button"
            accessibilityState={{ disabled: !online }}
            disabled={!online}
            style={[styles.secondary, styles.join, !online && styles.disabled]}
            onPress={() => transport && enter(transport.joinRoom(code, name))}
          >
            <Text style={styles.secondaryText}>{S.joinByCode}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{transport === null ? S.onlineUnavailable : error}</Text>
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
  flex: {
    flex: 1,
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
    fontSize: 52,
    fontWeight: '800',
  },
  text: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    color: theme.text,
    fontSize: 16,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  choice: {
    flex: 1,
    minHeight: 44,
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
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.cardInk,
    fontSize: 19,
    fontWeight: '800',
  },
  secondary: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  join: {
    width: 110,
  },
  disabled: {
    opacity: 0.4,
  },
  note: {
    minHeight: 16,
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
