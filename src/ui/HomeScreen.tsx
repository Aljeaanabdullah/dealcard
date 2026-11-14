// الشاشة الرئيسية حسب design/Home.dc.html: الشعار والترحيب فوق، وتحتها أربع بطاقات:
// لعب عشوائي، إنشاء غرفة خاصة، دخول بكود، لعب ضد البوتات.
// الاسم وكود الغرفة وشرط الفوز يطلعون بنافذة صغيرة عند الحاجة.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WIN_TARGETS, type WinTarget } from '../data/rules';
import type { RoomSnapshot } from '../net/room';
import type { NetResult, Transport } from '../net/transport';
import { S } from './strings';
import { theme } from './theme';

interface HomeScreenProps {
  /** null = اللعب أونلاين مو مجهز */
  readonly transport: Transport | null;
  readonly name: string;
  readonly onNameChange: (name: string) => void;
  readonly onPlayBots: (winTarget: WinTarget) => void;
  readonly onEnterRoom: (snapshot: RoomSnapshot) => void;
}

type Dialog = 'name' | 'bots' | 'join' | 'random' | null;

export function HomeScreen({ transport, name, onNameChange, onPlayBots, onEnterRoom }: HomeScreenProps) {
  // الاسم ينكتب مرة وحدة أول ما ينفتح التطبيق.
  const [dialog, setDialog] = useState<Dialog>(name === '' ? 'name' : null);
  const [draftName, setDraftName] = useState(name);
  const [winTarget, setWinTarget] = useState<WinTarget>(WIN_TARGETS[0]);
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

  /** إنشاء غرفة: الكود يتكوّن عشوائي من الخادم، واللاعب ما يكتب شي. */
  const createRoom = () => {
    if (!transport) return;
    if (name.trim() === '') {
      setDialog('name');
      return;
    }
    enter(transport.createRoom(name));
  };

  /** لعب عشوائي: اللاعب يختار شرط الفوز (6 أو 8) ثم يدخل طابور المطابقة. */
  const joinRandom = () => {
    if (!transport) return;
    setDialog(null);
    enter(transport.joinRandom(name, winTarget));
  };

  const joinRoom = () => {
    if (!transport) return;
    setDialog(null);
    enter(transport.joinRoom(code, name));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.logo}>{S.appName}</Text>
        <View style={styles.flex} />
        <Pressable testID="edit-name" accessibilityRole="button" style={styles.hello} onPress={() => setDialog('name')}>
          <Text style={styles.helloText}>{S.hello(name.trim() === '' ? S.guest : name)}</Text>
        </Pressable>
        <View style={[styles.settings, styles.disabled]} accessibilityLabel={`${S.settings} · ${S.soon}`}>
          <Text style={styles.small}>{S.settings}</Text>
          <Text style={styles.small}>{S.soon}</Text>
        </View>
      </View>

      <Text style={styles.note}>{transport === null ? S.onlineUnavailable : error}</Text>

      <View style={styles.cards}>
        {/* لعب عشوائي: مطابقة تلقائية، والبوتات تكمل العدد بعد 30 ثانية */}
        <Pressable
          testID="home-random"
          accessibilityRole="button"
          accessibilityState={{ disabled: !online }}
          disabled={!online}
          style={[styles.card, styles.cardGold, !online && styles.disabled]}
          onPress={() => setDialog(name.trim() === '' ? 'name' : 'random')}
        >
          <View style={[styles.mark, styles.markDark]} />
          <View>
            <Text style={[styles.cardTitle, styles.dark]}>{S.randomPlay}</Text>
            <Text style={[styles.cardDesc, styles.dark]}>{S.randomDesc}</Text>
          </View>
        </Pressable>

        <Pressable
          testID="create-room"
          accessibilityRole="button"
          accessibilityState={{ disabled: !online }}
          disabled={!online}
          style={[styles.card, !online && styles.disabled]}
          onPress={createRoom}
        >
          <View style={styles.mark} />
          <View>
            <Text style={styles.cardTitle}>{S.createRoom}</Text>
            <Text style={styles.cardDesc}>{S.createDesc}</Text>
          </View>
        </Pressable>

        <Pressable
          testID="join-room"
          accessibilityRole="button"
          accessibilityState={{ disabled: !online }}
          disabled={!online}
          style={[styles.card, !online && styles.disabled]}
          onPress={() => setDialog(name.trim() === '' ? 'name' : 'join')}
        >
          <View style={styles.mark} />
          <View>
            <Text style={styles.cardTitle}>{S.joinTitle}</Text>
            <Text style={styles.cardDesc}>{S.joinDesc}</Text>
          </View>
        </Pressable>

        <Pressable testID="home-bots" accessibilityRole="button" style={styles.card} onPress={() => setDialog('bots')}>
          <View style={styles.mark} />
          <View>
            <Text style={styles.cardTitle}>{S.playVsBots}</Text>
            <Text style={styles.cardDesc}>{S.botsDesc}</Text>
          </View>
        </Pressable>
      </View>

      {dialog !== null ? (
        <Modal transparent visible animationType="fade" supportedOrientations={['landscape']} onRequestClose={() => setDialog(null)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              {dialog === 'name' ? (
                <>
                  <Text style={styles.sheetTitle}>{S.enterName}</Text>
                  <TextInput
                    testID="name-input"
                    accessibilityLabel={S.nickname}
                    style={styles.input}
                    placeholder={S.namePlaceholder}
                    placeholderTextColor={theme.muted}
                    value={draftName}
                    onChangeText={setDraftName}
                    maxLength={16}
                  />
                  <Pressable
                    testID="name-save"
                    accessibilityRole="button"
                    style={styles.primary}
                    onPress={() => {
                      onNameChange(draftName.trim());
                      setDialog(null);
                    }}
                  >
                    <Text style={styles.primaryText}>{S.save}</Text>
                  </Pressable>
                </>
              ) : null}

              {dialog === 'bots' ? (
                <>
                  <Text style={styles.sheetTitle}>{S.playVsBots}</Text>
                  <Text style={styles.small}>{S.winCondition}</Text>
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
                        <Text style={[styles.choiceText, winTarget === target && styles.dark]}>{S.sets(target)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable testID="start-go" accessibilityRole="button" style={styles.primary} onPress={() => onPlayBots(winTarget)}>
                    <Text style={styles.primaryText}>{S.start}</Text>
                  </Pressable>
                </>
              ) : null}

              {dialog === 'random' ? (
                <>
                  <Text style={styles.sheetTitle}>{S.randomPlay}</Text>
                  <Text style={styles.small}>{S.winCondition}</Text>
                  <View style={styles.row}>
                    {WIN_TARGETS.map((target) => (
                      <Pressable
                        key={target}
                        testID={`random-${target}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: winTarget === target }}
                        style={[styles.choice, winTarget === target && styles.choiceOn]}
                        onPress={() => setWinTarget(target)}
                      >
                        <Text style={[styles.choiceText, winTarget === target && styles.dark]}>{S.sets(target)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable testID="random-go" accessibilityRole="button" style={styles.primary} onPress={joinRandom}>
                    <Text style={styles.primaryText}>{S.start}</Text>
                  </Pressable>
                </>
              ) : null}

              {dialog === 'join' ? (
                <>
                  <Text style={styles.sheetTitle}>{S.joinTitle}</Text>
                  <TextInput
                    testID="code-input"
                    accessibilityLabel={S.codePlaceholder}
                    style={styles.input}
                    placeholder={S.codePlaceholder}
                    placeholderTextColor={theme.muted}
                    value={code}
                    onChangeText={(value) => setCode(value.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                  <Pressable testID="join-go" accessibilityRole="button" style={styles.primary} onPress={joinRoom}>
                    <Text style={styles.primaryText}>{S.joinByCode}</Text>
                  </Pressable>
                </>
              ) : null}

              <Pressable testID="dialog-close" accessibilityRole="button" style={styles.secondary} onPress={() => setDialog(null)}>
                <Text style={styles.secondaryText}>{S.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.ground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    color: theme.gold,
    fontSize: 32,
    fontWeight: '800',
  },
  hello: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  helloText: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  settings: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: theme.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    minHeight: 16,
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  cards: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardGold: {
    backgroundColor: theme.gold,
    borderColor: theme.gold,
  },
  mark: {
    width: 34,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.gold,
  },
  markDark: {
    backgroundColor: theme.cardInk,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 21,
    fontWeight: '800',
  },
  cardDesc: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 4,
  },
  dark: {
    color: theme.cardInk,
  },
  small: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  sheet: {
    width: '56%',
    backgroundColor: theme.ground,
    borderColor: theme.line,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    color: theme.text,
    fontSize: 17,
    paddingHorizontal: 12,
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
    fontSize: 18,
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
    fontSize: 15,
    fontWeight: '800',
  },
});
