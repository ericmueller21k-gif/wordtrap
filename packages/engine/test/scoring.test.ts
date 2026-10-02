import { describe, expect, it } from "vitest";
import {
  catchReward,
  clueFor,
  DEFAULT_SETTINGS,
  lengthBonus,
  scoreRound,
  scoreWord,
  tileScore,
  type Board,
  type Settings,
} from "../src/index.ts";

// The spec's worked example uses its original length bonus; Eric changed the bonus on Oct 2 2026.
const spec: Settings = { ...DEFAULT_SETTINGS, lengthBonus: { 5: 1, 6: 5, 7: 10 } };

// spec.md worked example: rack Q U I T H E S, 3L on slot 2, 2W on slot 5.
const board: Board = { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } };

describe("worked example from spec.md (original length bonus)", () => {
  it.each([
    ["HIT", 8, 8, 4],
    ["THIS", 15, 15, 8],
    ["QUIT", 15, 15, 8],
    ["QUITE", 32, 33, 16],
    ["QUIETS", 34, 39, 17],
  ])("%s: clue %i, survives %i, caught pays %i", (word, clue, survives, caught) => {
    expect(tileScore(word, board)).toBe(clue);
    expect(clueFor(word, board)).toEqual({ length: word.length, tileScore: clue });
    expect(scoreWord(word, board, false, spec)).toEqual({ owner: survives, guesser: 0 });
    expect(scoreWord(word, board, true, spec)).toEqual({ owner: 0, guesser: caught });
  });
});

describe("tileScore", () => {
  it("ignores squares the word does not reach", () => {
    const far: Board = { letterSquare: { slot: 6, multiplier: 3 }, wordSquare: { slot: 7, multiplier: 3 } };
    expect(tileScore("HIT", far)).toBe(6);
    expect(tileScore("QUIETS", far)).toBe(10 + 1 + 1 + 1 + 1 + 3);
    expect(tileScore("QUIETER", far)).toBe((10 + 1 + 1 + 1 + 1 + 3 * 1 + 1) * 3);
  });

  it("applies the letter square to the letter on it, before the word multiplier", () => {
    const b: Board = { letterSquare: { slot: 1, multiplier: 2 }, wordSquare: { slot: 4, multiplier: 3 } };
    expect(tileScore("JAZZ", b)).toBe((16 + 1 + 10 + 10) * 3);
  });
});

describe("lengthBonus and catchReward", () => {
  it("pays +2 / +5 / +10 / +20 for 4 / 5 / 6 / 7 letters and nothing for 3", () => {
    expect([3, 4, 5, 6, 7].map((n) => lengthBonus(n))).toEqual([0, 2, 5, 10, 20]);
  });

  it("adds the current bonus to a surviving word", () => {
    expect(scoreWord("HIT", board, false).owner).toBe(8);
    expect(scoreWord("THIS", board, false).owner).toBe(17);
    expect(scoreWord("QUITE", board, false).owner).toBe(37);
    expect(scoreWord("QUIETS", board, false).owner).toBe(44);
  });

  it("rounds half the tile score up", () => {
    expect(catchReward(15)).toBe(8);
    expect(catchReward(32)).toBe(16);
    expect(catchReward(1)).toBe(1);
  });

  it("never pays the length bonus on a caught word", () => {
    expect(scoreWord("QUIETS", board, true).owner).toBe(0);
  });
});

describe("scoreRound", () => {
  it("adds a player's own word to what they earned by catching", () => {
    // A's QUITE survives (37); B's THIS is caught by A (8).
    expect(scoreRound(board, { word: "QUITE", caught: false }, { word: "THIS", caught: true })).toEqual([45, 0]);
    // Both survive.
    expect(scoreRound(board, { word: "HIT", caught: false }, { word: "QUIETS", caught: false })).toEqual([8, 44]);
    // Both caught.
    expect(scoreRound(board, { word: "HIT", caught: true }, { word: "QUIETS", caught: true })).toEqual([17, 4]);
  });
});
