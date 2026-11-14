// طاولة اللعب بالعرض: يدك بالأسفل، لاعب مقابلك بالأعلى ولاعب على كل جانب،
// وكومة السحب والنار بالوسط — prd.md القسم 7، والشكل من design/Main.dc.html
// شاشة عرض فقط: تاخذ الحالة (بعد إخفاء أيدي الباقين) وحركاتي القانونية، وتخدم اللعب المحلي والأونلاين.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Card } from '../data/cards';
import { COLORS } from '../data/colors';
import { MAX_HAND_SIZE, MAX_PLAYS_PER_TURN, PLAYER_COUNT, TURN_SECONDS } from '../data/rules';
import type { Move } from '../engine/moves';
import { cardValue } from '../engine/payment';
import { completeColors, countInColor, isSetComplete } from '../engine/sets';
import type { GameState, PlayerState } from '../engine/state';
import { CardBack, CardView } from './CardView';
import {
  attackCard,
  cardById,
  cardInfo,
  colorName,
  describeEffect,
  moveTargets,
  seatName,
  type Naming,
} from './describe';
import { EndScreen } from './EndScreen';
import { MoveWizard, PayModal } from './modals';
import { S } from './strings';
import { SET_COLORS, theme } from './theme';
import { cardMoves } from './wizard';

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

/** سهم أحمر: على اللاعب اللي انلعب ضده الكرت، وبوسط الطاولة. */
function Arrow({ size }: { readonly size: number }) {
  return (
    <View
      style={[
        styles.arrow,
        { borderTopWidth: size * 0.6, borderBottomWidth: size * 0.6, borderLeftWidth: size },
      ]}
    />
  );
}

function TargetArrow() {
  return (
    <View style={styles.arrowRow} accessibilityLabel={S.targeted}>
      <Arrow size={10} />
      <Text style={styles.arrowText}>{S.targeted}</Text>
    </View>
  );
}

/** علامة كبيرة على اللاعب: "استريح" لين يخلص تفويته، و"حصانه" لين يرجع دوره. */
function StatusBadges({ game, seat }: { readonly game: GameState; readonly seat: number }) {
  const skips = game.skips.filter((skipped) => skipped === seat).length;
  const immune = game.immune.includes(seat);
  if (skips === 0 && !immune) return null;
  return (
    <View style={styles.badges}>
      {skips > 0 ? (
        <View testID={`badge-skip-${seat}`} style={[styles.badge, styles.badgeSkip]}>
          <Text style={styles.badgeText}>{skips > 1 ? S.skippedTimes(skips) : S.skipped}</Text>
        </View>
      ) : null}
      {immune ? (
        <View testID={`badge-immune-${seat}`} style={[styles.badge, styles.badgeImmune]}>
          <Text style={[styles.badgeText, styles.badgeTextDark]}>{S.immune}</Text>
        </View>
      ) : null}
    </View>
  );
}

function OpponentPanel({
  game,
  seat,
  row,
  naming,
  targeted,
}: {
  readonly game: GameState;
  readonly seat: number;
  readonly row: boolean;
  readonly naming: Naming;
  /** انلعب عليه آخر كرت: ينحط عليه سهم */
  readonly targeted: boolean;
}) {
  const player = game.players[seat];
  if (!player) return null;
  const active = game.turn.seat === seat;

  return (
    <View
      testID={targeted ? `targeted-${seat}` : undefined}
      style={[styles.panel, row ? styles.panelRow : styles.panelColumn, active && styles.panelActive, targeted && styles.panelTargeted]}
    >
      <View style={styles.info}>
        {targeted ? <TargetArrow /> : null}
        <Text style={styles.name}>{seatName(seat, naming)}</Text>
        <Text style={styles.small}>
          {S.inHand(player.hand.length)} · {S.bank(bankTotal(player))}
        </Text>
        <Text testID={`sets-${seat}`} style={styles.sets}>
          {S.setsShort(completeColors(player.properties).length)}
        </Text>
      </View>
      <View style={styles.info}>
        <StatusBadges game={game} seat={seat} />
        <SetChips player={player} />
      </View>
    </View>
  );
}

/** مهلة قصيرة قبل الانتقال التلقائي للاعب التالي، عشان اللاعب يشوف كرته الأخير. */
const AUTO_END_DELAY_MS = 600;

interface TableScreenProps {
  /** حالة اللعبة مثل ما يشوفها هذا اللاعب (أيدي الباقين مخفية) */
  readonly game: GameState;
  /** حركاتي القانونية الحين */
  readonly moves: readonly Move[];
  readonly naming: Naming;
  readonly secondsLeft: number;
  readonly event: string;
  /** آخر أكشن أو إيجار انلعب بهذا الدور: يتحدد منه مين انلعب ضده الكرت */
  readonly lastAttack: Move | null;
  readonly onMove: (move: Move) => void;
  readonly onPlayAgain: () => void;
}

export function TableScreen({ game, moves, naming, secondsLeft, event, lastAttack, onMove, onPlayAgain }: TableScreenProps) {
  const { width, height } = useWindowDimensions();
  const [picked, setPicked] = useState<{ readonly card: Card; readonly moves: readonly Move[] } | null>(null);

  const mySeat = naming.mySeat;

  // إذا لعبت كل كروت دوري (أو خلصت رمي الزايد) وما بقى إلا إنهاء الدور، الدور ينتقل للاعب التالي تلقائياً.
  const onlyMove = moves.length === 1 ? moves[0] : undefined;
  const playLimit = MAX_PLAYS_PER_TURN + game.extraPlays;
  const playsDone = game.turn.playsUsed >= playLimit || game.turn.discarding;
  const autoEnd = game.winner === null && playsDone && onlyMove?.type === 'endTurn' && onlyMove.seat === mySeat;
  useEffect(() => {
    if (!autoEnd) return undefined;
    const timer = setTimeout(() => onMove({ type: 'endTurn', seat: mySeat }), AUTO_END_DELAY_MS);
    return () => clearTimeout(timer);
    // onMove يتغير مع كل عرض؛ الانتقال مربوط بحالة الدور فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnd, mySeat]);

  const me = game.players[mySeat];
  if (!me) return null;
  if (game.winner !== null) return <EndScreen game={game} naming={naming} onPlayAgain={onPlayAgain} />;

  // اللاعبين حولي بترتيب المقاعد: اليمين ثم المقابل ثم اليسار.
  const rightSeat = (mySeat + 1) % PLAYER_COUNT;
  const topSeat = (mySeat + 2) % PLAYER_COUNT;
  const leftSeat = (mySeat + 3) % PLAYER_COUNT;

  const myMoves = moves.filter((move) => move.seat === mySeat);
  const myTurn = game.turn.seat === mySeat;
  const canDraw = myMoves.some((move) => move.type === 'draw');
  const canEnd = myMoves.some((move) => move.type === 'endTurn');
  const responseMoves = myMoves.filter((move) => move.type === 'respond');
  const myDebt = game.response === null ? game.pending?.debts.find((d) => d.from === mySeat) : undefined;

  const doMove = (move: Move) => {
    setPicked(null);
    onMove(move);
  };

  /** كل حركاتي اللي تخص كرت معيّن (باليد أو على الطاولة). */
  const movesFor = (cardId: string): Move[] => cardMoves(myMoves, cardId);

  // المقاسات: الكروت تتصغر حسب الشاشة وعدد الكروت باليد، وما تتراكب عشان كل كرت يبان كامل.
  const bottomHeight = Math.max(100, height * 0.36);
  const cardHeight = Math.min(116, bottomHeight - 14);
  const sideWidth = Math.max(140, width * 0.21);
  const handSpace = width - sideWidth - 108 - 44;
  const handGap = 5;
  const cardWidth = Math.max(
    40,
    Math.min(cardHeight * 0.69, (handSpace - handGap * Math.max(me.hand.length - 1, 0)) / Math.max(me.hand.length, 1)),
  );
  const pileHeight = Math.min(84, height * 0.2);

  const jokers = me.properties.filter((p) => p.card.kind === 'joker');
  const effect = game.response?.effect;
  const standing = game.response?.standing;
  const revealed = game.revealed?.viewer === mySeat ? game.players[game.revealed.target] : undefined;

  // السهم المزدوج: على خانة اللاعب المستهدف، وبوسط الطاولة.
  const targets = moveTargets(lastAttack);
  const attackedCard = lastAttack && 'cardId' in lastAttack ? cardById(lastAttack.cardId) : undefined;
  const banner =
    lastAttack && targets.length > 0 && attackedCard
      ? S.attackBanner(
          seatName(lastAttack.seat, naming),
          cardInfo(attackedCard).name,
          targets.map((seat) => seatName(seat, naming)).join('، '),
        )
      : null;

  const responseCard = effect ? attackCard(effect.action, lastAttack) : undefined;
  const dots = Array.from({ length: playLimit }, (_, index) => index < game.turn.playsUsed);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      {/* الصف العلوي: حالة الدور + اللاعب المقابل */}
      <View style={styles.topRow}>
        <View style={[styles.panel, styles.status, { width: sideWidth }]}>
          <View style={styles.between}>
            <Text style={styles.turn}>{myTurn ? S.yourTurn : S.turnOf(seatName(game.turn.seat, naming))}</Text>
            {myTurn ? <Text style={styles.timer}>{formatTime(secondsLeft)}</Text> : null}
          </View>
          {myTurn ? (
            <View style={styles.timeTrack}>
              <View style={[styles.timeBar, { width: `${Math.max(0, Math.min(100, (secondsLeft / TURN_SECONDS) * 100))}%` }]} />
            </View>
          ) : null}
          <View style={styles.playsRow}>
            <Text style={styles.small}>{myTurn ? S.played(game.turn.playsUsed, playLimit) : S.waiting}</Text>
            {myTurn
              ? dots.map((filled, index) => (
                  <View key={index} testID={filled ? 'play-dot-on' : 'play-dot-off'} style={[styles.dot, filled && styles.dotOn]} />
                ))
              : null}
          </View>
        </View>
        <View style={styles.flex}>
          <OpponentPanel game={game} seat={topSeat} row naming={naming} targeted={targets.includes(topSeat)} />
        </View>
      </View>

      {/* الصف الأوسط: لاعب على كل جانب، والكومتين بالوسط */}
      <View style={styles.middleRow}>
        <View style={{ width: sideWidth }}>
          <OpponentPanel game={game} seat={leftSeat} row={false} naming={naming} targeted={targets.includes(leftSeat)} />
        </View>
        <View style={styles.table}>
          <View style={styles.piles}>
            <View style={styles.pile}>
              <CardBack width={pileHeight * 0.69} height={pileHeight} label={S.appName} />
              <Text style={styles.small}>{S.drawPile}</Text>
            </View>
            <View style={styles.pile}>
              {game.firePile.length > 0 ? (
                <CardView card={game.firePile[game.firePile.length - 1] as Card} width={pileHeight * 0.69} height={pileHeight} />
              ) : (
                <View style={[styles.emptyPile, { width: pileHeight * 0.69, height: pileHeight }]} />
              )}
              <Text style={styles.small}>{S.fire}</Text>
            </View>
          </View>
          {banner ? (
            <View testID="attack-banner" style={styles.banner}>
              <Arrow size={14} />
              <Text style={styles.bannerText} numberOfLines={2}>
                {banner}
              </Text>
            </View>
          ) : (
            <Text style={styles.event} numberOfLines={2}>
              {event}
            </Text>
          )}
          {revealed ? (
            <Text style={styles.event} numberOfLines={2}>
              {S.revealedHand(seatName(revealed.seat, naming))} {revealed.hand.map((card) => cardInfo(card).name).join('، ')}
            </Text>
          ) : null}
        </View>
        <View style={{ width: sideWidth }}>
          <OpponentPanel game={game} seat={rightSeat} row={false} naming={naming} targeted={targets.includes(rightSeat)} />
        </View>
      </View>

      {/* الصف السفلي: بنكي وعقاراتي، يدي، وأزرار الدور */}
      <View style={[styles.bottomRow, { height: bottomHeight }]}>
        <View
          testID={targets.includes(mySeat) ? `targeted-${mySeat}` : undefined}
          style={[styles.panel, styles.mine, { width: sideWidth }, targets.includes(mySeat) && styles.panelTargeted]}
        >
          <ScrollView contentContainerStyle={styles.mineContent}>
            {targets.includes(mySeat) ? <TargetArrow /> : null}
            <View style={styles.between}>
              <Text style={styles.name}>{S.you}</Text>
              <Text style={styles.sets}>{S.completeSets(completeColors(me.properties).length, game.winTarget)}</Text>
            </View>
            <StatusBadges game={game} seat={mySeat} />
            <Text style={styles.small}>{S.myBank(bankTotal(me))}</Text>
            <SetChips player={me} />
            <View style={styles.chips}>
              {jokers.map((placed) => (
                <Pressable
                  key={placed.card.id}
                  testID={`table-${placed.card.id}`}
                  accessibilityRole="button"
                  style={styles.chipButton}
                  onPress={() => setPicked({ card: placed.card, moves: movesFor(placed.card.id) })}
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
                  onPress={() => setPicked({ card: building.card, moves: movesFor(building.card.id) })}
                >
                  <Text style={styles.chipText}>
                    {cardInfo(building.card).name} · {building.color ? colorName(building.color) : S.looseBuilding}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.hand, { gap: handGap }]}>
          {me.hand.map((card) => (
            <CardView
              key={card.id}
              card={card}
              width={cardWidth}
              height={cardHeight}
              testID={`hand-${card.id}`}
              onPress={() => setPicked({ card, moves: movesFor(card.id) })}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {canDraw ? (
            <Pressable testID="draw" accessibilityRole="button" style={styles.primary} onPress={() => doMove({ type: 'draw', seat: mySeat })}>
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
              onPress={() => doMove({ type: 'endTurn', seat: mySeat })}
            >
              <Text style={styles.secondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {me.hand.length > MAX_HAND_SIZE ? S.discardFirst : S.endTurn}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* النوافذ: الرد أولاً، ثم الدفع، ثم لعب الكرت */}
      {effect && responseMoves.length > 0 ? (
        <MoveWizard
          key={`respond-${game.firePile.length}`}
          danger
          card={responseCard}
          cardLabel={effect.target === mySeat ? S.playedAgainstYou : S.playedCard}
          title={
            standing
              ? S.respondCounter(seatName(standing.by, naming), S.kindDefense)
              : effect.target === mySeat
                ? S.respondTitleOnYou(seatName(effect.actor, naming))
                : S.respondTitleOnOther(seatName(effect.actor, naming), seatName(effect.target, naming))
          }
          subtitle={describeEffect(effect)}
          note={S.responseNote}
          moves={responseMoves}
          game={game}
          naming={naming}
          onPick={doMove}
        />
      ) : myDebt ? (
        <PayModal
          key={`pay-${game.pending?.to}-${myDebt.amount}-${me.bank.length}-${me.properties.length}`}
          me={me}
          amount={myDebt.amount}
          toName={seatName(game.pending?.to ?? 0, naming)}
          reason={attackedCard ? cardInfo(attackedCard).name : undefined}
          onPay={(cardIds) => doMove({ type: 'pay', seat: mySeat, cardIds })}
        />
      ) : picked ? (
        <MoveWizard
          key={`play-${picked.card.id}`}
          card={picked.card}
          moves={picked.moves}
          game={game}
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
  panelTargeted: {
    borderColor: theme.danger,
  },
  info: {
    gap: 3,
    flexShrink: 1,
  },
  status: {
    justifyContent: 'center',
  },
  mine: {
    borderColor: theme.gold,
  },
  mineContent: {
    gap: 4,
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
  sets: {
    color: theme.gold,
    fontSize: 12,
    fontWeight: '800',
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
  timeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.line,
    overflow: 'hidden',
  },
  timeBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.gold,
  },
  playsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.muted,
  },
  dotOn: {
    backgroundColor: theme.gold,
    borderColor: theme.gold,
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
    borderColor: theme.gold,
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSkip: {
    backgroundColor: theme.danger,
  },
  badgeImmune: {
    backgroundColor: theme.gold,
  },
  badgeText: {
    color: theme.cardInk,
    fontSize: 18,
    fontWeight: '800',
  },
  badgeTextDark: {
    color: theme.cardInk,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.danger,
  },
  arrowText: {
    color: theme.danger,
    fontSize: 11,
    fontWeight: '800',
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.panel,
    borderWidth: 2,
    borderColor: theme.danger,
    maxWidth: '94%',
  },
  bannerText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
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
    paddingBottom: 4,
  },
  buttons: {
    width: 108,
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
    paddingHorizontal: 4,
  },
  secondaryText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
});
