import type { Dictionary } from "./dictionary.ts";
import { guessFeedback } from "./feedback.ts";
import { clueFor, scoreRound } from "./scoring.ts";
import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";
import type { Board, Clue, Rack, Round } from "./types.ts";
import { validateGuess, validateSetWord, type GuessProblem, type WordProblem } from "./validation.ts";

/**
 * The match flow from spec.md as a pure state machine. Both the
 * pass-the-phone client and the server run it; `viewFor` applies the
 * visibility rules, so a player's device only ever needs a view.
 */

export type Seat = 0 | 1;

export interface SeatRound {
  word: string | null;
  /** This player's guesses at the other player's word. */
  guesses: string[];
  /** True once this player has caught the other word or used every guess. */
  doneGuessing: boolean;
}

export interface MatchState {
  rounds: Round[];
  names: [string, string | null];
  /** progress[round][seat] */
  progress: [SeatRound, SeatRound][];
  /** How many round summaries each seat has dismissed. */
  summariesSeen: [number, number];
}

export type Stage =
  | { kind: "set"; round: number }
  | { kind: "waitingForWord"; round: number }
  | { kind: "guess"; round: number }
  | { kind: "waitingForGuesses"; round: number }
  | { kind: "finished" };

export type MatchError =
  | { ok: false; problem: "not_your_turn"; message: string }
  | { ok: false; problem: WordProblem | GuessProblem; message: string };

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

const emptySeatRound = (): SeatRound => ({ word: null, guesses: [], doneGuessing: false });

export function createMatch(rounds: Round[], creatorName: string, secondName: string | null = null): MatchState {
  return {
    rounds,
    names: [creatorName, secondName],
    progress: rounds.map(() => [emptySeatRound(), emptySeatRound()]),
    summariesSeen: [0, 0],
  };
}

export function joinMatch(state: MatchState, name: string): MatchState {
  if (state.names[1] !== null) throw new Error("Match is full");
  return { ...state, names: [state.names[0], name] };
}

/**
 * What this player can do now. The creator may set their round 1 word before
 * the second player joins.
 */
export function stageFor(state: MatchState, seat: Seat): Stage {
  for (let r = 0; r < state.rounds.length; r++) {
    const me = state.progress[r]![seat];
    const them = state.progress[r]![other(seat)];
    if (me.word === null) return { kind: "set", round: r };
    if (!me.doneGuessing) {
      return them.word === null ? { kind: "waitingForWord", round: r } : { kind: "guess", round: r };
    }
  }
  for (let r = 0; r < state.rounds.length; r++) {
    if (!state.progress[r]![other(seat)].doneGuessing) return { kind: "waitingForGuesses", round: r };
  }
  return { kind: "finished" };
}

export function isRoundComplete(state: MatchState, round: number): boolean {
  const p = state.progress[round];
  return !!p && p[0].doneGuessing && p[1].doneGuessing;
}

export function isMatchFinished(state: MatchState): boolean {
  return state.rounds.every((_, r) => isRoundComplete(state, r));
}

export interface RoundResult {
  scores: [number, number];
  /** caught[seat]: whether that seat's word was caught. */
  caught: [boolean, boolean];
}

export function roundResult(state: MatchState, round: number, settings: Settings = DEFAULT_SETTINGS): RoundResult | null {
  if (!isRoundComplete(state, round)) return null;
  const [a, b] = state.progress[round]!;
  const caught: [boolean, boolean] = [b.guesses.includes(a.word!), a.guesses.includes(b.word!)];
  const scores = scoreRound(
    state.rounds[round]!.board,
    { word: a.word!, caught: caught[0] },
    { word: b.word!, caught: caught[1] },
    settings,
  );
  return { scores, caught };
}

/** Totals over completed rounds only. */
export function matchTotals(state: MatchState, settings: Settings = DEFAULT_SETTINGS): [number, number] {
  const totals: [number, number] = [0, 0];
  state.rounds.forEach((_, r) => {
    const result = roundResult(state, r, settings);
    if (result) {
      totals[0] += result.scores[0];
      totals[1] += result.scores[1];
    }
  });
  return totals;
}

function notYourTurn(): MatchError {
  return { ok: false, problem: "not_your_turn", message: "It's not your turn to do that." };
}

function withSeatRound(state: MatchState, round: number, seat: Seat, update: SeatRound): MatchState {
  const progress = state.progress.map((p, r) => {
    if (r !== round) return p;
    const next: [SeatRound, SeatRound] = [p[0], p[1]];
    next[seat] = update;
    return next;
  });
  return { ...state, progress };
}

export function setWord(
  state: MatchState,
  seat: Seat,
  round: number,
  word: string,
  dictionary: Dictionary,
  settings: Settings = DEFAULT_SETTINGS,
): { ok: true; state: MatchState } | MatchError {
  const stage = stageFor(state, seat);
  if (stage.kind !== "set" || stage.round !== round) return notYourTurn();
  const { rack, reusable } = state.rounds[round]!;
  const check = validateSetWord(word, rack, dictionary, settings, reusable);
  if (!check.ok) return check;
  return { ok: true, state: withSeatRound(state, round, seat, { ...state.progress[round]![seat], word }) };
}

export interface GuessOutcome {
  ok: true;
  state: MatchState;
  marks: boolean[];
  caught: boolean;
  doneGuessing: boolean;
}

export function submitGuess(
  state: MatchState,
  seat: Seat,
  round: number,
  guess: string,
  dictionary: Dictionary,
  settings: Settings = DEFAULT_SETTINGS,
): GuessOutcome | MatchError {
  const stage = stageFor(state, seat);
  if (stage.kind !== "guess" || stage.round !== round) return notYourTurn();
  const me = state.progress[round]![seat];
  const secret = state.progress[round]![other(seat)].word!;
  const check = validateGuess(
    guess,
    {
      rack: state.rounds[round]!.rack,
      reusable: state.rounds[round]!.reusable,
      length: secret.length,
      previousGuesses: me.guesses,
    },
    dictionary,
    settings,
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
    doneGuessing,
  };
}

export function markSummarySeen(state: MatchState, seat: Seat, round: number): MatchState {
  if (!isRoundComplete(state, round) || state.summariesSeen[seat] > round) return state;
  const summariesSeen: [number, number] = [...state.summariesSeen];
  summariesSeen[seat] = round + 1;
  return { ...state, summariesSeen };
}

// ---- Per-player views ----

export interface GuessView {
  word: string;
  marks: boolean[];
}

export interface RoundView {
  index: number;
  rack: Rack;
  board: Board;
  /** The letter both players may use any number of times this round. */
  reusable: string | null;
  myWord: string | null;
  opponentSubmitted: boolean;
  /** Length and tile score of the other word, once both words are in. */
  clue: Clue | null;
  myGuesses: GuessView[];
  myDoneGuessing: boolean;
  opponentDoneGuessing: boolean;
  /** The other word, once this player has finished guessing. */
  opponentWord: string | null;
  /** The other player's guesses at my word, once both have finished. */
  opponentGuesses: GuessView[] | null;
  result: RoundResult | null;
}

export interface PlayerView {
  seat: Seat;
  myName: string;
  opponentName: string | null;
  stage: Stage;
  opponentStage: Stage["kind"];
  roundsTotal: number;
  guessesPerWord: number;
  totals: [mine: number, theirs: number];
  summariesSeen: number;
  /** Rounds this player has reached, in order. */
  rounds: RoundView[];
}

function guessViews(guesses: readonly string[], secret: string | null): GuessView[] {
  return guesses.map((word) => ({ word, marks: secret ? guessFeedback(secret, word) : [] }));
}

/**
 * Everything one player may see, per the table in spec.md. The other
 * player's word appears only once this player has finished guessing it.
 */
export function viewFor(state: MatchState, seat: Seat, settings: Settings = DEFAULT_SETTINGS): PlayerView {
  const stage = stageFor(state, seat);
  const opp = other(seat);
  const reached = stage.kind === "finished" ? state.rounds.length : stage.round + 1;
  const rounds: RoundView[] = [];
  for (let r = 0; r < reached; r++) {
    const me = state.progress[r]![seat];
    const them = state.progress[r]![opp];
    const both = me.word !== null && them.word !== null;
    const result = roundResult(state, r, settings);
    const flip = (x: RoundResult): RoundResult =>
      seat === 0
        ? x
        : { scores: [x.scores[1], x.scores[0]], caught: [x.caught[1], x.caught[0]] };
    rounds.push({
      index: r,
      rack: state.rounds[r]!.rack,
      board: state.rounds[r]!.board,
      reusable: state.rounds[r]!.reusable ?? null,
      myWord: me.word,
      opponentSubmitted: them.word !== null,
      clue: both ? clueFor(them.word!, state.rounds[r]!.board, settings) : null,
      myGuesses: guessViews(me.guesses, both ? them.word : null),
      myDoneGuessing: me.doneGuessing,
      opponentDoneGuessing: them.doneGuessing,
      opponentWord: me.doneGuessing ? them.word : null,
      opponentGuesses: result ? guessViews(them.guesses, me.word) : null,
      result: result ? flip(result) : null,
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
    rounds,
  };
}
