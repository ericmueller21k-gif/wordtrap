import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";
import type { Board, Clue } from "./types.ts";

export function letterValue(letter: string, settings: Settings = DEFAULT_SETTINGS): number {
  const value = settings.letterValues[letter];
  if (value === undefined) throw new Error(`No letter value for "${letter}"`);
  return value;
}

/**
 * The tile score, which is the number shown as the clue. Words start in
 * slot 1, so a square only counts if the word is long enough to cover it.
 */
export function tileScore(word: string, board: Board, settings: Settings = DEFAULT_SETTINGS): number {
  let sum = 0;
  for (let i = 0; i < word.length; i++) {
    const slot = i + 1;
    const value = letterValue(word[i]!, settings);
    sum += slot === board.letterSquare.slot ? value * board.letterSquare.multiplier : value;
  }
  if (word.length >= board.wordSquare.slot) sum *= board.wordSquare.multiplier;
  return sum;
}

export function lengthBonus(length: number, settings: Settings = DEFAULT_SETTINGS): number {
  return settings.lengthBonus[length] ?? 0;
}

export function catchReward(score: number, settings: Settings = DEFAULT_SETTINGS): number {
  return Math.ceil(score * settings.catchRewardFraction);
}

export function clueFor(word: string, board: Board, settings: Settings = DEFAULT_SETTINGS): Clue {
  return { length: word.length, tileScore: tileScore(word, board, settings) };
}

export interface WordOutcome {
  /** Points to the player who set the word. */
  owner: number;
  /** Points to the player who guessed at it. */
  guesser: number;
}

export function scoreWord(
  word: string,
  board: Board,
  caught: boolean,
  settings: Settings = DEFAULT_SETTINGS,
): WordOutcome {
  const score = tileScore(word, board, settings);
  return caught
    ? { owner: 0, guesser: catchReward(score, settings) }
    : { owner: score + lengthBonus(word.length, settings), guesser: 0 };
}

export interface RoundPlayerInput {
  word: string;
  /** Whether this player's word was caught by the opponent. */
  caught: boolean;
}

/**
 * A player's round score is what their own word earned plus what they earned
 * by catching the other word.
 */
export function scoreRound(
  board: Board,
  a: RoundPlayerInput,
  b: RoundPlayerInput,
  settings: Settings = DEFAULT_SETTINGS,
): [number, number] {
  const aWord = scoreWord(a.word, board, a.caught, settings);
  const bWord = scoreWord(b.word, board, b.caught, settings);
  return [aWord.owner + bWord.guesser, bWord.owner + aWord.guesser];
}
