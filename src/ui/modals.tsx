// نوافذ اللعب حسب المرجع البصري في design/:
// - MoveWizard: لعب كرت أو الرد على أكشن، خطوة خطوة (اللاعب، ثم العقار بلونه...).
// - PayModal: اختيار كروت الدفع، والفلوس تطلع ككروت.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Card } from '../data/cards';
import type { Move } from '../engine/moves';
import { cardValue, isValidPayment, suggestPayment } from '../engine/payment';
import type { GameState, PlayerState } from '../engine/state';
import { CardView } from './CardView';
import { cardInfo, colorName, effectText, type Naming } from './describe';
import { S } from './strings';
import { SET_COLORS, theme } from './theme';
import { applyPicks, nextStep, type Option, type Pick, type Step } from './wizard';

interface MoveWizardProps {
  /** الكرت اللي ينلعب، أو الكرت اللي انلعب ضدي */
  readonly card?: Card;
  /** سطر صغير فوق الكرت (مثل "انلعب ضدك") */
  readonly cardLabel?: string;
  /** عنوان يطلع بأول خطوة بدل العنوان العادي */
  readonly title?: string;
  readonly subtitle?: string;
  readonly note?: string;
  /** إطار أحمر: أكشن انلعب ضدي */
  readonly danger?: boolean;
  readonly moves: readonly Move[];
  readonly game: GameState;
  readonly naming: Naming;
  readonly onPick: (move: Move) => void;
  /** بدون onClose = النافذة إجبارية (مثل الرد) */
  readonly onClose?: () => void;
}

export function MoveWizard({
  card,
  cardLabel,
  title,
  subtitle,
  note,
  danger = false,
  moves,
  game,
  naming,
  onPick,
  onClose,
}: MoveWizardProps) {
  const [picks, setPicks] = useState<readonly Pick[]>([]);

  const upcoming = nextStep(moves, picks, game, naming);
  // خلصت الاختيارات وفيها لاعب مستهدف: نعرض آخر خطوة والمختار محدد، وننتظر "تأكيد".
  const confirming = upcoming === null && picks.length > 0;
  const lastPick = picks[picks.length - 1];
  const step: Step | null = confirming ? nextStep(moves, picks.slice(0, -1), game, naming) : upcoming;
  const selected = confirming ? lastPick?.value : undefined;

  const choose = (option: Option) => {
    if (!step) return;
    const base = confirming ? picks.slice(0, -1) : picks;
    const next: Pick[] = [...base, { step: step.id, value: option.value }];
    if (nextStep(moves, next, game, naming) !== null) {
      setPicks(next);
      return;
    }
    const final = applyPicks(moves, next)[0];
    if (!final) return;
    // الأكشن على لاعب يحتاج تأكيد قبل ما يتنفذ. غير كذا يتنفذ من أول ضغطة.
    if (next.some((pick) => pick.step === 'target')) {
      setPicks(next);
    } else {
      onPick(final);
    }
  };

  const confirm = () => {
    const final = applyPicks(moves, picks)[0];
    if (final) onPick(final);
  };

  const back = () => {
    if (picks.length > 0) {
      setPicks(picks.slice(0, -1));
    } else {
      onClose?.();
    }
  };

  const heading = picks.length === 0 && title ? title : (step?.title ?? '');

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape']} onRequestClose={back}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, styles.sheetRow, danger && styles.sheetDanger]}>
          {card ? (
            <View style={styles.cardColumn}>
              {cardLabel ? <Text style={styles.small}>{cardLabel}</Text> : null}
              <CardView card={card} width={92} height={132} description={effectText(card) || undefined} />
            </View>
          ) : null}

          <View style={styles.content}>
            <Text style={styles.title}>{heading}</Text>
            {subtitle && picks.length === 0 ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {moves.length === 0 ? <Text style={styles.subtitle}>{S.noMoves}</Text> : null}
              {step ? <Options step={step} selected={selected} onChoose={choose} /> : null}
            </ScrollView>

            {note && picks.length === 0 ? <Text style={styles.small}>{note}</Text> : null}

            <View style={styles.row}>
              {confirming ? (
                <Pressable testID="option-confirm" accessibilityRole="button" style={[styles.primary, styles.flex2]} onPress={confirm}>
                  <Text style={styles.primaryText}>{S.confirm}</Text>
                </Pressable>
              ) : null}
              {onClose || picks.length > 0 ? (
                <Pressable testID="option-cancel" accessibilityRole="button" style={[styles.secondary, styles.flex]} onPress={back}>
                  <Text style={styles.secondaryText}>{S.cancel}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Options({
  step,
  selected,
  onChoose,
}: {
  readonly step: Step;
  readonly selected: string | undefined;
  readonly onChoose: (option: Option) => void;
}) {
  if (step.kind === 'players') {
    return (
      <View style={styles.players}>
        {step.options.map((option, index) => (
          <Pressable
            key={option.value}
            testID={`option-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option.value }}
            style={[styles.playerBox, selected === option.value && styles.picked]}
            onPress={() => onChoose(option)}
          >
            <Text style={styles.playerName}>{option.label}</Text>
            <Text style={styles.small}>{option.detail}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (step.kind === 'tiles') {
    return (
      <View style={styles.tiles}>
        {step.options.map((option, index) => (
          <Pressable
            key={option.value}
            testID={`option-${index}`}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: selected === option.value }}
            style={[styles.tile, selected === option.value && styles.picked]}
            onPress={() => onChoose(option)}
          >
            <View style={[styles.tileColor, { backgroundColor: option.color ?? theme.line }]} />
            <Text style={styles.tileText} numberOfLines={2}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.buttons}>
      {step.options.map((option, index) => (
        <Pressable
          key={option.value}
          testID={`option-${index}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.value }}
          style={[styles.option, option.gold && styles.optionGold, selected === option.value && styles.picked]}
          onPress={() => onChoose(option)}
        >
          <Text style={[styles.optionText, option.gold && styles.optionTextGold]}>{option.label}</Text>
          {option.detail ? (
            <Text style={[styles.optionDetail, option.gold && styles.optionTextGold]}>{option.detail}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

interface PayModalProps {
  readonly me: PlayerState;
  readonly amount: number;
  readonly toName: string;
  /** اسم الكرت اللي انلعب عليّ */
  readonly reason?: string;
  readonly onPay: (cardIds: readonly string[]) => void;
}

export function PayModal({ me, amount, toName, reason, onPay }: PayModalProps) {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const buildings = me.buildings;
  const properties = me.properties.filter((placed) => placed.card.kind === 'property');
  const payable: Card[] = [...me.bank, ...buildings.map((b) => b.card), ...properties.map((p) => p.card)];
  const total = payable.filter((card) => selected.includes(card.id)).reduce((sum, card) => sum + cardValue(card), 0);
  const valid = isValidPayment(me, amount, selected);

  const toggle = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);
  };

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape']}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.between}>
            <Text style={styles.title}>{S.payTitle(amount, toName)}</Text>
            {reason ? <Text style={styles.subtitle}>{S.playedOnYou(reason)}</Text> : null}
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.paySections}>
            {/* البنك: كروت فلوس حقيقية */}
            <View style={styles.section}>
              <Text style={styles.small}>{S.bankSection}</Text>
              <View style={styles.moneyRow}>
                {me.bank.map((card) => (
                  <CardView
                    key={card.id}
                    card={card}
                    width={58}
                    height={82}
                    selected={selected.includes(card.id)}
                    testID={`pay-${card.id}`}
                    onPress={() => toggle(card.id)}
                  />
                ))}
              </View>
            </View>

            {buildings.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.small}>{S.buildingsSection}</Text>
                <View style={styles.chips}>
                  {buildings.map((building) => (
                    <PayChip
                      key={building.card.id}
                      card={building.card}
                      color={theme.muted}
                      on={selected.includes(building.card.id)}
                      onPress={() => toggle(building.card.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {properties.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.small}>{S.propertiesSection}</Text>
                <View style={styles.chips}>
                  {properties.map((placed) => (
                    <PayChip
                      key={placed.card.id}
                      card={placed.card}
                      color={SET_COLORS[placed.color]}
                      detail={colorName(placed.color)}
                      on={selected.includes(placed.card.id)}
                      onPress={() => toggle(placed.card.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <Text style={styles.small}>{S.noChange}</Text>
          <View style={styles.row}>
            <Text style={[styles.total, styles.flex]}>{S.paySelectedDinar(total, amount)}</Text>
            <Pressable testID="pay-auto" accessibilityRole="button" style={[styles.secondary, styles.payButton]} onPress={() => setSelected(suggestPayment(me, amount))}>
              <Text style={styles.secondaryText}>{S.payAuto}</Text>
            </Pressable>
            <Pressable
              testID="pay-confirm"
              accessibilityRole="button"
              accessibilityState={{ disabled: !valid }}
              disabled={!valid}
              style={[styles.primary, styles.payButton, !valid && styles.disabled]}
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

function PayChip({
  card,
  color,
  detail,
  on,
  onPress,
}: {
  readonly card: Card;
  readonly color: string;
  readonly detail?: string;
  readonly on: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      testID={`pay-${card.id}`}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.picked]}
      onPress={onPress}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.chipText}>
        {cardInfo(card).name}
        {detail ? ` · ${detail}` : ''} ({cardValue(card)})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  sheet: {
    width: '88%',
    maxHeight: '98%',
    backgroundColor: theme.ground,
    borderColor: theme.line,
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: 14,
  },
  sheetDanger: {
    borderColor: theme.danger,
  },
  cardColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
  },
  small: {
    color: theme.muted,
    fontSize: 12,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  players: {
    flexDirection: 'row',
    gap: 8,
  },
  playerBox: {
    flex: 1,
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 2,
  },
  playerName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  picked: {
    borderColor: theme.gold,
    borderWidth: 3,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: 74,
    minHeight: 78,
    borderRadius: 10,
    backgroundColor: theme.felt,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    padding: 5,
    gap: 3,
  },
  tileColor: {
    alignSelf: 'stretch',
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.muted,
  },
  tileText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttons: {
    gap: 6,
  },
  option: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: theme.felt,
    borderColor: theme.line,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  optionGold: {
    backgroundColor: theme.gold,
    borderColor: theme.gold,
  },
  optionText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  optionDetail: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  optionTextGold: {
    color: theme.cardInk,
  },
  paySections: {
    gap: 8,
  },
  section: {
    gap: 4,
  },
  moneyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  chipText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: theme.muted,
  },
  total: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  payButton: {
    width: 130,
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
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.4,
  },
});
