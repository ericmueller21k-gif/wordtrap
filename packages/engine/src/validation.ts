import type { Dictionary } from "./dictionary.ts";
import { canMakeFromRack, isAlphabetic } from "./letters.ts";
import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";
import type { Rack } from "./types.ts";

export type WordProblem =
  | "not_letters"
  | "too_short"
  | "too_long"
  | "no_tiles"
  | "not_a_word"
  | "uncommon";

export type GuessProblem = WordProblem | "wrong_length" | "repeated";

export type ValidationResult<P extends string> = { ok: true } | { ok: false; problem: P; message: string };

/** Player-facing messages. The last three are worded exactly as in spec.md. */
export function problemMessage(problem: GuessProblem, settings: Settings = DEFAULT_SETTINGS): string {
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

function fail<P extends GuessProblem>(problem: P, settings: Settings): ValidationResult<P> {
  return { ok: false, problem, message: problemMessage(problem, settings) };
}

function checkTilesAndDictionary(
  word: string,
  rack: Rack,
  dictionary: Dictionary,
  settings: Settings,
): ValidationResult<WordProblem> {
  if (!canMakeFromRack(word, rack)) return fail("no_tiles", settings);
  if (dictionary.isCommon(word)) return { ok: true };
  return fail(dictionary.isReal(word) ? "uncommon" : "not_a_word", settings);
}

/** Validates a word a player wants to set. `word` must already be normalised. */
export function validateSetWord(
  word: string,
  rack: Rack,
  dictionary: Dictionary,
  settings: Settings = DEFAULT_SETTINGS,
): ValidationResult<WordProblem> {
  if (!isAlphabetic(word)) return fail("not_letters", settings);
  if (word.length < settings.minWordLength) return fail("too_short", settings);
  if (word.length > settings.rackSize) return fail("too_long", settings);
  return checkTilesAndDictionary(word, rack, dictionary, settings);
}

export interface GuessContext {
  rack: Rack;
  /** Length from the clue. */
  length: number;
  previousGuesses: readonly string[];
}

/**
 * Validates a guess. A rejected guess does not use up a try. The guess does
 * not have to match the clue score.
 */
export function validateGuess(
  guess: string,
  context: GuessContext,
  dictionary: Dictionary,
  settings: Settings = DEFAULT_SETTINGS,
): ValidationResult<GuessProblem> {
  if (!isAlphabetic(guess)) return fail("not_letters", settings);
  if (guess.length !== context.length) return fail("wrong_length", settings);
  if (context.previousGuesses.includes(guess)) return fail("repeated", settings);
  return checkTilesAndDictionary(guess, context.rack, dictionary, settings);
}
