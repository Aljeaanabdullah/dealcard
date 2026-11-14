// اللعب أونلاين بغرفة خاصة: غرفة الانتظار ثم الطاولة.
// التطبيق يعرض اللي يرسله الخادم فقط، ويرسل له الحركات. ما يقرر أي نتيجة.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PLAYER_COUNT, WIN_TARGETS } from '../data/rules';
import type { RoomSnapshot } from '../net/room';
import type { Transport } from '../net/transport';
import { describeEvent, type Naming } from './describe';
import { S } from './strings';
import { TableScreen } from './TableScreen';
import { theme } from './theme';

interface OnlineGameProps {
  readonly transport: Transport;
  readonly initial: RoomSnapshot;
  readonly onExit: () => void;
}

export function OnlineGame({ transport, initial, onExit }: OnlineGameProps) {
  const [snapshot, setSnapshot] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const code = initial.code;

  useEffect(() => transport.subscribe(code, setSnapshot), [transport, code]);

  // عرض المؤقت فقط: الموعد الفعلي عند الخادم.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const naming: Naming = {
    mySeat: snapshot.mySeat,
    names: snapshot.seats.map((seat) => (seat.isBot ? '' : seat.name)),
  };

  /** يرسل طلب للخادم ويعرض اللقطة اللي يرجّعها. */
  const request = (send: Promise<{ readonly ok: boolean; readonly snapshot?: RoomSnapshot | null }>) => {
    void send.then((result) => {
      if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    });
  };

  const leave = () => {
    void transport.leave(code);
    onExit();
  };

  // اللعب العشوائي: شاشة "جاري البحث عن لاعبين" مع زر إلغاء.
  if ((snapshot.status === 'lobby' || !snapshot.state) && snapshot.matchmaking) {
    const secondsToStart = Math.max(0, Math.ceil((snapshot.matchDeadline - now) / 1000));
    const slots = Array.from({ length: PLAYER_COUNT }, (_, index) => snapshot.seats[index]);
    return (
      <SafeAreaView style={[styles.root, styles.search]} edges={['top', 'bottom', 'left', 'right']}>
        <Text style={styles.searchTitle}>{S.searching}</Text>
        <Text style={styles.small}>{S.searchingHint}</Text>
        <Text testID="search-count" style={styles.title}>
          {S.playersCount(snapshot.seats.length)}
        </Text>
        <View style={styles.searchSlots}>
          {slots.map((seat, index) => (
            <View key={index} style={[styles.searchSlot, !seat && styles.slotEmpty]}>
              <Text style={styles.name}>{seat ? (index === snapshot.mySeat ? S.you : seat.name) : S.emptySeat}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.waiting}>{S.botsIn(secondsToStart)}</Text>
        <Pressable testID="search-cancel" accessibilityRole="button" style={[styles.secondary, styles.searchCancel]} onPress={leave}>
          <Text style={styles.secondaryText}>{S.cancelSearch}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (snapshot.status === 'lobby' || !snapshot.state) {
    const slots = Array.from({ length: PLAYER_COUNT }, (_, index) => snapshot.seats[index]);
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.players}>
          <View style={styles.between}>
            <Text style={styles.title}>{S.lobbyTitle}</Text>
            <Text style={styles.small}>{S.playersCount(snapshot.seats.length)}</Text>
          </View>
          <View style={styles.grid}>
            {slots.map((seat, index) => (
              <View key={index} style={[styles.slot, !seat && styles.slotEmpty]}>
                <Text style={styles.name}>{seat ? (index === snapshot.mySeat ? S.you : seat.name) : S.emptySeat}</Text>
                <Text style={styles.small}>{seat ? (index === 0 ? S.host : S.joined) : S.botWillFill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.side}>
          <View style={styles.codeBox}>
            <Text style={styles.small}>{S.roomCode}</Text>
            <Text style={styles.code}>{snapshot.code}</Text>
            <Text style={styles.small}>{S.shareCode}</Text>
          </View>
          <Text style={styles.small}>{S.hostChooses}</Text>
          <View style={styles.row}>
            {WIN_TARGETS.map((target) => (
              <Pressable
                key={target}
                testID={`lobby-${target}`}
                accessibilityRole="button"
                accessibilityState={{ selected: snapshot.winTarget === target, disabled: !snapshot.isHost }}
                disabled={!snapshot.isHost}
                style={[styles.choice, snapshot.winTarget === target && styles.choiceOn]}
                onPress={() => request(transport.setWinTarget(code, target))}
              >
                <Text style={[styles.choiceText, snapshot.winTarget === target && styles.choiceTextOn]}>{S.sets(target)}</Text>
              </Pressable>
            ))}
          </View>
          {snapshot.isHost ? (
            <Pressable testID="lobby-start" accessibilityRole="button" style={styles.primary} onPress={() => request(transport.start(code))}>
              <Text style={styles.primaryText}>{S.start}</Text>
            </Pressable>
          ) : (
            <Text style={styles.waiting}>{S.waitingHost}</Text>
          )}
          <Pressable testID="lobby-leave" accessibilityRole="button" style={styles.secondary} onPress={leave}>
            <Text style={styles.secondaryText}>{S.leave}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const game = snapshot.state;
  return (
    <TableScreen
      game={game}
      moves={snapshot.moves}
      naming={naming}
      secondsLeft={Math.max(0, Math.ceil((snapshot.turnDeadline - now) / 1000))}
      event={snapshot.lastMove ? describeEvent(snapshot.lastMove, game, naming) : ''}
      lastAttack={snapshot.lastAttack ?? null}
      onMove={(move) => request(transport.sendMove(code, move))}
      onPlayAgain={leave}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.ground,
    padding: 14,
    gap: 14,
  },
  search: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchTitle: {
    color: theme.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  searchSlots: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  searchSlot: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCancel: {
    width: 220,
  },
  players: {
    flex: 3,
    gap: 8,
  },
  side: {
    flex: 2,
    gap: 8,
    justifyContent: 'center',
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  small: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '48%',
    flexGrow: 1,
    minHeight: 60,
    borderRadius: 12,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotEmpty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  name: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  codeBox: {
    backgroundColor: theme.panel,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  code: {
    color: theme.gold,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 6,
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
    fontSize: 14,
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
  waiting: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 48,
    textAlignVertical: 'center',
  },
});
