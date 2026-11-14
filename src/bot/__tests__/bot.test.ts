// اختبارات البوت — plan.md المرحلة 6
import { chooseMove } from '../bot';
import { applyMove, legalMoves, seatsToAct } from '../../engine/moves';
import { createRng } from '../../engine/rng';
import { allCards, createGame, type GameState } from '../../engine/state';
import { giveFullSet, must, place, placeAll, readyState } from '../../testing/helpers';

const ME = 0;
const rng = () => createRng(5);

describe('أولويات البوت', () => {
  it('يسحب أول شي', () => {
    const state = { ...readyState([]), turn: { seat: ME, hasDrawn: false, playsUsed: 0 } };
    expect(chooseMove(state, ME, rng())).toEqual({ type: 'draw', seat: ME });
  });

  it('العقارات أولاً، ثم الفلوس', () => {
    let state = readyState(['money:5:1', 'property:red:1', 'money:1:1']);
    expect(chooseMove(state, ME, rng())).toEqual({ type: 'playProperty', seat: ME, cardId: 'property:red:1' });
    state = must(applyMove(state, { type: 'playProperty', seat: ME, cardId: 'property:red:1' }));
    expect(chooseMove(state, ME, rng())).toEqual({ type: 'bankMoney', seat: ME, cardId: 'money:5:1' });
  });

  it('يستخدم الأكشن إذا له هدف مفيد، وما يلعبه إذا ما له هدف', () => {
    // قرقش على لاعب ما عنده شي: ما ينلعب
    expect(chooseMove(readyState(['action:qarqash:1']), ME, rng())).toEqual({ type: 'endTurn', seat: ME });
    // قرقش على لاعب عنده فلوس: ينلعب عليه
    const state = place(readyState(['action:qarqash:1']), 'money:5:1', { zone: 'bank', seat: 2 });
    expect(chooseMove(state, ME, rng())).toEqual({
      type: 'playAction',
      seat: ME,
      cardId: 'action:qarqash:1',
      targetSeat: 2,
    });
  });

  it('ياخذ الطقم الكامل براحت عليك', () => {
    const state = giveFullSet(readyState(['action:rahatAlek:1', 'money:1:1']), 3, 'darkBlue');
    expect(chooseMove(state, ME, rng())).toEqual({
      type: 'playAction',
      seat: ME,
      cardId: 'action:rahatAlek:1',
      targetSeat: 3,
      color: 'darkBlue',
    });
  });

  it('ما يحرق كروته وينهي دوره إذا ما عنده لعبة مفيدة', () => {
    expect(chooseMove(readyState(['action:malekAmal:1', 'action:ekshef:1']), ME, rng())).toEqual({
      type: 'endTurn',
      seat: ME,
    });
  });

  it('خلص كروت دوره ويده فوق 7: ينهي الدور (الزايد ينحرق عشوائياً، ما فيه حركة رمي)', () => {
    const hand = [
      'property:red:1',
      'joker:1',
      'action:malekAmal:1',
      'action:hayyour:1',
      'action:ekshef:1',
      'action:rahatAlek:1',
      'property:green:1',
      'action:tebWetkhayyar:1',
    ];
    const state = { ...readyState(hand), turn: { seat: ME, hasDrawn: true, playsUsed: 3 } };
    expect(chooseMove(state, ME, rng())).toEqual({ type: 'endTurn', seat: ME });
  });

  it('ما له حركة إذا مو دوره وما عليه رد ولا دفع', () => {
    expect(chooseMove(readyState([]), 2, rng())).toBeNull();
  });
});

describe('ردود البوت', () => {
  function attackSeat1(card: string, seat1Hand: readonly string[], setup: (s: GameState) => GameState): GameState {
    const state = placeAll(setup(readyState([card])), seat1Hand, { zone: 'hand', seat: 1 });
    return state;
  }

  it('يرد بمالك امل على أخذ الطقم الكامل', () => {
    let state = attackSeat1('action:rahatAlek:1', ['action:malekAmal:1'], (s) => giveFullSet(s, 1, 'darkBlue'));
    state = must(
      applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:rahatAlek:1', targetSeat: 1, color: 'darkBlue' }),
    );
    expect(chooseMove(state, 1, rng())).toEqual({ type: 'respond', seat: 1, cardId: 'action:malekAmal:1' });
  });

  it('يرد بحيور على الإيجار العالي', () => {
    let state = attackSeat1('rent:rentOne:1', ['action:hayyour:1'], (s) =>
      place(giveFullSet(s, ME, 'darkBlue'), 'money:10:1', { zone: 'bank', seat: 1 }),
    );
    state = must(
      applyMove(state, { type: 'playRent', seat: ME, cardId: 'rent:rentOne:1', color: 'darkBlue', targetSeat: 1 }),
    );
    expect(chooseMove(state, 1, rng())).toEqual({ type: 'respond', seat: 1, cardId: 'action:hayyour:1' });
  });

  it('ما يضيّع كرت الرد على هجمة صغيرة', () => {
    let state = attackSeat1('action:eyadi:1', ['action:malekAmal:1'], (s) => place(s, 'money:5:1', { zone: 'bank', seat: 1 }));
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:eyadi:1' }));
    expect(chooseMove(state, 1, rng())).toEqual({ type: 'respond', seat: 1 });
  });

  it('يختار الدفع تلقائياً', () => {
    let state = attackSeat1('action:qarqash:1', [], (s) => place(s, 'money:5:1', { zone: 'bank', seat: 1 }));
    state = must(applyMove(state, { type: 'playAction', seat: ME, cardId: 'action:qarqash:1', targetSeat: 1 }));
    expect(chooseMove(state, 1, rng())).toEqual({ type: 'pay', seat: 1, cardIds: ['money:5:1'] });
  });
});

describe('4 بوتات يلعبون 500 مباراة', () => {
  it('كل مباراة تنتهي بفائز، بدون حركة مخالفة وبدون تعليق', () => {
    const lengths: number[] = [];
    let responseWindows = 0;

    for (let seed = 1; seed <= 500; seed++) {
      const botRng = createRng(seed * 31 + 7);
      let state = createGame(seed, seed % 2 === 0 ? 6 : 8);
      let moves = 0;

      while (state.winner === null) {
        if (moves >= 20000) throw new Error(`المباراة علّقت: بذرة ${seed}`);
        const seats = seatsToAct(state);
        const seat = seats[0];
        if (seat === undefined) throw new Error(`ما فيه لاعب عليه حركة: بذرة ${seed}`);
        if (state.response !== null) responseWindows++;

        // البوت لازم يرجّع حركة بكل نافذة (دور أو رد أو دفع)
        const move = chooseMove(state, seat, botRng);
        if (move === null) throw new Error(`البوت ما رد: بذرة ${seed} مقعد ${seat}`);
        // والحركة لازم تكون من الحركات القانونية
        expect(legalMoves(state)).toContainEqual(move);

        const result = applyMove(state, move);
        if (!result.ok) throw new Error(`حركة مخالفة (${result.error}): بذرة ${seed} ${JSON.stringify(move)}`);
        state = result.state;
        moves++;
      }

      expect(new Set(allCards(state).map((card) => card.id)).size).toBe(132);
      lengths.push(moves);
    }

    const longest = Math.max(...lengths);
    const average = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    process.stdout.write(`\n[500 مباراة بوتات] متوسط الحركات: ${average} — أطول مباراة: ${longest} — نوافذ رد: ${responseWindows}\n`);

    const sorted = lengths.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const long = lengths.filter((n) => n > 3000).length;
    process.stdout.write(`[500 مباراة بوتات] وسيط الحركات: ${median} — فوق 3000 حركة: ${long}\n`);
    for (const target of [6, 8]) {
      // البذرة الزوجية شرطها 6 والفردية 8
      const group = lengths.filter((_, index) => ((index + 1) % 2 === 0 ? 6 : 8) === target).sort((a, b) => a - b);
      const groupMedian = group[Math.floor(group.length / 2)] ?? 0;
      const groupLong = group.filter((n) => n > 3000).length;
      process.stdout.write(
        `[شرط ${target} أطقم] مباريات: ${group.length} — وسيط: ${groupMedian} — أطول: ${group[group.length - 1]} — فوق 3000: ${groupLong}\n`,
      );
      // شرط 8 أطقم (8 ألوان من 10) يطوّل المباراة بطبيعته، فحدّه أوسع.
      expect(groupMedian).toBeLessThan(target === 6 ? 1000 : 2500);
      // بشرط 6 أطقم ما فيه مباراة توصل 4000 حركة. (الحد كان 3000 قبل ما يصير حرق الزايد عشوائي بالإصدار 1.9؛
      // انرفع بموافقة صاحب المشروع لأن مباراة وحدة من 250 وصلت 3121.)
      if (target === 6) expect(group[group.length - 1] ?? 0).toBeLessThan(4000);
    }

    expect(lengths).toHaveLength(500);
    // عدد أدوار معقول: كل المباريات تنتهي تحت حد التعليق (20000 حركة)، والوسيط قصير.
    expect(median).toBeLessThan(1500);
    expect(responseWindows).toBeGreaterThan(0);
  }, 600000);
});
