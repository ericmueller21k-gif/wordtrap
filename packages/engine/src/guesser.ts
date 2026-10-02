import { guessFeedback } from "./feedback.ts";
import { tileScore } from "./scoring.ts";
import type { Rng } from "./rng.ts";
import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";
import type { Board, Clue } from "./types.ts";

/**
 * The "simple guesser" from spec.md: it picks at random among the words that
 * fit the clue and the feedback so far. Used by the balance report, and a
 * starting point for the parked practice bot.
 */

/** Playable words whose length and tile score match the clue. */
export function candidatesForClue(
  playable: readonly string[],
  clue: Clue,
  board: Board,
  settings: Settings = DEFAULT_SETTINGS,
): string[] {
  return playable.filter((w) => w.length === clue.length && tileScore(w, board, settings) === clue.tileScore);
}

function sameMarks(a: readonly boolean[], b: readonly boolean[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Candidates still possible after `guess` produced `marks`, minus the guess itself. */
export function filterByFeedback(candidates: readonly string[], guess: string, marks: readonly boolean[]): string[] {
  return candidates.filter((w) => w !== guess && sameMarks(guessFeedback(w, guess), marks));
}

export function pickGuess(rng: Rng, candidates: readonly string[]): string {
  if (candidates.length === 0) throw new Error("No candidates to guess from");
  return candidates[Math.floor(rng() * candidates.length)]!;
}

/** Plays the simple guesser against `secret`. Returns the guess number that caught it, or 0. */
export function simulateGuesser(
  rng: Rng,
  candidates: readonly string[],
  secret: string,
  guesses: number = DEFAULT_SETTINGS.guessesPerWord,
): number {
  let pool = candidates;
  for (let n = 1; n <= guesses && pool.length > 0; n++) {
    const guess = pickGuess(rng, pool);
    if (guess === secret) return n;
    pool = filterByFeedback(pool, guess, guessFeedback(secret, guess));
  }
  return 0;
}

/**
 * Exact probability that the simple guesser catches each candidate within
 * `guesses` tries, if that candidate is the secret. `candidates` must be the
 * full set of words fitting the clue (each word once).
 */
export function catchProbabilities(candidates: readonly string[], guesses: number): Map<string, number> {
  const result = new Map<string, number>();
  if (guesses <= 0 || candidates.length === 0) {
    for (const w of candidates) result.set(w, 0);
    return result;
  }
  if (guesses === 1) {
    for (const w of candidates) result.set(w, 1 / candidates.length);
    return result;
  }
  const n = candidates.length;
  const totals = new Map<string, number>(candidates.map((w) => [w, 0]));
  for (const guess of candidates) {
    // Every other candidate, grouped by the marks this guess would show.
    const classes = new Map<string, string[]>();
    for (const w of candidates) {
      if (w === guess) continue;
      const key = guessFeedback(w, guess).map((m) => (m ? "1" : "0")).join("");
      const group = classes.get(key);
      if (group) group.push(w);
      else classes.set(key, [w]);
    }
    totals.set(guess, totals.get(guess)! + 1);
    for (const group of classes.values()) {
      for (const [w, p] of catchProbabilities(group, guesses - 1)) totals.set(w, totals.get(w)! + p);
    }
  }
  for (const [w, t] of totals) result.set(w, t / n);
  return result;
}
