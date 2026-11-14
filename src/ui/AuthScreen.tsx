// شاشة الدخول: أول شي يطلع بعد اللوقو — prd.md القسم 7
// اللوقو يطلع بشاشة البداية فقط، وهنا بدون لوقو.
// ثلاث خيارات: دخول بحسابي، حساب جديد، أو دخول ضيف. كل خيار له خاناته وزره الواضح.
// كلمة السر تروح لخدمة الدخول مباشرة وتنمسح من الشاشة بعد الإرسال.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Account, Profile } from '../net/account';
import { S } from './strings';
import { theme } from './theme';

interface AuthScreenProps {
  readonly account: Account;
  /** الاسم والشخصية الحاليين (ينحفظون مع الحساب الجديد) */
  readonly name: string;
  readonly avatar: number;
  readonly onSignedIn: (email: string, profile: Profile) => void;
  readonly onGuest: (name: string) => void;
}

type Mode = 'choose' | 'signIn' | 'signUp' | 'guest';

export function AuthScreen({ account, name, avatar, onSignedIn, onGuest }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [draftName, setDraftName] = useState(name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (next: Mode) => {
    setNote('');
    setPassword('');
    setMode(next);
  };

  const submit = () => {
    if (busy) return;
    const cleanName = draftName.trim();
    if (mode === 'guest') {
      if (cleanName === '') setNote(S.netError('nameRequired'));
      else onGuest(cleanName);
      return;
    }
    if (mode === 'signUp' && cleanName === '') {
      setNote(S.netError('nameRequired'));
      return;
    }
    setBusy(true);
    setNote('');
    const request = mode === 'signUp' ? account.signUp(email, password, { name: cleanName, avatar }) : account.signIn(email, password);
    void request.then((result) => {
      setBusy(false);
      setPassword('');
      if (result.ok) onSignedIn(result.email, result.profile);
      else setNote(S.accountError(result.error));
    });
  };

  const title = mode === 'signIn' ? S.authMine : mode === 'signUp' ? S.authNew : mode === 'guest' ? S.authGuest : S.authTitle;
  const action = mode === 'signIn' ? S.signIn : mode === 'signUp' ? S.createAccount : S.enterGame;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.side} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>

        {mode === 'choose' ? (
          <>
            <Pressable testID="auth-mine" accessibilityRole="button" style={styles.primary} onPress={() => open('signIn')}>
              <Text style={styles.primaryText}>{S.authMine}</Text>
            </Pressable>
            <Pressable testID="auth-new" accessibilityRole="button" style={styles.secondary} onPress={() => open('signUp')}>
              <Text style={styles.secondaryText}>{S.authNew}</Text>
            </Pressable>
            <Pressable testID="auth-guest" accessibilityRole="button" style={styles.secondary} onPress={() => open('guest')}>
              <Text style={styles.secondaryText}>{S.authGuest}</Text>
            </Pressable>
            <Text style={styles.small}>{S.accountHint}</Text>
          </>
        ) : (
          <>
            {note !== '' ? (
              <Text testID="auth-note" style={styles.note}>
                {note}
              </Text>
            ) : null}
            {mode !== 'signIn' ? (
              <TextInput
                testID="auth-name"
                accessibilityLabel={S.nickname}
                style={styles.input}
                placeholder={S.namePlaceholder}
                placeholderTextColor={theme.muted}
                value={draftName}
                onChangeText={setDraftName}
                maxLength={16}
              />
            ) : null}
            {mode !== 'guest' ? (
              <>
                <TextInput
                  testID="auth-email"
                  accessibilityLabel={S.email}
                  style={styles.input}
                  placeholder={S.email}
                  placeholderTextColor={theme.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  maxLength={120}
                />
                <TextInput
                  testID="auth-password"
                  accessibilityLabel={S.password}
                  style={styles.input}
                  placeholder={mode === 'signUp' ? S.newPassword : S.password}
                  placeholderTextColor={theme.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={72}
                />
              </>
            ) : null}
            <View style={styles.row}>
              <Pressable
                testID="auth-submit"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={[styles.primary, styles.flex, busy && styles.disabled]}
                onPress={submit}
              >
                <Text style={styles.primaryText}>{busy ? S.pleaseWait : action}</Text>
              </Pressable>
              <Pressable testID="auth-back" accessibilityRole="button" style={[styles.secondary, styles.back]} onPress={() => open('choose')}>
                <Text style={styles.secondaryText}>{S.cancel}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.ground,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    width: '60%',
  },
  side: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    color: theme.gold,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  small: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  note: {
    color: theme.cardFace,
    backgroundColor: theme.danger,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
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
  back: {
    width: 110,
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
    fontSize: 18,
    fontWeight: '800',
  },
  secondary: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
});
