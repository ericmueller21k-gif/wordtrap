var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// packages/server/src/codes.ts
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var JOIN_CODE_LENGTH = 6;
var REJOIN_SECRET_LENGTH = 6;
var cryptoBytes = /* @__PURE__ */ __name((n) => crypto.getRandomValues(new Uint8Array(n)), "cryptoBytes");
function randomCode(length, bytes = cryptoBytes) {
  const limit = 256 - 256 % CODE_ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const b of bytes(length * 2)) {
      if (b < limit && out.length < length) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return out;
}
__name(randomCode, "randomCode");
function randomToken(bytes = cryptoBytes) {
  return [...bytes(24)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomToken, "randomToken");
function normalizeCode(input) {
  return input.toUpperCase().replace(/[\s-]/g, "");
}
__name(normalizeCode, "normalizeCode");
function isJoinCode(code) {
  return code.length === JOIN_CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
__name(isJoinCode, "isJoinCode");
function formatRejoinCode(joinCode, secret) {
  return `${joinCode}-${secret}`;
}
__name(formatRejoinCode, "formatRejoinCode");
function parseRejoinCode(input) {
  const c = normalizeCode(input);
  if (c.length !== JOIN_CODE_LENGTH + REJOIN_SECRET_LENGTH) return null;
  const code = c.slice(0, JOIN_CODE_LENGTH);
  const secret = c.slice(JOIN_CODE_LENGTH);
  if (!isJoinCode(code) || ![...secret].every((ch) => CODE_ALPHABET.includes(ch))) return null;
  return { code, secret };
}
__name(parseRejoinCode, "parseRejoinCode");

// packages/engine/src/settings.ts
var DEFAULT_SETTINGS = {
  roundsPerMatch: 5,
  rackSize: 7,
  minWordLength: 3,
  // spec.md starts at 3; the balance report (reports/balance.md) showed 3 lets the
  // guesser catch ~94% of words, so v1 playtests with 2. See DECISIONS.md.
  guessesPerWord: 2,
  lengthBonus: { 5: 1, 6: 5, 7: 10 },
  catchRewardFraction: 0.5,
  letterSquare: { multipliers: [2, 3], weights: [1, 1], minSlot: 1, maxSlot: 7 },
  wordSquare: { multipliers: [2, 3], weights: [1, 1], minSlot: 4, maxSlot: 7 },
  rackFilter: { minCommonWords: 25, minLongWords: 3, longWordLength: 5, maxRedraws: 1e4 },
  dictionary: { commonCutoff: 1e4, inflectionMinCount: 20 },
  letterValues: {
    A: 1,
    E: 1,
    I: 1,
    L: 1,
    N: 1,
    O: 1,
    R: 1,
    S: 1,
    T: 1,
    U: 1,
    D: 2,
    G: 2,
    B: 3,
    C: 3,
    M: 3,
    P: 3,
    F: 4,
    H: 4,
    V: 4,
    W: 4,
    Y: 4,
    K: 5,
    J: 8,
    X: 8,
    Q: 10,
    Z: 10
  },
  bag: {
    A: 9,
    B: 2,
    C: 2,
    D: 4,
    E: 12,
    F: 2,
    G: 3,
    H: 2,
    I: 9,
    J: 1,
    K: 1,
    L: 4,
    M: 2,
    N: 6,
    O: 8,
    P: 2,
    Q: 1,
    R: 6,
    S: 4,
    T: 6,
    U: 4,
    V: 2,
    W: 2,
    X: 1,
    Y: 2,
    Z: 1
  }
};

// packages/engine/src/rng.ts
function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
__name(randomInt, "randomInt");
function weightedPick(rng, items, weights) {
  if (items.length === 0 || items.length !== weights.length) {
    throw new Error("weightedPick needs one weight per item");
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}
__name(weightedPick, "weightedPick");

// packages/engine/src/letters.ts
function isAlphabetic(word) {
  return /^[A-Z]+$/.test(word);
}
__name(isAlphabetic, "isAlphabetic");
function letterCounts(letters) {
  const counts = /* @__PURE__ */ new Map();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}
__name(letterCounts, "letterCounts");
function canMakeFromRack(word, rack) {
  const available = letterCounts(rack);
  for (const ch of word) {
    const left = available.get(ch) ?? 0;
    if (left === 0) return false;
    available.set(ch, left - 1);
  }
  return true;
}
__name(canMakeFromRack, "canMakeFromRack");

// packages/engine/src/scoring.ts
function letterValue(letter, settings = DEFAULT_SETTINGS) {
  const value = settings.letterValues[letter];
  if (value === void 0) throw new Error(`No letter value for "${letter}"`);
  return value;
}
__name(letterValue, "letterValue");
function tileScore(word, board, settings = DEFAULT_SETTINGS) {
  let sum = 0;
  for (let i = 0; i < word.length; i++) {
    const slot = i + 1;
    const value = letterValue(word[i], settings);
    sum += slot === board.letterSquare.slot ? value * board.letterSquare.multiplier : value;
  }
  if (word.length >= board.wordSquare.slot) sum *= board.wordSquare.multiplier;
  return sum;
}
__name(tileScore, "tileScore");
function lengthBonus(length, settings = DEFAULT_SETTINGS) {
  return settings.lengthBonus[length] ?? 0;
}
__name(lengthBonus, "lengthBonus");
function catchReward(score, settings = DEFAULT_SETTINGS) {
  return Math.ceil(score * settings.catchRewardFraction);
}
__name(catchReward, "catchReward");
function clueFor(word, board, settings = DEFAULT_SETTINGS) {
  return { length: word.length, tileScore: tileScore(word, board, settings) };
}
__name(clueFor, "clueFor");
function scoreWord(word, board, caught, settings = DEFAULT_SETTINGS) {
  const score = tileScore(word, board, settings);
  return caught ? { owner: 0, guesser: catchReward(score, settings) } : { owner: score + lengthBonus(word.length, settings), guesser: 0 };
}
__name(scoreWord, "scoreWord");
function scoreRound(board, a, b, settings = DEFAULT_SETTINGS) {
  const aWord = scoreWord(a.word, board, a.caught, settings);
  const bWord = scoreWord(b.word, board, b.caught, settings);
  return [aWord.owner + bWord.guesser, bWord.owner + aWord.guesser];
}
__name(scoreRound, "scoreRound");

// packages/engine/src/feedback.ts
function guessFeedback(secret, guess) {
  if (secret.length !== guess.length) {
    throw new Error("Guess and secret must be the same length");
  }
  return Array.from(guess, (ch, i) => ch === secret[i]);
}
__name(guessFeedback, "guessFeedback");

// packages/engine/src/dictionary.ts
var A = "A".charCodeAt(0);
function countVector(word) {
  const v = new Uint8Array(26);
  for (let i = 0; i < word.length; i++) v[word.charCodeAt(i) - A]++;
  return v;
}
__name(countVector, "countVector");
var Dictionary = class {
  static {
    __name(this, "Dictionary");
  }
  real;
  common;
  commonEntries;
  constructor(realWords, commonWords) {
    const common = /* @__PURE__ */ new Set();
    for (const w of commonWords) common.add(w.toUpperCase());
    const real = new Set(common);
    for (const w of realWords) real.add(w.toUpperCase());
    this.real = real;
    this.common = common;
    this.commonEntries = [...common].sort().map((word) => ({ word, counts: countVector(word) }));
  }
  isCommon(word) {
    return this.common.has(word);
  }
  isReal(word) {
    return this.real.has(word);
  }
  get commonSize() {
    return this.common.size;
  }
  get realSize() {
    return this.real.size;
  }
  /** Every common word that can be made from the rack, alphabetical. */
  playableWords(rack) {
    const available = countVector(rack.join(""));
    const out = [];
    outer: for (const { word, counts } of this.commonEntries) {
      if (word.length > rack.length) continue;
      for (let i = 0; i < 26; i++) {
        if (counts[i] > available[i]) continue outer;
      }
      out.push(word);
    }
    return out;
  }
};

// packages/engine/src/validation.ts
function problemMessage(problem, settings = DEFAULT_SETTINGS) {
  switch (problem) {
    case "not_letters":
      return "Words can only use the letters A to Z.";
    case "too_short":
      return `Words need at least ${settings.minWordLength} letters.`;
    case "too_long":
      return `Words can be at most ${settings.rackSize} letters.`;
    case "wrong_length":
      return "Your guess must be the same length as their word.";
    case "repeated":
      return "You've already guessed that.";
    case "uncommon":
      return "That's a real word, but it's too uncommon for Word Trap.";
    case "not_a_word":
      return "That's not a word we know.";
    case "no_tiles":
      return "You don't have the tiles for that.";
  }
}
__name(problemMessage, "problemMessage");
function fail(problem, settings) {
  return { ok: false, problem, message: problemMessage(problem, settings) };
}
__name(fail, "fail");
function checkTilesAndDictionary(word, rack, dictionary2, settings) {
  if (!canMakeFromRack(word, rack)) return fail("no_tiles", settings);
  if (dictionary2.isCommon(word)) return { ok: true };
  return fail(dictionary2.isReal(word) ? "uncommon" : "not_a_word", settings);
}
__name(checkTilesAndDictionary, "checkTilesAndDictionary");
function validateSetWord(word, rack, dictionary2, settings = DEFAULT_SETTINGS) {
  if (!isAlphabetic(word)) return fail("not_letters", settings);
  if (word.length < settings.minWordLength) return fail("too_short", settings);
  if (word.length > settings.rackSize) return fail("too_long", settings);
  return checkTilesAndDictionary(word, rack, dictionary2, settings);
}
__name(validateSetWord, "validateSetWord");
function validateGuess(guess, context, dictionary2, settings = DEFAULT_SETTINGS) {
  if (!isAlphabetic(guess)) return fail("not_letters", settings);
  if (guess.length !== context.length) return fail("wrong_length", settings);
  if (context.previousGuesses.includes(guess)) return fail("repeated", settings);
  return checkTilesAndDictionary(guess, context.rack, dictionary2, settings);
}
__name(validateGuess, "validateGuess");

// packages/engine/src/generation.ts
function fullBag(settings = DEFAULT_SETTINGS) {
  const bag = [];
  for (const [letter, count] of Object.entries(settings.bag)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  return bag;
}
__name(fullBag, "fullBag");
function drawRack(rng, settings = DEFAULT_SETTINGS) {
  const bag = fullBag(settings);
  if (bag.length < settings.rackSize) throw new Error("Bag is smaller than the rack");
  const rack = [];
  for (let i = 0; i < settings.rackSize; i++) {
    const pick = randomInt(rng, 0, bag.length - 1);
    rack.push(bag[pick]);
    bag[pick] = bag[bag.length - 1];
    bag.pop();
  }
  return rack;
}
__name(drawRack, "drawRack");
function rackStats(rack, dictionary2, settings = DEFAULT_SETTINGS) {
  const words = dictionary2.playableWords(rack).filter((w) => w.length >= settings.minWordLength && w.length <= settings.rackSize);
  return {
    commonWords: words.length,
    longWords: words.filter((w) => w.length >= settings.rackFilter.longWordLength).length
  };
}
__name(rackStats, "rackStats");
function isRackPlayable(rack, dictionary2, settings = DEFAULT_SETTINGS) {
  const stats = rackStats(rack, dictionary2, settings);
  return stats.commonWords >= settings.rackFilter.minCommonWords && stats.longWords >= settings.rackFilter.minLongWords;
}
__name(isRackPlayable, "isRackPlayable");
function generateRack(rng, dictionary2, settings = DEFAULT_SETTINGS) {
  for (let attempt = 0; attempt < settings.rackFilter.maxRedraws; attempt++) {
    const rack = drawRack(rng, settings);
    if (isRackPlayable(rack, dictionary2, settings)) return rack;
  }
  throw new Error(`No playable rack after ${settings.rackFilter.maxRedraws} draws; check the rack filter settings`);
}
__name(generateRack, "generateRack");
function drawSquare(rng, square, excludeSlot) {
  const slots = [];
  for (let s = square.minSlot; s <= square.maxSlot; s++) if (s !== excludeSlot) slots.push(s);
  if (slots.length === 0) throw new Error("No slot available for square");
  return {
    slot: slots[randomInt(rng, 0, slots.length - 1)],
    multiplier: weightedPick(rng, square.multipliers, square.weights)
  };
}
__name(drawSquare, "drawSquare");
function generateBoard(rng, settings = DEFAULT_SETTINGS) {
  const letterSquare = drawSquare(rng, settings.letterSquare);
  const wordSquare = drawSquare(rng, settings.wordSquare, letterSquare.slot);
  return { letterSquare, wordSquare };
}
__name(generateBoard, "generateBoard");
function generateRound(rng, dictionary2, settings = DEFAULT_SETTINGS) {
  return { rack: generateRack(rng, dictionary2, settings), board: generateBoard(rng, settings) };
}
__name(generateRound, "generateRound");
function generateMatchRounds(rng, dictionary2, settings = DEFAULT_SETTINGS) {
  return Array.from({ length: settings.roundsPerMatch }, () => generateRound(rng, dictionary2, settings));
}
__name(generateMatchRounds, "generateMatchRounds");

// packages/engine/src/match.ts
var other = /* @__PURE__ */ __name((seat) => seat === 0 ? 1 : 0, "other");
var emptySeatRound = /* @__PURE__ */ __name(() => ({ word: null, guesses: [], doneGuessing: false }), "emptySeatRound");
function createMatch(rounds, creatorName, secondName = null) {
  return {
    rounds,
    names: [creatorName, secondName],
    progress: rounds.map(() => [emptySeatRound(), emptySeatRound()]),
    summariesSeen: [0, 0]
  };
}
__name(createMatch, "createMatch");
function joinMatch(state, name) {
  if (state.names[1] !== null) throw new Error("Match is full");
  return { ...state, names: [state.names[0], name] };
}
__name(joinMatch, "joinMatch");
function stageFor(state, seat) {
  for (let r = 0; r < state.rounds.length; r++) {
    const me = state.progress[r][seat];
    const them = state.progress[r][other(seat)];
    if (me.word === null) return { kind: "set", round: r };
    if (!me.doneGuessing) {
      return them.word === null ? { kind: "waitingForWord", round: r } : { kind: "guess", round: r };
    }
  }
  for (let r = 0; r < state.rounds.length; r++) {
    if (!state.progress[r][other(seat)].doneGuessing) return { kind: "waitingForGuesses", round: r };
  }
  return { kind: "finished" };
}
__name(stageFor, "stageFor");
function isRoundComplete(state, round) {
  const p = state.progress[round];
  return !!p && p[0].doneGuessing && p[1].doneGuessing;
}
__name(isRoundComplete, "isRoundComplete");
function roundResult(state, round, settings = DEFAULT_SETTINGS) {
  if (!isRoundComplete(state, round)) return null;
  const [a, b] = state.progress[round];
  const caught = [b.guesses.includes(a.word), a.guesses.includes(b.word)];
  const scores = scoreRound(
    state.rounds[round].board,
    { word: a.word, caught: caught[0] },
    { word: b.word, caught: caught[1] },
    settings
  );
  return { scores, caught };
}
__name(roundResult, "roundResult");
function matchTotals(state, settings = DEFAULT_SETTINGS) {
  const totals = [0, 0];
  state.rounds.forEach((_, r) => {
    const result = roundResult(state, r, settings);
    if (result) {
      totals[0] += result.scores[0];
      totals[1] += result.scores[1];
    }
  });
  return totals;
}
__name(matchTotals, "matchTotals");
function notYourTurn() {
  return { ok: false, problem: "not_your_turn", message: "It's not your turn to do that." };
}
__name(notYourTurn, "notYourTurn");
function withSeatRound(state, round, seat, update) {
  const progress = state.progress.map((p, r) => {
    if (r !== round) return p;
    const next = [p[0], p[1]];
    next[seat] = update;
    return next;
  });
  return { ...state, progress };
}
__name(withSeatRound, "withSeatRound");
function setWord(state, seat, round, word, dictionary2, settings = DEFAULT_SETTINGS) {
  const stage = stageFor(state, seat);
  if (stage.kind !== "set" || stage.round !== round) return notYourTurn();
  const check = validateSetWord(word, state.rounds[round].rack, dictionary2, settings);
  if (!check.ok) return check;
  return { ok: true, state: withSeatRound(state, round, seat, { ...state.progress[round][seat], word }) };
}
__name(setWord, "setWord");
function submitGuess(state, seat, round, guess, dictionary2, settings = DEFAULT_SETTINGS) {
  const stage = stageFor(state, seat);
  if (stage.kind !== "guess" || stage.round !== round) return notYourTurn();
  const me = state.progress[round][seat];
  const secret = state.progress[round][other(seat)].word;
  const check = validateGuess(
    guess,
    { rack: state.rounds[round].rack, length: secret.length, previousGuesses: me.guesses },
    dictionary2,
    settings
  );
  if (!check.ok) return check;
  const guesses = [...me.guesses, guess];
  const caught = guess === secret;
  const doneGuessing = caught || guesses.length >= settings.guessesPerWord;
  return {
    ok: true,
    state: withSeatRound(state, round, seat, { ...me, guesses, doneGuessing }),
    marks: guessFeedback(secret, guess),
    caught,
    doneGuessing
  };
}
__name(submitGuess, "submitGuess");
function markSummarySeen(state, seat, round) {
  if (!isRoundComplete(state, round) || state.summariesSeen[seat] > round) return state;
  const summariesSeen = [...state.summariesSeen];
  summariesSeen[seat] = round + 1;
  return { ...state, summariesSeen };
}
__name(markSummarySeen, "markSummarySeen");
function guessViews(guesses, secret) {
  return guesses.map((word) => ({ word, marks: secret ? guessFeedback(secret, word) : [] }));
}
__name(guessViews, "guessViews");
function viewFor(state, seat, settings = DEFAULT_SETTINGS) {
  const stage = stageFor(state, seat);
  const opp = other(seat);
  const reached = stage.kind === "finished" ? state.rounds.length : stage.round + 1;
  const rounds = [];
  for (let r = 0; r < reached; r++) {
    const me = state.progress[r][seat];
    const them = state.progress[r][opp];
    const both = me.word !== null && them.word !== null;
    const result = roundResult(state, r, settings);
    const flip = /* @__PURE__ */ __name((x) => seat === 0 ? x : { scores: [x.scores[1], x.scores[0]], caught: [x.caught[1], x.caught[0]] }, "flip");
    rounds.push({
      index: r,
      rack: state.rounds[r].rack,
      board: state.rounds[r].board,
      myWord: me.word,
      opponentSubmitted: them.word !== null,
      clue: both ? clueFor(them.word, state.rounds[r].board, settings) : null,
      myGuesses: guessViews(me.guesses, both ? them.word : null),
      myDoneGuessing: me.doneGuessing,
      opponentDoneGuessing: them.doneGuessing,
      opponentWord: me.doneGuessing ? them.word : null,
      opponentGuesses: result ? guessViews(them.guesses, me.word) : null,
      result: result ? flip(result) : null
    });
  }
  const totals = matchTotals(state, settings);
  return {
    seat,
    myName: state.names[seat] ?? "",
    opponentName: state.names[opp],
    stage,
    opponentStage: stageFor(state, opp).kind,
    roundsTotal: state.rounds.length,
    guessesPerWord: settings.guessesPerWord,
    totals: seat === 0 ? totals : [totals[1], totals[0]],
    summariesSeen: state.summariesSeen[seat],
    rounds
  };
}
__name(viewFor, "viewFor");

// packages/server/src/room.ts
var fail2 = /* @__PURE__ */ __name((status, message) => ({ ok: false, status, message }), "fail");
var NAME_MAX = 16;
function cleanName(input) {
  if (typeof input !== "string") return null;
  const name = input.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return name.length ? name : null;
}
__name(cleanName, "cleanName");
function newSecret(bytes) {
  return randomCode(REJOIN_SECRET_LENGTH, bytes);
}
__name(newSecret, "newSecret");
function credentials(record, seat) {
  return {
    code: record.code,
    seat,
    token: record.tokens[seat],
    rejoinCode: formatRejoinCode(record.code, record.rejoinSecrets[seat])
  };
}
__name(credentials, "credentials");
function response(record, seat) {
  return {
    code: record.code,
    seat,
    rejoinCode: formatRejoinCode(record.code, record.rejoinSecrets[seat]),
    rematchCode: record.rematch?.code ?? null,
    view: viewFor(record.state, seat)
  };
}
__name(response, "response");
function newRecord(code, rounds, creatorName, now, bytes = cryptoBytes) {
  return {
    code,
    state: createMatch(rounds, creatorName),
    tokens: [randomToken(bytes), null],
    rejoinSecrets: [newSecret(bytes), null],
    createdAt: now,
    updatedAt: now,
    rematch: null
  };
}
__name(newRecord, "newRecord");
function rematchRecord(info, rounds, names, now) {
  return {
    code: info.code,
    state: createMatch(rounds, names[0], names[1]),
    tokens: [...info.tokens],
    rejoinSecrets: [...info.rejoinSecrets],
    createdAt: now,
    updatedAt: now,
    rematch: null
  };
}
__name(rematchRecord, "rematchRecord");
function join(record, name, bytes = cryptoBytes) {
  if (record.state.names[1] !== null) return fail2(409, "That game already has two players.");
  return {
    ok: true,
    record: {
      ...record,
      state: joinMatch(record.state, name),
      tokens: [record.tokens[0], randomToken(bytes)],
      rejoinSecrets: [record.rejoinSecrets[0], newSecret(bytes)]
    }
  };
}
__name(join, "join");
function seatForToken(record, token) {
  if (!token) return null;
  if (record.tokens[0] === token) return 0;
  if (record.tokens[1] === token) return 1;
  return null;
}
__name(seatForToken, "seatForToken");
function seatForRejoinSecret(record, secret) {
  if (record.rejoinSecrets[0] === secret) return 0;
  if (record.rejoinSecrets[1] === secret) return 1;
  return null;
}
__name(seatForRejoinSecret, "seatForRejoinSecret");
function applyWord(record, seat, round, word, dictionary2) {
  if (typeof round !== "number" || typeof word !== "string") return fail2(400, "Bad request.");
  const r = setWord(record.state, seat, round, word.toUpperCase(), dictionary2);
  if (!r.ok) return fail2(r.problem === "not_your_turn" ? 409 : 422, r.message);
  return { ok: true, record: { ...record, state: r.state } };
}
__name(applyWord, "applyWord");
function applyGuess(record, seat, round, guess, dictionary2) {
  if (typeof round !== "number" || typeof guess !== "string") return fail2(400, "Bad request.");
  const r = submitGuess(record.state, seat, round, guess.toUpperCase(), dictionary2);
  if (!r.ok) return fail2(r.problem === "not_your_turn" ? 409 : 422, r.message);
  return { ok: true, record: { ...record, state: r.state }, marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
}
__name(applyGuess, "applyGuess");
function applySummarySeen(record, seat, round) {
  if (typeof round !== "number") return fail2(400, "Bad request.");
  return { ok: true, record: { ...record, state: markSummarySeen(record.state, seat, round) } };
}
__name(applySummarySeen, "applySummarySeen");
function planRematch(newCode, bytes = cryptoBytes) {
  return {
    code: newCode,
    tokens: [randomToken(bytes), randomToken(bytes)],
    rejoinSecrets: [newSecret(bytes), newSecret(bytes)]
  };
}
__name(planRematch, "planRematch");

// packages/server/src/match-room.ts
import { DurableObject } from "cloudflare:workers";

// packages/server/src/dictionary.ts
import commonText from "./9302e25f2ddeef66026e70e72e8594769bc00629-common.txt";
import realText from "./d495e0dfda4fc04061c33a2a34d0bb75a63d20d5-real.txt";
var parse = /* @__PURE__ */ __name((text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")), "parse");
var dictionary = null;
function getDictionary() {
  dictionary ??= new Dictionary(parse(realText), parse(commonText));
  return dictionary;
}
__name(getDictionary, "getDictionary");

// packages/server/src/match-room.ts
var notFound = { ok: false, status: 404, message: "We couldn't find that game. Check the code." };
var forbidden = { ok: false, status: 403, message: "This device isn't part of that game." };
var MatchRoom = class extends DurableObject {
  static {
    __name(this, "MatchRoom");
  }
  record = null;
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.record = await ctx.storage.get("match") ?? null;
    });
  }
  async save(record) {
    record.updatedAt = Date.now();
    this.record = record;
    await this.ctx.storage.put("match", record);
  }
  withSeat(token) {
    if (!this.record) return notFound;
    const seat = seatForToken(this.record, token);
    return seat === null ? forbidden : { record: this.record, seat };
  }
  withCreds(record, seat) {
    return { ok: true, credentials: credentials(record, seat), match: response(record, seat) };
  }
  async create(code, creatorName) {
    if (this.record) return { ok: false, status: 409, exists: true, message: "Code in use." };
    const rounds = generateMatchRounds(Math.random, getDictionary());
    const record = newRecord(code, rounds, creatorName, Date.now());
    await this.save(record);
    return this.withCreds(record, 0);
  }
  async createRematch(info, names) {
    if (this.record) return { ok: false };
    const rounds = generateMatchRounds(Math.random, getDictionary());
    await this.save(rematchRecord(info, rounds, names, Date.now()));
    return { ok: true };
  }
  async join(name) {
    if (!this.record) return notFound;
    const r = join(this.record, name);
    if (!r.ok) return r;
    await this.save(r.record);
    return this.withCreds(r.record, 1);
  }
  async rejoin(secret) {
    if (!this.record) return notFound;
    const seat = seatForRejoinSecret(this.record, secret);
    if (seat === null) return { ok: false, status: 404, message: "That rejoin code doesn't match. Check it and try again." };
    return this.withCreds(this.record, seat);
  }
  async get(token) {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    return { ok: true, match: response(s.record, s.seat) };
  }
  async setWord(token, round, word) {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applyWord(s.record, s.seat, round, word, getDictionary());
    if (!r.ok) return r;
    await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat) };
  }
  async guess(token, round, guess) {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applyGuess(s.record, s.seat, round, guess, getDictionary());
    if (!r.ok) return r;
    await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat), marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
  }
  async summarySeen(token, round) {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applySummarySeen(s.record, s.seat, round);
    if (!r.ok) return r;
    if (r.record.state !== s.record.state) await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat) };
  }
  /** Starts (or returns) the rematch, and hands this seat its credentials for it. */
  async rematch(token) {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const { record, seat } = s;
    if (record.state.names[1] === null) return { ok: false, status: 409, message: "Your friend hasn't joined yet." };
    let info = record.rematch;
    if (!info) {
      const names = [record.state.names[0], record.state.names[1]];
      for (let attempt = 0; attempt < 5 && !info; attempt++) {
        const candidate = planRematch(randomCode(JOIN_CODE_LENGTH));
        const stub = this.env.MATCHES.get(this.env.MATCHES.idFromName(candidate.code));
        if ((await stub.createRematch(candidate, names)).ok) info = candidate;
      }
      if (!info) return { ok: false, status: 500, message: "Couldn't start a rematch. Try again." };
      await this.save({ ...record, rematch: info });
    }
    const target = this.env.MATCHES.get(this.env.MATCHES.idFromName(info.code));
    const r = await target.get(info.tokens[seat]);
    if (!r.ok) return r;
    return {
      ok: true,
      credentials: { code: info.code, seat, token: info.tokens[seat], rejoinCode: r.match.rejoinCode },
      // RPC results lose tuple types; the shape is the same MatchResponse.
      match: r.match
    };
  }
};

// packages/server/src/index.ts
var json = /* @__PURE__ */ __name((body2, status = 200) => new Response(JSON.stringify(body2), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
var failure = /* @__PURE__ */ __name((f) => json({ message: f.message }, f.status), "failure");
function send(r) {
  if (!r.ok) return failure(r);
  const { ok: _ok, ...body2 } = r;
  return json(body2);
}
__name(send, "send");
async function body(request) {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}
__name(body, "body");
function bearer(request) {
  const h = request.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}
__name(bearer, "bearer");
async function api(request, env, path) {
  const method = request.method;
  const room = /* @__PURE__ */ __name((code2) => env.MATCHES.get(env.MATCHES.idFromName(code2)), "room");
  if (path.length === 1 && path[0] === "matches" && method === "POST") {
    const name = cleanName((await body(request)).name);
    if (!name) return json({ message: "Enter your name." }, 400);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code2 = randomCode(JOIN_CODE_LENGTH);
      const r = await room(code2).create(code2, name);
      if (r.ok || !("exists" in r)) return send(r);
    }
    return json({ message: "Couldn't create a game. Try again." }, 500);
  }
  if (path.length === 1 && path[0] === "rejoin" && method === "POST") {
    const parsed = parseRejoinCode(String((await body(request)).rejoinCode ?? ""));
    if (!parsed) return json({ message: "That doesn't look like a rejoin code." }, 400);
    return send(await room(parsed.code).rejoin(parsed.secret));
  }
  if (path[0] !== "matches" || !path[1]) return json({ message: "Not found." }, 404);
  const code = normalizeCode(path[1]);
  if (!isJoinCode(code)) return json({ message: "That doesn't look like a game code." }, 400);
  const stub = room(code);
  const token = bearer(request);
  const action = path[2];
  if (!action && method === "GET") return send(await stub.get(token));
  if (method !== "POST") return json({ message: "Not found." }, 404);
  const b = await body(request);
  switch (action) {
    case "join": {
      const name = cleanName(b.name);
      if (!name) return json({ message: "Enter your name." }, 400);
      return send(await stub.join(name));
    }
    case "word":
      return send(await stub.setWord(token, b.round, b.word));
    case "guess":
      return send(await stub.guess(token, b.round, b.guess));
    case "summary-seen":
      return send(await stub.summarySeen(token, b.round));
    case "rematch":
      return send(await stub.rematch(token));
  }
  return json({ message: "Not found." }, 404);
}
__name(api, "api");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url.pathname.slice(5).split("/").filter(Boolean));
    } catch (e) {
      console.error(e);
      return json({ message: "Something went wrong. Try again." }, 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body2 = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body2);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body2, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-F8GC3u/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-F8GC3u/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  MatchRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
