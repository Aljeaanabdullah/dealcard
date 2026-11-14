// شاشة نهاية اللعبة: الفائز، ملخص، إعادة اللعب، خروج للبداية — prd.md القسم 7

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardValue } from '../engine/payment';
import { completeColors } from '../engine/sets';
import type { GameState } from '../engine/state';
import { seatName, type Naming } from './describe';
import { S } from './strings';
import { SET_COLORS, theme } from './theme';

interface EndScreenProps {
  readonly game: GameState;
  readonly naming: Naming;
  /** بدون تحديد = ما يطلع زر إعادة اللعب (مثلاً غرفة خاصة أونلاين) */
  readonly onPlayAgain?: (() => void) | undefined;
  readonly onExit: () => void;
}

export function EndScreen({ game, naming, onPlayAgain, onExit }: EndScreenProps) {
  const winner = game.players.find((player) => player.seat === game.winner);
  const winnerSets = winner ? completeColors(winner.properties) : [];
  const rows = game.players
    .map((player) => ({
      seat: player.seat,
      sets: completeColors(player.properties).length,
      bank: player.bank.reduce((sum, card) => sum + cardValue(card), 0),
    }))
    .sort((a, b) => b.sets - a.sets);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.winner}>
        <Text style={styles.label}>{S.winner}</Text>
        <Text style={styles.winnerName}>{game.winner === naming.mySeat ? S.youWon : seatName(game.winner ?? 0, naming)}</Text>
        <Text style={styles.text}>{S.completed(winnerSets.length)}</Text>
        <View style={styles.swatches}>
          {winnerSets.map((color) => (
            <View key={color} style={[styles.swatch, { backgroundColor: SET_COLORS[color] }]} />
          ))}
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.title}>{S.summary}</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.label, styles.flex]}>{S.player}</Text>
          <Text style={[styles.label, styles.column]}>{S.setsColumn}</Text>
          <Text style={[styles.label, styles.column]}>{S.bankColumn}</Text>
        </View>
        {rows.map((row) => (
          <View key={row.seat} style={[styles.row, row.seat === game.winner && styles.rowWinner]}>
            <Text style={[styles.text, styles.flex]}>{seatName(row.seat, naming)}</Text>
            <Text style={[styles.text, styles.column]}>{row.sets}</Text>
            <Text style={[styles.text, styles.column]}>{row.bank}</Text>
          </View>
        ))}
        {onPlayAgain ? (
          <Pressable testID="replay" accessibilityRole="button" style={styles.primary} onPress={onPlayAgain}>
            <Text style={styles.primaryText}>{S.playAgain}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="exit-home" accessibilityRole="button" style={styles.secondary} onPress={onExit}>
          <Text style={styles.secondaryText}>{S.exitHome}</Text>
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
  flex: {
    flex: 1,
  },
  winner: {
    flex: 2,
    backgroundColor: theme.felt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  winnerName: {
    color: theme.gold,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  swatches: {
    flexDirection: 'row',
    gap: 6,
  },
  swatch: {
    width: 22,
    height: 30,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.text,
  },
  summary: {
    flex: 3,
    padding: 16,
    gap: 6,
    justifyContent: 'center',
  },
  title: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.panel,
    borderWidth: 2,
    borderColor: theme.panel,
  },
  rowWinner: {
    borderColor: theme.gold,
  },
  column: {
    width: 110,
    textAlign: 'center',
  },
  label: {
    color: theme.muted,
    fontSize: 12,
  },
  text: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primary: {
    minHeight: 48,
    marginTop: 6,
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
    marginTop: 4,
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
});
