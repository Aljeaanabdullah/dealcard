// src/data/colors.ts
function getColor(id) {
  const def = COLORS.find((color) => color.id === id);
  if (!def) {
    throw new Error(`لون غير معروف: ${id}`);
  }
  return def;
}
var COLORS = [
  { id: "brown", name: "بني", setSize: 2, regions: ["الجهراء", "الصليبية"], propertyValue: 1, rent: [1, 2] },
  { id: "lightBlue", name: "أزرق فاتح", setSize: 3, regions: ["الفحيحيل", "المنقف", "أبو حليفة"], propertyValue: 1, rent: [1, 2, 3] },
  { id: "pistachio", name: "فستقي", setSize: 2, regions: ["الوفرة", "العبدلي"], propertyValue: 2, rent: [1, 2] },
  { id: "purple", name: "بنفسجي", setSize: 3, regions: ["حولي", "السالمية", "الجابرية"], propertyValue: 2, rent: [1, 2, 4] },
  { id: "orange", name: "برتقالي", setSize: 3, regions: ["الفروانية", "خيطان", "الرقعي"], propertyValue: 2, rent: [1, 3, 5] },
  { id: "red", name: "أحمر", setSize: 3, regions: ["المباركية", "شرق", "المرقاب"], propertyValue: 3, rent: [2, 3, 6] },
  { id: "yellow", name: "أصفر", setSize: 3, regions: ["الخيران", "بنيدر", "الزور"], propertyValue: 3, rent: [2, 4, 6] },
  { id: "green", name: "أخضر", setSize: 3, regions: ["الشامية", "كيفان", "الروضة"], propertyValue: 4, rent: [2, 4, 7] },
  { id: "darkBlue", name: "أزرق غامق", setSize: 2, regions: ["ضاحية عبدالله السالم", "النزهة"], propertyValue: 4, rent: [3, 8] },
  { id: "black", name: "أسود", setSize: 4, regions: ["الرياض", "دبي", "الدوحة", "المنامة"], propertyValue: 2, rent: [1, 2, 3, 4] }
];

// src/data/cards.ts
var ACTIONS = [
  // أ) كروت الدفع
  { id: "qarqash", name: "قرقش", count: 3, group: "payment", amount: 5 },
  { id: "qardIskan", name: "قرض اسكان", count: 1, group: "payment", amount: 7 },
  { id: "eyadi", name: "العيادي", count: 3, group: "payment", amount: 2 },
  { id: "tathmeen", name: "تثمين", count: 1, group: "payment" },
  { id: "doubleRent", name: "دوبل ايجار", count: 2, group: "payment" },
  // ب) كروت السرقة والتبديل
  { id: "boog", name: "بوق لاتخاف", count: 3, group: "steal" },
  { id: "boogDouble", name: "بوق لاتخاف دبل", count: 1, group: "steal" },
  { id: "boogJoker", name: "بوق الجيكر", count: 1, group: "steal" },
  { id: "baddel", name: "بدل", count: 3, group: "steal" },
  { id: "rahatAlek", name: "راحت عليك", count: 2, group: "steal" },
  { id: "endebes", name: "اندبس", count: 1, group: "steal" },
  { id: "ezalah", name: "ازاله", count: 1, group: "steal" },
  { id: "etHas", name: "اطحس", count: 1, group: "steal" },
  { id: "werathtek", name: "ورثتك", count: 1, group: "steal" },
  { id: "mukhalafah", name: "مخالفه", count: 1, group: "steal" },
  // ج) كروت الدور واليد
  { id: "draw2", name: "اسحب 2", count: 10, group: "turn" },
  { id: "extraPlay", name: "زايد لعبه", count: 2, group: "turn" },
  { id: "estareeh", name: "استريح", count: 1, group: "turn" },
  { id: "ekshef", name: "اكشف", count: 1, group: "turn" },
  { id: "tebWetkhayyar", name: "طب وتخير", count: 1, group: "turn" },
  // د) كروت الدفاع والرد
  { id: "malekAmal", name: "مالك امل", count: 3, group: "defense" },
  { id: "hayyour", name: "حيور", count: 1, group: "defense" },
  { id: "fazaah", name: "فزعه", count: 1, group: "defense" },
  { id: "hasanah", name: "حصانه", count: 1, group: "defense" },
  { id: "maTshoofShar", name: "ماتشوف شر", count: 1, group: "defense" },
  { id: "edfaaliEjari", name: "ادفعلي ايجاري", count: 1, group: "defense" }
];
var RENTS = [
  { id: "rentOne", name: "ادفع ايجار — شخص واحد", count: 3, colors: "any", payer: "one" },
  { id: "rentYellowRed", name: "ادفع ايجار الجميع — أصفر وأحمر", count: 2, colors: ["yellow", "red"], payer: "all" },
  { id: "rentOrangePurple", name: "ادفع ايجار الجميع — برتقالي وبنفسجي", count: 2, colors: ["orange", "purple"], payer: "all" },
  { id: "rentLightBlueBlack", name: "ادفع ايجار الجميع — أزرق فاتح وأسود", count: 2, colors: ["lightBlue", "black"], payer: "all" },
  { id: "rentDarkBlueGreen", name: "ادفع ايجار الجميع — أزرق غامق وأخضر", count: 2, colors: ["darkBlue", "green"], payer: "all" },
  { id: "rentPistachioBlack", name: "ادفع ايجار الجميع — فستقي وأسود", count: 2, colors: ["pistachio", "black"], payer: "all" }
];
var JOKER = { name: "جيكر", count: 3 };
var MONEY = [
  { value: 1, count: 8 },
  { value: 2, count: 7 },
  { value: 3, count: 5 },
  { value: 4, count: 5 },
  { value: 5, count: 4 },
  { value: 10, count: 1 }
];
var BUILDINGS = [
  { id: "resort", name: "منتجع", rentBonus: 5, value: 5, count: 1 },
  { id: "chalet", name: "شاليه", rentBonus: 4, value: 4, count: 2 },
  { id: "plot", name: "قسيمه", rentBonus: 3, value: 3, count: 3 },
  { id: "apartments", name: "عماره", rentBonus: 4, value: 4, count: 4 }
];
function buildDeck() {
  const deck = [];
  for (const def of ACTIONS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `action:${def.id}:${n}`, kind: "action", action: def.id });
    }
  }
  for (const def of RENTS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `rent:${def.id}:${n}`, kind: "rent", rent: def.id });
    }
  }
  for (const color of COLORS) {
    color.regions.forEach((region, index) => {
      deck.push({ id: `property:${color.id}:${index + 1}`, kind: "property", color: color.id, region });
    });
  }
  for (let n = 1; n <= JOKER.count; n++) {
    deck.push({ id: `joker:${n}`, kind: "joker" });
  }
  for (const def of MONEY) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `money:${def.value}:${n}`, kind: "money", value: def.value });
    }
  }
  for (const def of BUILDINGS) {
    for (let n = 1; n <= def.count; n++) {
      deck.push({ id: `building:${def.id}:${n}`, kind: "building", building: def.id });
    }
  }
  return deck;
}

// src/data/rules.ts
var PLAYER_COUNT = 4;
var STARTING_HAND_SIZE = 5;
var DRAW_PER_TURN = 2;
var DRAW_WHEN_HAND_EMPTY = 5;
var MAX_PLAYS_PER_TURN = 3;
var MAX_HAND_SIZE = 7;
var WIN_TARGETS = [6, 8];
var TURN_SECONDS = 90;
var MATCH_WAIT_SECONDS = 30;

// src/engine/sets.ts
function isSetComplete(properties, color) {
  const inColor = properties.filter((p) => p.color === color);
  const hasRealProperty = inColor.some((p) => p.card.kind === "property");
  return hasRealProperty && inColor.length >= getColor(color).setSize;
}
function completeColors(properties) {
  return COLORS.map((color) => color.id).filter((id) => isSetComplete(properties, id));
}

// src/engine/payment.ts
function buildingDef(card) {
  return card.kind === "building" ? BUILDINGS.find((def) => def.id === card.building) : void 0;
}
function rentFor(player, color) {
  const inColor = player.properties.filter((p) => p.color === color);
  if (!inColor.some((p) => p.card.kind === "property")) return 0;
  const def = getColor(color);
  const count = Math.min(inColor.length, def.setSize);
  let rent = def.rent[count - 1] ?? 0;
  if (isSetComplete(player.properties, color)) {
    for (const building of player.buildings) {
      if (building.color === color) {
        rent += buildingDef(building.card)?.rentBonus ?? 0;
      }
    }
  }
  return rent;
}
function rentForAllCompleteSets(player) {
  return completeColors(player.properties).reduce((sum2, color) => sum2 + rentFor(player, color), 0);
}
function cardValue(card) {
  switch (card.kind) {
    case "money":
      return card.value;
    case "property":
      return getColor(card.color).propertyValue;
    case "building":
      return buildingDef(card)?.value ?? 0;
    default:
      return 0;
  }
}
function paymentTiers(player) {
  return [
    [...player.bank],
    player.buildings.map((b) => b.card),
    player.properties.map((p) => p.card).filter((card) => card.kind === "property")
  ];
}
function sum(cards) {
  return cards.reduce((total, card) => total + cardValue(card), 0);
}
function totalPayable(player) {
  return paymentTiers(player).reduce((total, tier) => total + sum(tier), 0);
}
function isValidPayment(player, amount, cardIds) {
  const chosenIds = new Set(cardIds);
  if (chosenIds.size !== cardIds.length) return false;
  const tiers = paymentTiers(player);
  const payableIds = new Set(tiers.flat().map((card) => card.id));
  for (const id of chosenIds) {
    if (!payableIds.has(id)) return false;
  }
  let remaining = amount;
  for (const tier of tiers) {
    const chosen = tier.filter((card) => chosenIds.has(card.id));
    if (remaining <= 0) {
      if (chosen.length > 0) return false;
      continue;
    }
    if (sum(chosen) >= remaining) {
      remaining = 0;
      continue;
    }
    if (chosen.length !== tier.length) return false;
    remaining -= sum(tier);
  }
  return true;
}
function suggestPayment(player, amount) {
  const ids = [];
  let remaining = amount;
  for (const tier of paymentTiers(player)) {
    const sorted = tier.slice().sort((a, b) => cardValue(b) - cardValue(a));
    for (const card of sorted) {
      if (remaining <= 0) return ids;
      ids.push(card.id);
      remaining -= cardValue(card);
    }
  }
  return ids;
}

// src/engine/rng.ts
function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randomInt(rng, max) {
  return Math.floor(rng() * max);
}
function nextSeed(rng) {
  return randomInt(rng, 4294967296);
}
function shuffle(items, rng) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const a = result[i];
    const b = result[j];
    result[i] = b;
    result[j] = a;
  }
  return result;
}

// src/engine/core.ts
function getPlayer(state, seat) {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return player;
}
function withPlayer(state, player) {
  return { ...state, players: state.players.map((p) => p.seat === player.seat ? player : p) };
}
function otherSeats(seat) {
  const seats = [];
  for (let s = 0; s < PLAYER_COUNT; s++) {
    if (s !== seat) seats.push(s);
  }
  return seats;
}
function isOtherSeat(seat, target) {
  return target !== void 0 && Number.isInteger(target) && target >= 0 && target < PLAYER_COUNT && target !== seat;
}
function isReal(placed) {
  return placed.card.kind === "property";
}
function stealableProperties(player) {
  return player.properties.filter((p) => isReal(p) && !isSetComplete(player.properties, p.color));
}
function stealableJokers(player) {
  return player.properties.filter((p) => p.card.kind === "joker" && !isSetComplete(player.properties, p.color));
}
function removableFromCompleteSets(player) {
  return player.properties.filter((p) => isReal(p) && isSetComplete(player.properties, p.color));
}
function detachBrokenBuildings(player) {
  return {
    ...player,
    buildings: player.buildings.map(
      (b) => b.color !== null && !isSetComplete(player.properties, b.color) ? { card: b.card, color: null } : b
    )
  };
}
function checkWin(state, ...seats) {
  if (state.winner !== null) return state;
  for (const seat of seats) {
    if (completeColors(getPlayer(state, seat).properties).length >= state.winTarget) {
      return { ...state, winner: seat };
    }
  }
  return state;
}
function drawCards(state, seat, wanted) {
  let drawPile = state.drawPile.slice();
  let firePile = state.firePile.slice();
  let seed = state.seed;
  const drawn = [];
  while (drawn.length < wanted) {
    if (drawPile.length === 0) {
      if (firePile.length === 0) break;
      const rng = createRng(seed);
      drawPile = shuffle(firePile, rng);
      firePile = [];
      seed = nextSeed(rng);
    }
    const card = drawPile.pop();
    if (!card) break;
    drawn.push(card);
  }
  const player = getPlayer(state, seat);
  return withPlayer({ ...state, drawPile, firePile, seed }, { ...player, hand: [...player.hand, ...drawn] });
}
function transferProperties(state, fromSeat, toSeat, cardIds, newColor) {
  const ids = new Set(cardIds);
  const from = getPlayer(state, fromSeat);
  const moving = from.properties.filter((p) => ids.has(p.card.id));
  const to = getPlayer(state, toSeat);
  const nextFrom = detachBrokenBuildings({ ...from, properties: from.properties.filter((p) => !ids.has(p.card.id)) });
  const nextTo = {
    ...to,
    properties: [...to.properties, ...moving.map((p) => ({ card: p.card, color: newColor ?? p.color }))]
  };
  return withPlayer(withPlayer(state, nextFrom), nextTo);
}
function addDebt(state, from, to, amount) {
  if (amount <= 0 || totalPayable(getPlayer(state, from)) <= 0) return state;
  const debt = { from, amount };
  if (state.pending === null) {
    return { ...state, pending: { to, debts: [debt] } };
  }
  if (state.pending.to === to) {
    return { ...state, pending: { to, debts: [...state.pending.debts, debt] } };
  }
  const index = state.pendingQueue.findIndex((p) => p.to === to);
  if (index >= 0) {
    return {
      ...state,
      pendingQueue: state.pendingQueue.map((p, i) => i === index ? { to, debts: [...p.debts, debt] } : p)
    };
  }
  return { ...state, pendingQueue: [...state.pendingQueue, { to, debts: [debt] }] };
}

// src/engine/result.ts
function fail(error) {
  return { ok: false, error };
}
function done(state) {
  return { ok: true, state };
}

// src/engine/effects.ts
var SWAP_ACTIONS = ["baddel", "endebes", "etHas"];
var CHOICE_ACTIONS = [
  "boog",
  "boogDouble",
  "boogJoker",
  "rahatAlek",
  "ezalah",
  "werathtek",
  "mukhalafah"
];
function applyEffect(state, effect) {
  const { actor, target, params } = effect;
  if (state.immune.includes(target)) return fail("invalidTarget");
  const me = getPlayer(state, actor);
  const them = getPlayer(state, target);
  const targetIds = params.targetCardIds ?? [];
  switch (effect.action) {
    // ---------- الدفع والإيجار ----------
    case "rent":
    case "qarqash":
    case "qardIskan":
    case "eyadi":
    case "tathmeen":
      return done(addDebt(state, target, actor, effect.amount));
    // ---------- السرقة والتبديل ----------
    case "boog":
    case "boogDouble": {
      const stealable = stealableProperties(them);
      const needed = effect.action === "boog" ? 1 : Math.min(2, stealable.length);
      if (needed === 0 || targetIds.length !== needed || new Set(targetIds).size !== needed) return fail("invalidCard");
      if (!targetIds.every((id) => stealable.some((p) => p.card.id === id))) return fail("invalidCard");
      return done(checkWin(transferProperties(state, target, actor, targetIds), actor));
    }
    case "boogJoker": {
      const jokerId = targetIds[0];
      if (targetIds.length !== 1 || !stealableJokers(them).some((p) => p.card.id === jokerId)) return fail("invalidCard");
      if (params.color === void 0) return fail("colorRequired");
      return done(checkWin(transferProperties(state, target, actor, targetIds, params.color), actor));
    }
    case "baddel": {
      const theirId = targetIds[0];
      const ownId = params.ownCardId;
      if (targetIds.length !== 1 || ownId === void 0) return fail("invalidCard");
      if (!stealableProperties(them).some((p) => p.card.id === theirId)) return fail("invalidCard");
      if (!stealableProperties(me).some((p) => p.card.id === ownId)) return fail("invalidCard");
      const swapped = transferProperties(transferProperties(state, target, actor, targetIds), actor, target, [ownId]);
      return done(checkWin(swapped, actor, target));
    }
    case "rahatAlek": {
      const color = params.color;
      if (color === void 0) return fail("colorRequired");
      if (!isSetComplete(them.properties, color)) return fail("setNotComplete");
      const next = withPlayer(
        withPlayer(state, {
          ...them,
          properties: them.properties.filter((p) => p.color !== color),
          buildings: them.buildings.filter((b) => b.color !== color)
        }),
        {
          ...me,
          properties: [...me.properties, ...them.properties.filter((p) => p.color === color)],
          buildings: [...me.buildings, ...them.buildings.filter((b) => b.color === color)]
        }
      );
      return done(checkWin(next, actor));
    }
    case "endebes": {
      const mine = params.ownColor;
      const theirs = params.color;
      if (mine === void 0 || theirs === void 0) return fail("colorRequired");
      if (!isSetComplete(me.properties, mine)) return fail("noCompleteSet");
      if (!isSetComplete(them.properties, theirs)) return fail("setNotComplete");
      const nextMe = detachBrokenBuildings({
        ...me,
        properties: [...me.properties.filter((p) => p.color !== mine), ...them.properties.filter((p) => p.color === theirs)],
        buildings: [...me.buildings.filter((b) => b.color !== mine), ...them.buildings.filter((b) => b.color === theirs)]
      });
      const nextThem = detachBrokenBuildings({
        ...them,
        properties: [...them.properties.filter((p) => p.color !== theirs), ...me.properties.filter((p) => p.color === mine)],
        buildings: [...them.buildings.filter((b) => b.color !== theirs), ...me.buildings.filter((b) => b.color === mine)]
      });
      return done(checkWin(withPlayer(withPlayer(state, nextMe), nextThem), actor, target));
    }
    case "ezalah": {
      const removeId = targetIds[0];
      if (targetIds.length !== 1 || !removableFromCompleteSets(them).some((p) => p.card.id === removeId)) {
        return fail("invalidCard");
      }
      return done(checkWin(transferProperties(state, target, actor, targetIds), actor));
    }
    // ---------- اليد ----------
    case "etHas":
      return done(withPlayer(withPlayer(state, { ...me, hand: them.hand }), { ...them, hand: me.hand }));
    case "werathtek": {
      const taken = them.hand.find((c) => c.id === params.pickedCardId);
      if (!taken) return fail("invalidCard");
      return done(
        withPlayer(withPlayer(state, { ...them, hand: them.hand.filter((c) => c.id !== taken.id) }), {
          ...me,
          hand: [...me.hand, taken]
        })
      );
    }
    case "mukhalafah": {
      const burned = them.hand.find((c) => c.id === params.pickedCardId);
      if (!burned) return fail("invalidCard");
      return done(
        withPlayer(
          { ...state, firePile: [...state.firePile, burned] },
          { ...them, hand: them.hand.filter((c) => c.id !== burned.id) }
        )
      );
    }
    // ---------- الدور ----------
    case "estareeh":
      return done({ ...state, skips: [...state.skips, target] });
    case "ekshef":
      return done({ ...state, revealed: { viewer: actor, target } });
    default:
      return fail("unsupportedAction");
  }
}
function pairs(items) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      result.push([items[i], items[j]]);
    }
  }
  return result;
}
function effectOptions(state, action, actor, target) {
  if (state.immune.includes(target)) return [];
  const me = getPlayer(state, actor);
  const them = getPlayer(state, target);
  switch (action) {
    case "rent":
    case "qarqash":
    case "qardIskan":
    case "eyadi":
    case "tathmeen":
    case "etHas":
    case "estareeh":
    case "ekshef":
      return [{}];
    case "boog":
      return stealableProperties(them).map((p) => ({ targetCardIds: [p.card.id] }));
    case "boogDouble": {
      const stealable = stealableProperties(them);
      if (stealable.length === 1) return [{ targetCardIds: stealable.map((p) => p.card.id) }];
      return pairs(stealable).map(([a, b]) => ({ targetCardIds: [a.card.id, b.card.id] }));
    }
    case "boogJoker":
      return stealableJokers(them).flatMap((p) => COLORS.map((color) => ({ targetCardIds: [p.card.id], color: color.id })));
    case "baddel":
      return stealableProperties(them).flatMap(
        (theirs) => stealableProperties(me).map((mine) => ({ targetCardIds: [theirs.card.id], ownCardId: mine.card.id }))
      );
    case "rahatAlek":
      return completeColors(them.properties).map((color) => ({ color }));
    case "endebes":
      return completeColors(me.properties).flatMap(
        (ownColor) => completeColors(them.properties).map((color) => ({ color, ownColor }))
      );
    case "ezalah":
      return removableFromCompleteSets(them).map((p) => ({ targetCardIds: [p.card.id] }));
    case "werathtek":
    case "mukhalafah":
      return them.hand.map((c) => ({ pickedCardId: c.id }));
    default:
      return [];
  }
}

// src/engine/moves.ts
var RESPONSE_KINDS = ["malekAmal", "hayyour", "fazaah", "maTshoofShar", "edfaaliEjari"];
function isResponseKind(value) {
  return value !== void 0 && RESPONSE_KINDS.includes(value);
}
function countPlay(state) {
  return { ...state, turn: { ...state.turn, playsUsed: state.turn.playsUsed + 1 } };
}
function checkCanPlay(state) {
  if (!state.turn.hasDrawn) return "mustDrawFirst";
  if (state.turn.playsUsed >= MAX_PLAYS_PER_TURN + state.extraPlays) return "noPlaysLeft";
  return null;
}
function allowedResponses(state, window, seat) {
  const { effect } = window;
  if (seat === effect.actor) return [];
  if (seat === effect.target) {
    const kinds = effect.isRent ? ["malekAmal", "hayyour", "maTshoofShar", "edfaaliEjari"] : ["malekAmal", "hayyour"];
    return state.immune.includes(effect.actor) ? kinds.filter((k) => k !== "hayyour") : kinds;
  }
  return ["fazaah"];
}
function holdsResponse(player, kinds) {
  if (kinds.length === 0) return false;
  return player.hand.some(
    (c) => c.kind === "action" && (c.action === "tebWetkhayyar" || kinds.includes(c.action))
  );
}
function defenders(state, window) {
  return state.players.map((p) => p.seat).filter(
    (seat) => !window.passed.includes(seat) && holdsResponse(getPlayer(state, seat), allowedResponses(state, window, seat))
  );
}
function actorCanCounter(state, actor) {
  return holdsResponse(getPlayer(state, actor), ["malekAmal"]);
}
function applyOrFizzle(state, effect) {
  const result = applyEffect(state, effect);
  return result.ok ? result.state : state;
}
function advance(state) {
  let next = state;
  while (next.winner === null && next.response === null && next.queue.length > 0) {
    const [effect, ...rest] = next.queue;
    if (!effect) break;
    next = { ...next, queue: rest };
    const window = { effect, standing: null, awaiting: "defense", passed: [] };
    next = defenders(next, window).length > 0 ? { ...next, response: window } : applyOrFizzle(next, effect);
  }
  return next;
}
function settleDefense(state) {
  const window = state.response;
  if (!window || defenders(state, window).length > 0) return state;
  return advance(applyOrFizzle({ ...state, response: null }, window.effect));
}
function resolveStanding(state, effect, standing) {
  switch (standing.kind) {
    case "hayyour":
      return standing.bounce ? applyOrFizzle(state, standing.bounce) : state;
    case "edfaaliEjari":
      return standing.payer === null ? state : { ...state, queue: [{ ...effect, target: standing.payer }, ...state.queue] };
    default:
      return state;
  }
}
function buildBounce(state, effect, choice) {
  if (state.immune.includes(effect.actor) || SWAP_ACTIONS.includes(effect.action)) return { ok: true, bounce: null };
  const reversed = { ...effect, actor: effect.target, target: effect.actor, params: {} };
  if (!CHOICE_ACTIONS.includes(effect.action)) return { ok: true, bounce: reversed };
  if (!choice) return { ok: true, bounce: null };
  const picked = choice.handIndex === void 0 ? void 0 : getPlayer(state, effect.actor).hand[choice.handIndex]?.id;
  const params = {
    ...choice.targetCardIds ? { targetCardIds: choice.targetCardIds } : {},
    ...choice.color ? { color: choice.color } : {},
    ...picked ? { pickedCardId: picked } : {}
  };
  const bounce = { ...reversed, params };
  return applyEffect(state, bounce).ok ? { ok: true, bounce } : { ok: false, error: "invalidCard" };
}
function respond(state, move) {
  const window = state.response;
  if (!window) return fail("noResponsePending");
  const { effect } = window;
  const seat = move.seat;
  const allowed = window.awaiting === "actor" ? seat === effect.actor ? ["malekAmal"] : [] : allowedResponses(state, window, seat);
  const isMyTurnToRespond = window.awaiting === "actor" ? seat === effect.actor : defenders(state, window).includes(seat);
  if (!isMyTurnToRespond) return fail("notYourResponse");
  if (move.cardId === void 0) {
    if (window.awaiting === "actor") {
      if (!window.standing) return fail("invalidResponse");
      return done(advance(resolveStanding({ ...state, response: null }, effect, window.standing)));
    }
    return done(settleDefense({ ...state, response: { ...window, passed: [...window.passed, seat] } }));
  }
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === move.cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "action") return fail("wrongCardKind");
  const kind = card.action === "tebWetkhayyar" ? move.as : card.action;
  if (!isResponseKind(kind) || !allowed.includes(kind)) return fail("invalidResponse");
  const used = withPlayer(
    { ...state, firePile: [...state.firePile, card] },
    { ...player, hand: player.hand.filter((c) => c.id !== card.id) }
  );
  if (window.awaiting === "actor") {
    return done(settleDefense({ ...used, response: { ...window, standing: null, awaiting: "defense", passed: [] } }));
  }
  let bounce = null;
  let payer = null;
  if (kind === "hayyour") {
    const built = buildBounce(used, effect, move.bounce);
    if (!built.ok) return fail(built.error);
    bounce = built.bounce;
  }
  if (kind === "edfaaliEjari") {
    const chosen = move.payerSeat;
    if (!isOtherSeat(seat, chosen) || chosen === effect.actor || state.immune.includes(chosen)) {
      return fail("invalidTarget");
    }
    payer = chosen;
  }
  const standing = { kind, by: seat, bounce, payer };
  if (!actorCanCounter(used, effect.actor)) {
    return done(advance(resolveStanding({ ...used, response: null }, effect, standing)));
  }
  return done({ ...used, response: { ...window, standing, awaiting: "actor" } });
}
function draw(state, seat) {
  if (state.turn.hasDrawn) return fail("alreadyDrew");
  const wanted = getPlayer(state, seat).hand.length === 0 ? DRAW_WHEN_HAND_EMPTY : DRAW_PER_TURN;
  const next = drawCards(state, seat, wanted);
  return done({ ...next, turn: { ...next.turn, hasDrawn: true } });
}
function playProperty(state, seat, cardId) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "property") return fail("wrongCardKind");
  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    properties: [...player.properties, { card, color: card.color }]
  });
  return done(checkWin(next, seat));
}
function playJoker(state, seat, cardId, color) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "joker") return fail("wrongCardKind");
  const next = withPlayer(countPlay(state), {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    properties: [...player.properties, { card, color }]
  });
  return done(checkWin(next, seat));
}
function moveJoker(state, seat, cardId, color) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const placed = player.properties.find((p) => p.card.id === cardId && p.card.kind === "joker");
  if (!placed) return fail("jokerNotOnTable");
  if (placed.color === color) return fail("sameColor");
  const moved = detachBrokenBuildings({
    ...player,
    properties: player.properties.map((p) => p.card.id === cardId ? { card: p.card, color } : p)
  });
  return done(checkWin(withPlayer(countPlay(state), moved), seat));
}
function bankMoney(state, seat, cardId) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "money") return fail("wrongCardKind");
  return done(
    withPlayer(countPlay(state), {
      ...player,
      hand: player.hand.filter((c) => c.id !== cardId),
      bank: [...player.bank, card]
    })
  );
}
function playRent(state, seat, cardId, color, targetSeat, doubleCardId) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "rent") return fail("wrongCardKind");
  const def = RENTS.find((d) => d.id === card.rent);
  if (!def) return fail("wrongCardKind");
  if (def.colors !== "any" && !def.colors.includes(color)) return fail("colorNotAllowed");
  const rent = rentFor(player, color);
  if (rent <= 0) return fail("noPropertyInColor");
  const played = [card];
  let amount = rent;
  if (doubleCardId !== void 0) {
    const double = player.hand.find((c) => c.id === doubleCardId);
    if (!double) return fail("cardNotInHand");
    if (double.kind !== "action" || double.action !== "doubleRent" && double.action !== "tebWetkhayyar") {
      return fail("wrongCardKind");
    }
    played.push(double);
    amount = rent * 2;
  }
  let payers;
  if (def.payer === "one") {
    if (!isOtherSeat(seat, targetSeat) || state.immune.includes(targetSeat)) return fail("invalidTarget");
    payers = [targetSeat];
  } else {
    payers = otherSeats(seat).filter((s) => !state.immune.includes(s));
  }
  const playedIds = new Set(played.map((c) => c.id));
  const next = withPlayer(
    { ...countPlay(state), firePile: [...state.firePile, ...played] },
    { ...player, hand: player.hand.filter((c) => !playedIds.has(c.id)) }
  );
  const effects = payers.map((target) => ({
    action: "rent",
    isRent: true,
    actor: seat,
    target,
    amount,
    params: {}
  }));
  return done(advance({ ...next, queue: effects }));
}
function buildEffects(base, action, move) {
  const { seat, targetSeat } = move;
  const def = ACTIONS.find((d) => d.id === action);
  const make = (target, amount, params, isRent = false) => ({
    action,
    isRent,
    actor: seat,
    target,
    amount,
    params
  });
  switch (action) {
    case "eyadi":
      return otherSeats(seat).filter((s) => !base.immune.includes(s)).map((target) => make(target, def?.amount ?? 0, {}));
    case "qarqash":
    case "qardIskan":
      if (!isOtherSeat(seat, targetSeat)) return "invalidTarget";
      return [make(targetSeat, def?.amount ?? 0, {})];
    case "tathmeen": {
      if (!isOtherSeat(seat, targetSeat)) return "invalidTarget";
      const amount = rentForAllCompleteSets(getPlayer(base, seat));
      if (amount <= 0) return "noCompleteSet";
      return [make(targetSeat, amount, {}, true)];
    }
    case "boog":
    case "boogDouble":
    case "boogJoker":
    case "baddel":
    case "rahatAlek":
    case "endebes":
    case "ezalah":
    case "etHas":
    case "estareeh":
    case "ekshef": {
      if (!isOtherSeat(seat, targetSeat)) return "invalidTarget";
      const params = {
        ...move.targetCardIds ? { targetCardIds: move.targetCardIds } : {},
        ...move.ownCardId ? { ownCardId: move.ownCardId } : {},
        ...move.color ? { color: move.color } : {},
        ...move.ownColor ? { ownColor: move.ownColor } : {}
      };
      return [make(targetSeat, 0, params)];
    }
    case "werathtek": {
      if (!isOtherSeat(seat, targetSeat)) return "invalidTarget";
      const picked = move.handIndex === void 0 ? void 0 : getPlayer(base, targetSeat).hand[move.handIndex];
      if (!picked) return "invalidCard";
      return [make(targetSeat, 0, { pickedCardId: picked.id })];
    }
    case "mukhalafah": {
      const burns = move.burns ?? [];
      const available = otherSeats(seat).filter((s) => !base.immune.includes(s) && getPlayer(base, s).hand.length > 0);
      const needed = Math.min(2, available.length);
      if (needed === 0) return "invalidTarget";
      if (burns.length !== needed || new Set(burns.map((b) => b.seat)).size !== needed) return "invalidTarget";
      const effects = [];
      for (const burn of burns) {
        if (!available.includes(burn.seat)) return "invalidTarget";
        const picked = getPlayer(base, burn.seat).hand[burn.handIndex];
        if (!picked) return "invalidCard";
        effects.push(make(burn.seat, 0, { pickedCardId: picked.id }));
      }
      return effects;
    }
    default:
      return "unsupportedAction";
  }
}
function playAction(state, move) {
  const { seat, cardId } = move;
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const owner = getPlayer(state, seat);
  const card = owner.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "action") return fail("wrongCardKind");
  const action = card.action === "tebWetkhayyar" ? move.asAction : card.action;
  if (action === void 0 || action === "tebWetkhayyar") return fail("unsupportedAction");
  const counted = action === "extraPlay" ? state : countPlay(state);
  const base = withPlayer(
    { ...counted, firePile: [...state.firePile, card] },
    { ...owner, hand: owner.hand.filter((c) => c.id !== cardId) }
  );
  switch (action) {
    case "draw2":
      return done(drawCards(base, seat, DRAW_PER_TURN));
    case "extraPlay":
      return done({ ...base, extraPlays: base.extraPlays + 1 });
    case "hasanah":
      return done({ ...base, immune: base.immune.includes(seat) ? base.immune : [...base.immune, seat] });
    default:
      break;
  }
  const effects = buildEffects(base, action, move);
  if (typeof effects === "string") return fail(effects);
  for (const effect of effects) {
    const trial = applyEffect(base, effect);
    if (!trial.ok) return trial;
  }
  return done(advance({ ...base, queue: effects }));
}
function burnAction(state, seat, cardId) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "action" && card.kind !== "rent") return fail("wrongCardKind");
  return done(
    withPlayer(
      { ...countPlay(state), firePile: [...state.firePile, card] },
      { ...player, hand: player.hand.filter((c) => c.id !== cardId) }
    )
  );
}
function playBuilding(state, seat, cardId, color) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return fail("cardNotInHand");
  if (card.kind !== "building") return fail("wrongCardKind");
  if (color !== void 0 && !isSetComplete(player.properties, color)) return fail("setNotComplete");
  return done(
    withPlayer(countPlay(state), {
      ...player,
      hand: player.hand.filter((c) => c.id !== cardId),
      buildings: [...player.buildings, { card, color: color ?? null }]
    })
  );
}
function placeBuilding(state, seat, cardId, color) {
  const blocked = checkCanPlay(state);
  if (blocked) return fail(blocked);
  const player = getPlayer(state, seat);
  const placed = player.buildings.find((b) => b.card.id === cardId);
  if (!placed) return fail("buildingNotOnTable");
  if (placed.color === color) return fail("sameColor");
  if (!isSetComplete(player.properties, color)) return fail("setNotComplete");
  return done(
    withPlayer(countPlay(state), {
      ...player,
      buildings: player.buildings.map((b) => b.card.id === cardId ? { card: b.card, color } : b)
    })
  );
}
function pay(state, seat, cardIds) {
  const pending = state.pending;
  const debtIndex = pending ? pending.debts.findIndex((d) => d.from === seat) : -1;
  const debt = pending?.debts[debtIndex];
  if (!pending || !debt) return fail("noPaymentDue");
  const payer = getPlayer(state, seat);
  if (!isValidPayment(payer, debt.amount, cardIds)) return fail("invalidPayment");
  const ids = new Set(cardIds);
  const money = payer.bank.filter((c) => ids.has(c.id));
  const buildings = payer.buildings.filter((b) => ids.has(b.card.id));
  const properties = payer.properties.filter((p) => ids.has(p.card.id));
  const paid = detachBrokenBuildings({
    ...payer,
    bank: payer.bank.filter((c) => !ids.has(c.id)),
    buildings: payer.buildings.filter((b) => !ids.has(b.card.id)),
    properties: payer.properties.filter((p) => !ids.has(p.card.id))
  });
  const receiver = getPlayer(state, pending.to);
  const received = {
    ...receiver,
    bank: [...receiver.bank, ...money],
    // المبنى المدفوع يروح للمستلم بدون طقم (بدون تأثير).
    buildings: [...receiver.buildings, ...buildings.map((b) => ({ card: b.card, color: null }))],
    properties: [...receiver.properties, ...properties]
  };
  const debts = pending.debts.filter((_, i) => i !== debtIndex);
  let nextPending = debts.length > 0 ? { to: pending.to, debts } : null;
  let pendingQueue = state.pendingQueue;
  if (nextPending === null && pendingQueue.length > 0) {
    nextPending = pendingQueue[0] ?? null;
    pendingQueue = pendingQueue.slice(1);
  }
  const next = withPlayer(withPlayer({ ...state, pending: nextPending, pendingQueue }, paid), received);
  return done(checkWin(next, pending.to));
}
function burnExcess(state, seat) {
  const player = getPlayer(state, seat);
  if (player.hand.length <= MAX_HAND_SIZE) return state;
  const rng = createRng(state.seed);
  const hand = player.hand.slice();
  const burned = [];
  while (hand.length > MAX_HAND_SIZE) {
    const [card] = hand.splice(randomInt(rng, hand.length), 1);
    if (!card) break;
    burned.push(card);
  }
  return withPlayer({ ...state, firePile: [...state.firePile, ...burned], seed: nextSeed(rng) }, { ...player, hand });
}
function endTurn(before, seat) {
  if (!before.turn.hasDrawn) return fail("mustDrawFirst");
  const state = burnExcess(before, seat);
  let nextSeat = (seat + 1) % PLAYER_COUNT;
  let skips = state.skips;
  let immune = state.immune;
  for (let i = 0; i < PLAYER_COUNT && skips.includes(nextSeat); i++) {
    const index = skips.indexOf(nextSeat);
    const skipped = nextSeat;
    skips = skips.filter((_, j) => j !== index);
    immune = immune.filter((s) => s !== skipped);
    nextSeat = (nextSeat + 1) % PLAYER_COUNT;
  }
  const turnSeat = nextSeat;
  immune = immune.filter((s) => s !== turnSeat);
  return done({
    ...state,
    skips,
    immune,
    extraPlays: 0,
    revealed: null,
    turn: { seat: nextSeat, hasDrawn: false, playsUsed: 0 }
  });
}
function applyMove(state, move) {
  if (state.winner !== null) return fail("gameOver");
  if (move.type === "respond") return respond(state, move);
  if (state.response !== null) return fail("responsePending");
  if (move.type === "pay") return pay(state, move.seat, move.cardIds);
  if (state.pending !== null) return fail("paymentPending");
  if (move.seat !== state.turn.seat) return fail("notYourTurn");
  switch (move.type) {
    case "draw":
      return draw(state, move.seat);
    case "playProperty":
      return playProperty(state, move.seat, move.cardId);
    case "playJoker":
      return playJoker(state, move.seat, move.cardId, move.color);
    case "moveJoker":
      return moveJoker(state, move.seat, move.cardId, move.color);
    case "bankMoney":
      return bankMoney(state, move.seat, move.cardId);
    case "playRent":
      return playRent(state, move.seat, move.cardId, move.color, move.targetSeat, move.doubleCardId);
    case "playAction":
      return playAction(state, move);
    case "burnAction":
      return burnAction(state, move.seat, move.cardId);
    case "playBuilding":
      return playBuilding(state, move.seat, move.cardId, move.color);
    case "placeBuilding":
      return placeBuilding(state, move.seat, move.cardId, move.color);
    case "endTurn":
      return endTurn(state, move.seat);
  }
}
function pairs2(items) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      result.push([items[i], items[j]]);
    }
  }
  return result;
}
function actionMoves(state, player, cardId, action, viaTeb) {
  const seat = player.seat;
  const base = viaTeb ? { type: "playAction", seat, cardId, asAction: action } : { type: "playAction", seat, cardId };
  const targets = otherSeats(seat).filter((s) => !state.immune.includes(s));
  const moves = [];
  switch (action) {
    case "eyadi":
    case "draw2":
    case "extraPlay":
    case "hasanah":
      moves.push(base);
      break;
    case "tathmeen":
      if (completeColors(player.properties).length > 0) {
        for (const targetSeat of targets) moves.push({ ...base, targetSeat });
      }
      break;
    case "werathtek":
      for (const targetSeat of targets) {
        getPlayer(state, targetSeat).hand.forEach((_, handIndex) => {
          moves.push({ ...base, targetSeat, handIndex });
        });
      }
      break;
    case "mukhalafah": {
      const available = targets.filter((s) => getPlayer(state, s).hand.length > 0);
      const picks = (s) => getPlayer(state, s).hand.map((_, handIndex) => ({ seat: s, handIndex }));
      if (available.length === 1) {
        for (const pick of picks(available[0])) moves.push({ ...base, burns: [pick] });
      }
      for (const [a, b] of pairs2(available)) {
        for (const first of picks(a)) {
          for (const second of picks(b)) moves.push({ ...base, burns: [first, second] });
        }
      }
      break;
    }
    default:
      for (const targetSeat of targets) {
        for (const option of effectOptions(state, action, seat, targetSeat)) {
          moves.push({ ...base, targetSeat, ...option });
        }
      }
      break;
  }
  return moves;
}
function responseMoves(state, window) {
  const { effect } = window;
  const moves = [];
  const seats = window.awaiting === "actor" ? [effect.actor] : defenders(state, window);
  for (const seat of seats) {
    moves.push({ type: "respond", seat });
    const allowed = window.awaiting === "actor" ? ["malekAmal"] : allowedResponses(state, window, seat);
    for (const card of getPlayer(state, seat).hand) {
      if (card.kind !== "action") continue;
      const viaTeb = card.action === "tebWetkhayyar";
      const kinds = viaTeb ? allowed : allowed.filter((k) => k === card.action);
      for (const kind of kinds) {
        const base = viaTeb ? { type: "respond", seat, cardId: card.id, as: kind } : { type: "respond", seat, cardId: card.id };
        if (kind === "edfaaliEjari") {
          for (const payerSeat of otherSeats(seat)) {
            if (payerSeat !== effect.actor && !state.immune.includes(payerSeat)) moves.push({ ...base, payerSeat });
          }
        } else if (kind === "hayyour" && CHOICE_ACTIONS.includes(effect.action) && !state.immune.includes(effect.actor)) {
          const actorHand = getPlayer(state, effect.actor).hand;
          const choices = effectOptions(state, effect.action, seat, effect.actor).map((option) => ({
            ...option.targetCardIds ? { targetCardIds: option.targetCardIds } : {},
            ...option.color ? { color: option.color } : {},
            ...option.pickedCardId ? { handIndex: actorHand.findIndex((c) => c.id === option.pickedCardId) } : {}
          }));
          if (choices.length === 0) moves.push(base);
          for (const bounce of choices) moves.push({ ...base, bounce });
        } else {
          moves.push(base);
        }
      }
    }
  }
  return moves;
}
function seatsToAct(state) {
  return [...new Set(legalMoves(state).map((move) => move.seat))];
}
function legalMoves(state) {
  if (state.winner !== null) return [];
  if (state.response !== null) return responseMoves(state, state.response);
  if (state.pending !== null) {
    const seen = /* @__PURE__ */ new Set();
    const moves2 = [];
    for (const debt of state.pending.debts) {
      if (seen.has(debt.from)) continue;
      seen.add(debt.from);
      moves2.push({ type: "pay", seat: debt.from, cardIds: suggestPayment(getPlayer(state, debt.from), debt.amount) });
    }
    return moves2;
  }
  const seat = state.turn.seat;
  if (!state.turn.hasDrawn) return [{ type: "draw", seat }];
  const player = getPlayer(state, seat);
  const moves = [];
  if (checkCanPlay(state) === null) {
    const complete = completeColors(player.properties);
    const double = player.hand.find((c) => c.kind === "action" && c.action === "doubleRent");
    for (const card of player.hand) {
      if (card.kind === "property") {
        moves.push({ type: "playProperty", seat, cardId: card.id });
      } else if (card.kind === "money") {
        moves.push({ type: "bankMoney", seat, cardId: card.id });
      } else if (card.kind === "joker") {
        for (const color of COLORS) {
          moves.push({ type: "playJoker", seat, cardId: card.id, color: color.id });
        }
      } else if (card.kind === "building") {
        moves.push({ type: "playBuilding", seat, cardId: card.id });
        for (const color of complete) {
          moves.push({ type: "playBuilding", seat, cardId: card.id, color });
        }
      } else if (card.kind === "rent") {
        moves.push({ type: "burnAction", seat, cardId: card.id });
        const def = RENTS.find((d) => d.id === card.rent);
        if (!def) continue;
        const colors = def.colors === "any" ? COLORS.map((c) => c.id) : def.colors;
        const targets = def.payer === "one" ? otherSeats(seat).filter((s) => !state.immune.includes(s)) : [void 0];
        for (const color of colors) {
          if (rentFor(player, color) <= 0) continue;
          for (const targetSeat of targets) {
            const base = { type: "playRent", seat, cardId: card.id, color };
            const withTarget = targetSeat === void 0 ? base : { ...base, targetSeat };
            moves.push(withTarget);
            if (double) moves.push({ ...withTarget, doubleCardId: double.id });
          }
        }
      } else if (card.kind === "action") {
        if (card.action === "tebWetkhayyar") {
          for (const def of ACTIONS) {
            if (def.id !== "tebWetkhayyar") moves.push(...actionMoves(state, player, card.id, def.id, true));
          }
        } else {
          moves.push(...actionMoves(state, player, card.id, card.action, false));
        }
        moves.push({ type: "burnAction", seat, cardId: card.id });
      }
    }
    for (const placed of player.properties) {
      if (placed.card.kind !== "joker") continue;
      for (const color of COLORS) {
        if (color.id !== placed.color) {
          moves.push({ type: "moveJoker", seat, cardId: placed.card.id, color: color.id });
        }
      }
    }
    for (const building of player.buildings) {
      for (const color of complete) {
        if (color !== building.color) {
          moves.push({ type: "placeBuilding", seat, cardId: building.card.id, color });
        }
      }
    }
  }
  moves.push({ type: "endTurn", seat });
  return moves;
}

// src/bot/bot.ts
function getPlayer2(state, seat) {
  const player = state.players[seat];
  if (!player) {
    throw new Error(`مقعد غير موجود: ${seat}`);
  }
  return player;
}
function setsOf(state, seat) {
  return completeColors(getPlayer2(state, seat).properties).length;
}
function isBigAttack(state, effect) {
  switch (effect.action) {
    case "rahatAlek":
    case "endebes":
    case "ezalah":
    case "boogDouble":
      return true;
    case "etHas":
      return getPlayer2(state, effect.target).hand.length >= 5;
    default:
      return effect.amount >= 5;
  }
}
function scoreAction(state, seat, move, action) {
  const me = getPlayer2(state, seat);
  const target = move.targetSeat === void 0 ? void 0 : getPlayer2(state, move.targetSeat);
  const leaderBonus = target ? setsOf(state, target.seat) * 0.5 : 0;
  switch (action) {
    case "rahatAlek":
      return 95 + leaderBonus;
    case "extraPlay":
      return 86;
    case "draw2":
      return 85;
    case "boogDouble":
      return 78 + leaderBonus;
    case "ezalah":
      return 75 + leaderBonus;
    case "boog": {
      const stolen = target?.properties.find((p) => p.card.id === move.targetCardIds?.[0]);
      const helpsMe = stolen ? me.properties.some((p) => p.color === stolen.color) : false;
      return 72 + (helpsMe ? 3 : 0) + leaderBonus;
    }
    case "boogJoker": {
      const color = move.color;
      if (!color) return -1;
      const hasReal = me.properties.some((p) => p.color === color && p.card.kind === "property");
      return hasReal && !isSetComplete(me.properties, color) ? 65 : -1;
    }
    case "qardIskan":
    case "qarqash":
    case "tathmeen": {
      if (!target || totalPayable(target) <= 0) return -1;
      const base = action === "qardIskan" ? 57 : action === "qarqash" ? 55 : 58;
      return base + Math.min(totalPayable(target), 10) / 10 + leaderBonus;
    }
    case "eyadi":
      return 54;
    case "hasanah":
      return setsOf(state, seat) >= 2 ? 45 : 15;
    case "etHas":
      return target && me.hand.length <= 2 && target.hand.length >= 5 ? 40 : -1;
    case "werathtek":
      return 35 + leaderBonus;
    case "mukhalafah":
      return 33;
    case "estareeh":
      return target && setsOf(state, target.seat) >= 2 ? 30 : 10;
    case "baddel": {
      const theirs = target?.properties.find((p) => p.card.id === move.targetCardIds?.[0]);
      if (!theirs) return -1;
      const after = [...me.properties.filter((p) => p.card.id !== move.ownCardId), theirs];
      return completeColors(after).length > completeColors(me.properties).length ? 60 : -1;
    }
    default:
      return -1;
  }
}
var DEFENSE_ACTIONS = [
  "malekAmal",
  "hayyour",
  "fazaah",
  "maTshoofShar",
  "edfaaliEjari",
  "tebWetkhayyar",
  "hasanah"
];
var TEB_TURN_ACTIONS = ["rahatAlek", "ezalah", "boogDouble"];
function scoreTurnMove(state, seat, move) {
  const me = getPlayer2(state, seat);
  switch (move.type) {
    case "draw":
      return 1e3;
    case "playProperty":
      return 100;
    case "playJoker": {
      const hasReal = me.properties.some((p) => p.color === move.color && p.card.kind === "property");
      return hasReal && !isSetComplete(me.properties, move.color) ? 90 : -1;
    }
    case "moveJoker": {
      const moved = me.properties.map((p) => p.card.id === move.cardId ? { card: p.card, color: move.color } : p);
      return completeColors(moved).length > completeColors(me.properties).length ? 85 : -1;
    }
    case "playBuilding":
      return move.color !== void 0 ? 80 : 3;
    case "placeBuilding": {
      const placed = me.buildings.find((b) => b.card.id === move.cardId);
      return placed && placed.color === null ? 70 : -1;
    }
    case "bankMoney": {
      const card = me.hand.find((c) => c.id === move.cardId);
      return 60 + (card ? cardValue(card) / 100 : 0);
    }
    case "playRent": {
      const rent = rentFor(me, move.color);
      if (move.doubleCardId !== void 0 && rent < 3) return -1;
      const amount = move.doubleCardId !== void 0 ? rent * 2 : rent;
      const target = move.targetSeat === void 0 ? void 0 : getPlayer2(state, move.targetSeat);
      if (target && totalPayable(target) <= 0) return -1;
      return 50 + amount + (target ? Math.min(totalPayable(target), 10) / 100 : 0.5);
    }
    case "playAction": {
      const card = me.hand.find((c) => c.id === move.cardId);
      if (!card || card.kind !== "action") return -1;
      const action = card.action === "tebWetkhayyar" ? move.asAction : card.action;
      if (!action) return -1;
      if (card.action === "tebWetkhayyar") {
        return TEB_TURN_ACTIONS.includes(action) ? scoreAction(state, seat, move, action) - 0.25 : -1;
      }
      return scoreAction(state, seat, move, action);
    }
    case "burnAction":
      return -5;
    case "endTurn":
      return 0;
    default:
      return -1;
  }
}
function scoreResponse(state, seat, move) {
  const window = state.response;
  if (!window || move.cardId === void 0) return 0;
  const { effect } = window;
  if (!isBigAttack(state, effect)) return -1;
  const card = getPlayer2(state, seat).hand.find((c) => c.id === move.cardId);
  if (!card || card.kind !== "action") return -1;
  const viaTeb = card.action === "tebWetkhayyar";
  const kind = viaTeb ? move.as : card.action;
  const tebPenalty = viaTeb ? 2 : 0;
  if (window.awaiting === "actor") return 40 - tebPenalty;
  switch (kind) {
    case "maTshoofShar":
      return 50 - tebPenalty;
    case "edfaaliEjari": {
      const payer = move.payerSeat === void 0 ? void 0 : getPlayer2(state, move.payerSeat);
      return 48 + (payer ? Math.min(totalPayable(payer), 10) / 100 : 0) - tebPenalty;
    }
    case "hayyour":
      return 46 + (move.bounce ? 1 : 0) - tebPenalty;
    case "malekAmal":
      return 44 - tebPenalty;
    case "fazaah": {
      const actorNearWin = setsOf(state, effect.actor) >= state.winTarget - 2;
      return actorNearWin && (effect.action === "rahatAlek" || effect.action === "endebes") ? 40 - tebPenalty : -1;
    }
    default:
      return -1;
  }
}
function scoreMove(state, seat, move) {
  if (move.type === "respond") return scoreResponse(state, seat, move);
  if (move.type === "pay") return 1;
  return scoreTurnMove(state, seat, move);
}
function deadCardIds(state, seat) {
  const fresh = { ...state, turn: { ...state.turn, playsUsed: 0 } };
  const live = /* @__PURE__ */ new Set();
  for (const move of legalMoves(fresh)) {
    if (move.seat !== seat || !("cardId" in move) || move.cardId === void 0) continue;
    if (move.type === "burnAction") continue;
    if (scoreTurnMove(fresh, seat, move) > 0) {
      live.add(move.cardId);
      if (move.type === "playRent" && move.doubleCardId !== void 0) live.add(move.doubleCardId);
    }
  }
  const dead = /* @__PURE__ */ new Set();
  for (const card of getPlayer2(state, seat).hand) {
    if (live.has(card.id)) continue;
    if (card.kind === "action" && DEFENSE_ACTIONS.includes(card.action)) continue;
    dead.add(card.id);
  }
  return dead;
}
function adjustForDeadCards(state, seat, move, score, dead) {
  const me = getPlayer2(state, seat);
  if (move.type === "burnAction" && dead.has(move.cardId) && me.hand.length >= 5) return 1;
  return score;
}
function chooseMove(state, seat, rng) {
  const moves = legalMoves(state).filter((move) => move.seat === seat);
  if (moves.length === 0) return null;
  const isTurnPlay = state.response === null && state.pending === null && state.turn.hasDrawn;
  const dead = isTurnPlay ? deadCardIds(state, seat) : /* @__PURE__ */ new Set();
  let best = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const move of moves) {
    const score = adjustForDeadCards(state, seat, move, scoreMove(state, seat, move), dead);
    if (score > bestScore) {
      best = [move];
      bestScore = score;
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[randomInt(rng, best.length)] ?? null;
}

// src/engine/state.ts
function createGame(seed, winTarget) {
  const rng = createRng(seed);
  const pile = shuffle(buildDeck(), rng);
  const players = [];
  for (let seat = 0; seat < PLAYER_COUNT; seat++) {
    const hand = pile.splice(pile.length - STARTING_HAND_SIZE, STARTING_HAND_SIZE);
    players.push({ seat, hand, bank: [], properties: [], buildings: [] });
  }
  const startSeat = randomInt(rng, PLAYER_COUNT);
  return {
    drawPile: pile,
    firePile: [],
    players,
    turn: { seat: startSeat, hasDrawn: false, playsUsed: 0 },
    response: null,
    queue: [],
    pending: null,
    pendingQueue: [],
    extraPlays: 0,
    revealed: null,
    skips: [],
    immune: [],
    winTarget,
    winner: null,
    seed: nextSeed(rng)
  };
}

// src/engine/timeout.ts
function forceEndTurn(state, seat) {
  if (state.winner !== null || state.turn.seat !== seat) return state;
  if (state.response !== null || state.pending !== null) return state;
  let next = state;
  if (!next.turn.hasDrawn) {
    const drawn = applyMove(next, { type: "draw", seat });
    if (!drawn.ok) return state;
    next = drawn.state;
  }
  const ended = applyMove(next, { type: "endTurn", seat });
  return ended.ok ? ended.state : state;
}

// src/net/mask.ts
function hiddenCard(index) {
  return { id: `hidden:${index}`, kind: "joker" };
}
function hiddenCards(count) {
  return Array.from({ length: count }, (_, index) => hiddenCard(index));
}
function maskEffect(effect, viewerSeat) {
  if (effect.params.pickedCardId === void 0 || effect.target === viewerSeat) return effect;
  const { pickedCardId: _hidden, ...params } = effect.params;
  return { ...effect, params };
}
function maskStateFor(state, viewerSeat) {
  const revealedTarget = state.revealed?.viewer === viewerSeat ? state.revealed.target : null;
  return {
    ...state,
    seed: 0,
    drawPile: hiddenCards(state.drawPile.length),
    players: state.players.map(
      (player) => player.seat === viewerSeat || player.seat === revealedTarget ? player : { ...player, hand: hiddenCards(player.hand.length) }
    ),
    // اليد المكشوفة بـ"اكشف" تخص اللاعب اللي كشفها فقط.
    revealed: state.revealed?.viewer === viewerSeat ? state.revealed : null,
    queue: state.queue.map((effect) => maskEffect(effect, viewerSeat)),
    response: state.response ? {
      ...state.response,
      effect: maskEffect(state.response.effect, viewerSeat),
      standing: state.response.standing ? {
        ...state.response.standing,
        bounce: state.response.standing.bounce ? maskEffect(state.response.standing.bounce, viewerSeat) : null
      } : null
    } : null
  };
}

// src/net/room.ts
var BOT_DELAY_MS = 700;
function fail2(error) {
  return { ok: false, error };
}
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var CODE_LENGTH = 5;
function generateRoomCode(rng) {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(rng, CODE_ALPHABET.length)];
  }
  return code;
}
function seatOf(room, playerId) {
  return room.seats.findIndex((seat) => seat.playerId === playerId);
}
function createRoom(code, hostId, name) {
  if (name.trim().length === 0) return fail2("nameRequired");
  return {
    ok: true,
    room: {
      code,
      hostId,
      winTarget: WIN_TARGETS[0],
      status: "lobby",
      seats: [{ playerId: hostId, name: name.trim(), isBot: false, connected: true }],
      game: null,
      lastMove: null,
      lastAttack: null,
      lastMoveAt: 0,
      turnDeadline: 0,
      botSeed: 0
    }
  };
}
function joinRoom(room, playerId, name) {
  if (name.trim().length === 0) return fail2("nameRequired");
  if (seatOf(room, playerId) >= 0) return fail2("alreadyJoined");
  if (room.status !== "lobby") return fail2("alreadyStarted");
  if (room.seats.length >= PLAYER_COUNT) return fail2("roomFull");
  return {
    ok: true,
    room: { ...room, seats: [...room.seats, { playerId, name: name.trim(), isBot: false, connected: true }] }
  };
}
function createMatchRoom(code, playerId, name, winTarget, seed, now) {
  const target = WIN_TARGETS.find((allowed) => allowed === winTarget);
  if (target === void 0) return fail2("invalidWinTarget");
  const created = createRoom(code, playerId, name);
  if (!created.ok) return created;
  return { ok: true, room: { ...created.room, winTarget: target, match: { openedAt: now, seed } } };
}
function joinMatchRoom(room, playerId, name, now) {
  if (!room.match) return fail2("notInRoom");
  const joined = joinRoom(room, playerId, name);
  if (!joined.ok) return joined;
  return joined.room.seats.length >= PLAYER_COUNT ? begin(joined.room, room.match.seed, now) : joined;
}
function isOpenMatch(room, now) {
  if (!room.match || room.status !== "lobby") return false;
  if (room.seats.length === 0 || room.seats.length >= PLAYER_COUNT) return false;
  return now < room.match.openedAt + MATCH_WAIT_SECONDS * 1e3;
}
function isActiveFor(room, playerId) {
  return room.status !== "finished" && seatOf(room, playerId) >= 0;
}
function setWinTarget(room, playerId, winTarget) {
  if (room.match) return fail2("fixedWinTarget");
  if (playerId !== room.hostId) return fail2("notHost");
  if (room.status !== "lobby") return fail2("alreadyStarted");
  const target = WIN_TARGETS.find((allowed) => allowed === winTarget);
  if (target === void 0) return fail2("invalidWinTarget");
  return { ok: true, room: { ...room, winTarget: target } };
}
function startRoom(room, playerId, seed, now) {
  if (room.match || playerId !== room.hostId) return fail2("notHost");
  return begin(room, seed, now);
}
function begin(room, seed, now) {
  if (room.status !== "lobby") return fail2("alreadyStarted");
  const seats = [...room.seats];
  while (seats.length < PLAYER_COUNT) {
    seats.push({ playerId: null, name: "", isBot: true, connected: true });
  }
  const rng = createRng(seed);
  const game = createGame(seed, room.winTarget);
  return {
    ok: true,
    room: {
      ...room,
      status: "playing",
      seats,
      game,
      lastMove: null,
      lastAttack: null,
      lastMoveAt: now,
      turnDeadline: now + TURN_SECONDS * 1e3,
      botSeed: nextSeed(rng)
    }
  };
}
function applyToRoom(room, game, move, now) {
  const result = applyMove(game, move);
  if (!result.ok) return fail2(result.error);
  const next = result.state;
  const turnChanged = next.turn.seat !== game.turn.seat || move.type === "endTurn" && next.turn.seat === game.turn.seat;
  return {
    ok: true,
    room: {
      ...room,
      game: next,
      status: next.winner !== null ? "finished" : "playing",
      lastMove: move,
      lastAttack: move.type === "playAction" || move.type === "playRent" ? move : move.type === "endTurn" ? null : room.lastAttack,
      lastMoveAt: now,
      turnDeadline: turnChanged ? now + TURN_SECONDS * 1e3 : room.turnDeadline
    }
  };
}
function submitMove(room, playerId, move, now) {
  if (room.status !== "playing" || !room.game) return fail2(room.status === "lobby" ? "notStarted" : "gameOver");
  const seat = seatOf(room, playerId);
  if (seat < 0 || room.seats[seat]?.isBot) return fail2("notInRoom");
  return applyToRoom(room, room.game, { ...move, seat }, now);
}
function leaveRoom(room, playerId) {
  const seat = seatOf(room, playerId);
  if (seat < 0) return fail2("notInRoom");
  if (room.status === "lobby") {
    const seats = room.seats.filter((_, index) => index !== seat);
    const nextHost = seats[0]?.playerId ?? room.hostId;
    return { ok: true, room: { ...room, seats, hostId: playerId === room.hostId ? nextHost : room.hostId } };
  }
  return {
    ok: true,
    room: {
      ...room,
      seats: room.seats.map((s, index) => index === seat ? { ...s, playerId: null, isBot: true, connected: false } : s)
    }
  };
}
function tick(room, now) {
  if (room.status === "lobby" && room.match && room.seats.length > 0) {
    if (now < room.match.openedAt + MATCH_WAIT_SECONDS * 1e3) return room;
    const started = begin(room, room.match.seed, now);
    return started.ok ? started.room : room;
  }
  const game = room.game;
  if (room.status !== "playing" || !game) return room;
  const seats = seatsToAct(game);
  const rng = createRng(room.botSeed);
  const withSeed = (next) => ({ ...next, botSeed: nextSeed(rng) });
  if (now >= room.turnDeadline) {
    const seat = seats[0];
    if (seat === void 0) return room;
    let move2 = null;
    if (game.response !== null) {
      move2 = { type: "respond", seat };
    } else if (game.pending !== null) {
      const debt = game.pending.debts.find((d) => d.from === seat);
      const player = game.players[seat];
      move2 = debt && player ? { type: "pay", seat, cardIds: suggestPayment(player, debt.amount) } : null;
    } else {
      const ended = forceEndTurn(game, game.turn.seat);
      if (ended === game) return room;
      return withSeed({
        ...room,
        game: ended,
        lastAttack: null,
        lastMove: { type: "endTurn", seat: game.turn.seat },
        lastMoveAt: now,
        turnDeadline: now + TURN_SECONDS * 1e3
      });
    }
    if (!move2) return room;
    const result2 = applyToRoom(room, game, move2, now);
    return result2.ok ? withSeed(result2.room) : room;
  }
  const botSeat = seats.find((seat) => room.seats[seat]?.isBot);
  if (botSeat === void 0 || now - room.lastMoveAt < BOT_DELAY_MS) return room;
  const move = chooseMove(game, botSeat, rng);
  if (!move) return room;
  const result = applyToRoom(room, game, move, now);
  return result.ok ? withSeed(result.room) : room;
}
function snapshotFor(room, playerId) {
  const mySeat = seatOf(room, playerId);
  if (mySeat < 0) return null;
  const game = room.game;
  return {
    code: room.code,
    status: room.status,
    winTarget: room.winTarget,
    mySeat,
    isHost: playerId === room.hostId,
    seats: room.seats.map((seat) => ({ name: seat.name, isBot: seat.isBot, connected: seat.connected })),
    state: game ? maskStateFor(game, mySeat) : null,
    moves: game ? legalMoves(game).filter((move) => move.seat === mySeat) : [],
    lastMove: room.lastMove,
    lastAttack: room.lastAttack ?? null,
    turnDeadline: room.turnDeadline,
    matchmaking: Boolean(room.match),
    matchDeadline: room.match ? room.match.openedAt + MATCH_WAIT_SECONDS * 1e3 : 0
  };
}
export {
  createMatchRoom,
  createRng,
  createRoom,
  generateRoomCode,
  isActiveFor,
  isOpenMatch,
  joinMatchRoom,
  joinRoom,
  leaveRoom,
  setWinTarget,
  snapshotFor,
  startRoom,
  submitMove,
  tick
};
