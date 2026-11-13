// نوافذ اللعب: اختيار الحركة والهدف، اختيار كروت الدفع.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Card } from '../data/cards';
import type { Move } from '../engine/moves';
import { cardValue, isValidPayment, paymentTiers, suggestPayment } from '../engine/payment';
import type { GameState, PlayerState } from '../engine/state';
import { actionName, cardInfo, describeMove, seatName } from './describe';
import { S } from './strings';
import { theme } from './theme';

interface Entry {
  readonly label: string;
  readonly moves: readonly Move[];
}

/** مفتاح تجميع الحركة حسب الكرت اللي يصيره "طب وتخير". */
function asKey(move: Move): string | undefined {
  return move.type === 'playAction' && move.asAction !== undefined ? actionName(move.asAction) : undefined;
}

/** مفتاح تجميع الحركة حسب اللاعب المستهدف. */
function targetKey(move: Move): string | undefined {
  if (move.type === 'playAction') {
    if (move.burns !== undefined) return move.burns.map((b) => seatName(b.seat)).join(' + ');
    return move.targetSeat === undefined ? undefined : seatName(move.targetSeat);
  }
  if (move.type === 'playRent') return move.targetSeat === undefined ? undefined : seatName(move.targetSeat);
  return undefined;
}

/** يرتب الخيارات: إذا كثيرة تتجمع أولاً حسب الكرت ثم حسب اللاعب المستهدف. */
function buildEntries(moves: readonly Move[], state: GameState): Entry[] {
  const leaves = (list: readonly Move[]): Entry[] => list.map((move) => ({ label: describeMove(move, state), moves: [move] }));
  if (moves.length <= 6) return leaves(moves);

  for (const keyOf of [asKey, targetKey]) {
    const groups = new Map<string, Move[]>();
    const rest: Move[] = [];
    for (const move of moves) {
      const key = keyOf(move);
      if (key === undefined) {
        rest.push(move);
      } else {
        groups.set(key, [...(groups.get(key) ?? []), move]);
      }
    }
    if (groups.size >= 2) {
      const grouped: Entry[] = [...groups.entries()].map(([label, list]) =>
        list.length === 1 ? { label: describeMove(list[0] as Move, state), moves: list } : { label, moves: list },
      );
      return [...grouped, ...leaves(rest)];
    }
  }
  return leaves(moves);
}

interface OptionsModalProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly moves: readonly Move[];
  readonly state: GameState;
  readonly onPick: (move: Move) => void;
  /** بدون onClose = النافذة إجبارية (مثل الرد) */
  readonly onClose?: () => void;
}

export function OptionsModal({ title, subtitle, moves, state, onPick, onClose }: OptionsModalProps) {
  // مسار الاختيار: كل مستوى يضيّق الحركات.
  const [path, setPath] = useState<readonly (readonly Move[])[]>([]);
  const current = path[path.length - 1] ?? moves;
  const entries = buildEntries(current, state);

  const back = () => {
    if (path.length > 0) {
      setPath(path.slice(0, -1));
    } else {
      onClose?.();
    }
  };

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape']} onRequestClose={back}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {entries.length === 0 ? <Text style={styles.subtitle}>{S.noMoves}</Text> : null}
            {entries.map((entry, index) => (
              <Pressable
                key={`${index}-${entry.label}`}
                testID={`option-${index}`}
                accessibilityRole="button"
                style={styles.option}
                onPress={() => {
                  const only = entry.moves[0];
                  if (entry.moves.length === 1 && only) {
                    onPick(only);
                  } else {
                    setPath([...path, entry.moves]);
                  }
                }}
              >
                <Text style={styles.optionText}>{entry.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {onClose || path.length > 0 ? (
            <Pressable testID="option-cancel" accessibilityRole="button" style={styles.secondary} onPress={back}>
              <Text style={styles.secondaryText}>{S.cancel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

interface PayModalProps {
  readonly me: PlayerState;
  readonly amount: number;
  readonly toName: string;
  readonly onPay: (cardIds: readonly string[]) => void;
}

export function PayModal({ me, amount, toName, onPay }: PayModalProps) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const cards: Card[] = paymentTiers(me).flat();
  const total = cards.filter((card) => selected.includes(card.id)).reduce((sum, card) => sum + cardValue(card), 0);
  const valid = isValidPayment(me, amount, selected);

  const toggle = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);
  };

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape']}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{S.payTitle(amount, toName)}</Text>
          <Text style={styles.subtitle}>{S.payHint}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.chips}>
            {cards.map((card) => {
              const info = cardInfo(card);
              const on = selected.includes(card.id);
              return (
                <Pressable
                  key={card.id}
                  testID={`pay-${card.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => toggle(card.id)}
                >
                  <View style={[styles.swatch, { backgroundColor: info.band }]} />
                  <Text style={styles.chipText}>
                    {info.name} ({cardValue(card)})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.subtitle}>{S.paySelected(total, amount)}</Text>
          <View style={styles.row}>
            <Pressable
              testID="pay-auto"
              accessibilityRole="button"
              style={[styles.secondary, styles.flex]}
              onPress={() => setSelected(suggestPayment(me, amount))}
            >
              <Text style={styles.secondaryText}>{S.payAuto}</Text>
            </Pressable>
            <Pressable
              testID="pay-confirm"
              accessibilityRole="button"
              accessibilityState={{ disabled: !valid }}
              disabled={!valid}
              style={[styles.primary, styles.flex, !valid && styles.disabled]}
              onPress={() => onPay(selected)}
            >
              <Text style={styles.primaryText}>{S.payConfirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  sheet: {
    width: '78%',
    maxHeight: '96%',
    backgroundColor: theme.ground,
    borderColor: theme.line,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 6,
  },
  option: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: theme.felt,
    borderColor: theme.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
  },
  chipOn: {
    borderColor: theme.gold,
  },
  chipText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  primary: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.cardInk,
    fontSize: 17,
    fontWeight: '800',
  },
  secondary: {
    minHeight: 46,
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
  disabled: {
    opacity: 0.4,
  },
});
