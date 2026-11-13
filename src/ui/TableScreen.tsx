// طاولة اللعب بالعرض: يدك بالأسفل، لاعب مقابلك بالأعلى ولاعب على كل جانب،
// شاشة عرض فقط: تاخذ الحالة (بعد إخفاء أيدي الباقين) وحركاتي القانونية، وتخدم اللعب المحلي والأونلاين.
// وكومة السحب والنار بالوسط — prd.md القسم 7، والشكل من design/Main.dc.html

import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../data/colors';
import { MAX_HAND_SIZE, MAX_PLAYS_PER_TURN, PLAYER_COUNT } from '../data/rules';
import type { Move } from '../engine/moves';
import { cardValue } from '../engine/payment';
import { completeColors, countInColor, isSetComplete } from '../engine/sets';
import type { GameState, PlayerState } from '../engine/state';
import { CardBack, CardView } from './CardView';
import { cardInfo, colorName, describeEffect, seatName, type Naming } from './describe';
import { EndScreen } from './EndScreen';
import { OptionsModal, PayModal } from './modals';
import { S } from './strings';
import { SET_COLORS, theme } from './theme';

function bankTotal(player: PlayerState): number {
  return player.bank.reduce((sum, card) => sum + cardValue(card), 0);
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** شرائح الأطقم: مربع بلون الطقم وعدد عقاراته. الطقم الكامل بإطار ذهبي. */
function SetChips({ player }: { readonly player: PlayerState }) {
  return (
    <View style={styles.chips}>
      {COLORS.filter((color) => countInColor(player.properties, color.id) > 0).map((color) => (
        <View key={color.id} style={[styles.chip, isSetComplete(player.properties, color.id) && styles.chipDone]}>
          <View style={[styles.swatch, { backgroundColor: SET_COLORS[color.id] }]} />
          <Text style={styles.chipText}>
            {countInColor(player.properties, color.id)}/{color.setSize}
          </Text>
        </View>
      ))}
    </View>
  );
}

function OpponentPanel({
  game,
  seat,
  row,
  naming,
}: {
  readonly game: GameState;
  readonly seat: number;
  readonly row: boolean;
  readonly naming: Naming;
}) {
  const player = game.players[seat];
  if (!player) return null;
  const active = game.turn.seat === seat;

  return (
    <View style={[styles.panel, row ? styles.panelRow : styles.panelColumn, active && styles.panelActive]}>
      <View>
        <Text style={styles.name}>
          {seatName(seat, naming)}
          {game.immune.includes(seat) ? ` · ${S.immune}` : ''}
          {game.skips.includes(seat) ? ` · ${S.skipped}` : ''}
        </Text>
        <Text style={styles.small}>
          {S.inHand(player.hand.length)} · {S.bank(bankTotal(player))}
        </Text>
      </View>
      <SetChips player={player} />
    </View>
  );
}

interface TableScreenProps {
  /** حالة اللعبة مثل ما يشوفها هذا اللاعب (أيدي الباقين مخفية) */
  readonly game: GameState;
  /** حركاتي القانونية الحين */
  readonly moves: readonly Move[];
  readonly naming: Naming;
  readonly secondsLeft: number;
  readonly event: string;
  readonly onMove: (move: Move) => void;
  readonly onPlayAgain: () => void;
}

export function TableScreen({ game, moves, naming, secondsLeft, event, onMove, onPlayAgain }: TableScreenProps) {
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<{ readonly title: string; readonly moves: readonly Move[] } | null>(null);

  const HUMAN_SEAT = naming.mySeat;
  const play = onMove;
  const me = game.players[HUMAN_SEAT];
  if (!me) return null;
  if (game.winner !== null) return <EndScreen game={game} naming={naming} onPlayAgain={onPlayAgain} />;

  // اللاعبين حولي بترتيب المقاعد: اليمين ثم المقابل ثم اليسار.
  const rightSeat = (HUMAN_SEAT + 1) % PLAYER_COUNT;
  const topSeat = (HUMAN_SEAT + 2) % PLAYER_COUNT;
  const leftSeat = (HUMAN_SEAT + 3) % PLAYER_COUNT;

  const myMoves = moves.filter((move) => move.seat === HUMAN_SEAT);
  const myTurn = game.turn.seat === HUMAN_SEAT;
  const canDraw = myMoves.some((move) => move.type === 'draw');
  const canEnd = myMoves.some((move) => move.type === 'endTurn');
  const responseMoves = myMoves.filter((move) => move.type === 'respond');
  const myDebt = game.response === null ? game.pending?.debts.find((d) => d.from === HUMAN_SEAT) : undefined;

  const doMove = (move: Move) => {
    setPicked(null);
    play(move);
  };

  /** كل حركاتي اللي تخص كرت معيّن (باليد أو على الطاولة). */
  const movesFor = (cardId: string): Move[] =>
    myMoves.filter(
      (move) =>
        move.type !== 'respond' &&
        (('cardId' in move && move.cardId === cardId) || (move.type === 'playRent' && move.doubleCardId === cardId)),
    );

  // المقاسات: الكروت تتصغر حسب ارتفاع الشاشة عشان تبان على الشاشة الصغيرة والكبيرة.
  const bottomHeight = Math.max(96, height * 0.36);
  const cardHeight = Math.min(112, bottomHeight - 12);
  const cardWidth = cardHeight * 0.69;
  const sideWidth = Math.max(132, width * 0.2);
  const handSpace = width - sideWidth - 100 - 48;
  const step =
    me.hand.length > 1 ? Math.min(cardWidth + 6, (handSpace - cardWidth) / (me.hand.length - 1)) : cardWidth + 6;
  const pileHeight = Math.min(84, height * 0.2);

  const jokers = me.properties.filter((p) => p.card.kind === 'joker');
  const effect = game.response?.effect;
  const standing = game.response?.standing;
  const revealed = game.revealed?.viewer === HUMAN_SEAT ? game.players[game.revealed.target] : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      {/* الصف العلوي: حالة الدور + اللاعب المقابل */}
      <View style={styles.topRow}>
        <View style={[styles.panel, styles.status, { width: sideWidth }]}>
          <View style={styles.between}>
            <Text style={styles.turn}>{myTurn ? S.yourTurn : S.turnOf(seatName(game.turn.seat, naming))}</Text>
            {myTurn ? <Text style={styles.timer}>{formatTime(secondsLeft)}</Text> : null}
          </View>
          <Text style={styles.small}>
            {myTurn ? S.played(game.turn.playsUsed, MAX_PLAYS_PER_TURN + game.extraPlays) : S.waiting}
          </Text>
        </View>
        <View style={styles.flex}>
          <OpponentPanel game={game} seat={topSeat} row naming={naming} />
        </View>
      </View>

      {/* الصف الأوسط: لاعب على كل جانب، والكومتين بالوسط */}
      <View style={styles.middleRow}>
        <View style={{ width: sideWidth }}>
          <OpponentPanel game={game} seat={leftSeat} row={false} naming={naming} />
        </View>
        <View style={styles.table}>
          <View style={styles.piles}>
            <View style={styles.pile}>
              <CardBack width={pileHeight * 0.69} height={pileHeight} label={S.appName} />
              <Text style={styles.small}>{S.drawPile}</Text>
            </View>
            <View style={styles.pile}>
              {game.firePile.length > 0 ? (
                <CardView
                  card={game.firePile[game.firePile.length - 1] as PlayerState['hand'][number]}
                  width={pileHeight * 0.69}
                  height={pileHeight}
                />
              ) : (
                <View style={[styles.emptyPile, { width: pileHeight * 0.69, height: pileHeight }]} />
              )}
              <Text style={styles.small}>{S.fire}</Text>
            </View>
          </View>
          <Text style={styles.event} numberOfLines={2}>
            {revealed
              ? `${S.revealedHand(seatName(revealed.seat, naming))} ${revealed.hand.map((card) => cardInfo(card).name).join('، ')}`
              : event}
          </Text>
        </View>
        <View style={{ width: sideWidth }}>
          <OpponentPanel game={game} seat={rightSeat} row={false} naming={naming} />
        </View>
      </View>

      {/* الصف السفلي: بنكي وعقاراتي، يدي، وأزرار الدور */}
      <View style={[styles.bottomRow, { height: bottomHeight }]}>
        <View style={[styles.panel, styles.mine, { width: sideWidth }]}>
          <View style={styles.between}>
            <Text style={styles.name}>
              {S.you}
              {game.immune.includes(HUMAN_SEAT) ? ` · ${S.immune}` : ''}
            </Text>
            <Text style={styles.small}>{S.completeSets(completeColors(me.properties).length, game.winTarget)}</Text>
          </View>
          <Text style={styles.small}>{S.myBank(bankTotal(me))}</Text>
          <SetChips player={me} />
          <View style={styles.chips}>
            {jokers.map((placed) => (
              <Pressable
                key={placed.card.id}
                testID={`table-${placed.card.id}`}
                accessibilityRole="button"
                style={styles.chipButton}
                onPress={() => setPicked({ title: S.joker, moves: movesFor(placed.card.id) })}
              >
                <Text style={styles.chipText}>
                  {S.joker} · {colorName(placed.color)}
                </Text>
              </Pressable>
            ))}
            {me.buildings.map((building) => (
              <Pressable
                key={building.card.id}
                testID={`table-${building.card.id}`}
                accessibilityRole="button"
                style={styles.chipButton}
                onPress={() => setPicked({ title: cardInfo(building.card).name, moves: movesFor(building.card.id) })}
              >
                <Text style={styles.chipText}>
                  {cardInfo(building.card).name} · {building.color ? colorName(building.color) : S.looseBuilding}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.hand}>
          {me.hand.map((card, index) => (
            <View key={card.id} style={{ marginLeft: index === 0 ? 0 : step - cardWidth }}>
              <CardView
                card={card}
                width={cardWidth}
                height={cardHeight}
                testID={`hand-${card.id}`}
                onPress={() => setPicked({ title: cardInfo(card).name, moves: movesFor(card.id) })}
              />
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          {canDraw ? (
            <Pressable testID="draw" accessibilityRole="button" style={styles.primary} onPress={() => doMove({ type: 'draw', seat: HUMAN_SEAT })}>
              <Text style={styles.primaryText}>{S.draw}</Text>
            </Pressable>
          ) : null}
          {myTurn && !canDraw ? (
            <Pressable
              testID="end-turn"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canEnd }}
              disabled={!canEnd}
              style={[styles.secondary, !canEnd && styles.disabled]}
              onPress={() => doMove({ type: 'endTurn', seat: HUMAN_SEAT })}
            >
              <Text style={styles.secondaryText}>{me.hand.length > MAX_HAND_SIZE ? S.discardFirst : S.endTurn}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* النوافذ: الرد أولاً، ثم الدفع، ثم اختيار الحركة */}
      {effect && responseMoves.length > 0 ? (
        <OptionsModal
          key={`respond-${game.firePile.length}`}
          title={
            standing
              ? S.respondCounter(seatName(standing.by, naming), S.kindDefense)
              : effect.target === HUMAN_SEAT
                ? S.respondTitleOnYou(seatName(effect.actor, naming))
                : S.respondTitleOnOther(seatName(effect.actor, naming), seatName(effect.target, naming))
          }
          subtitle={describeEffect(effect)}
          moves={responseMoves}
          state={game}
          naming={naming}
          onPick={doMove}
        />
      ) : myDebt ? (
        <PayModal
          key={`pay-${game.pending?.to}-${myDebt.amount}-${me.bank.length}-${me.properties.length}`}
          me={me}
          amount={myDebt.amount}
          toName={seatName(game.pending?.to ?? 0, naming)}
          onPay={(cardIds) => doMove({ type: 'pay', seat: HUMAN_SEAT, cardIds })}
        />
      ) : picked ? (
        <OptionsModal
          title={picked.title}
          subtitle={S.chooseAction}
          moves={picked.moves}
          state={game}
          naming={naming}
          onPick={doMove}
          onClose={() => setPicked(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.ground,
    padding: 8,
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    gap: 6,
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 6,
  },
  panel: {
    backgroundColor: theme.panel,
    borderRadius: 10,
    padding: 8,
    gap: 4,
    borderWidth: 2,
    borderColor: theme.panel,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  panelColumn: {
    flex: 1,
  },
  panelActive: {
    borderColor: theme.gold,
  },
  status: {
    justifyContent: 'center',
  },
  mine: {
    borderColor: theme.gold,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  small: {
    color: theme.muted,
    fontSize: 11,
  },
  turn: {
    color: theme.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  timer: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.felt,
    borderWidth: 1,
    borderColor: theme.felt,
  },
  chipDone: {
    borderColor: theme.gold,
  },
  chipButton: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: theme.felt,
    borderWidth: 1,
    borderColor: theme.line,
  },
  chipText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.muted,
  },
  table: {
    flex: 1,
    backgroundColor: theme.felt,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  piles: {
    flexDirection: 'row',
    gap: 28,
  },
  pile: {
    alignItems: 'center',
    gap: 2,
  },
  emptyPile: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.line,
    borderStyle: 'dashed',
  },
  event: {
    color: theme.text,
    fontSize: 12,
    textAlign: 'center',
  },
  hand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  buttons: {
    width: 100,
    justifyContent: 'flex-end',
    gap: 6,
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
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
});
