import { describe, expect, it } from "vitest";
import { catchReward, clueFor, lengthBonus, scoreRound, scoreWord, tileScore, type Board } from "../src/index.ts";

// spec.md worked example: rack Q U I T H E S, 3L on slot 2, 2W on slot 5.
const board: Board = { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } };

describe("worked example from spec.md", () => {
  it.each([
    ["HIT", 8, 8, 4],
    ["THIS", 15, 15, 8],
    ["QUIT", 15, 15, 8],
    ["QUITE", 32, 33, 16],
    ["QUIETS", 34, 39, 17],
  ])("%s: clue %i, survives %i, caught pays %i", (word, clue, survives, caught) => {
    expect(tileScore(word, board)).toBe(clue);
    expect(clueFor(word, board)).toEqual({ length: word.length, tileScore: clue });
    expect(scoreWord(word, board, false)).toEqual({ owner: survives, guesser: 0 });
    expect(scoreWord(word, board, true)).toEqual({ owner: 0, guesser: caught });
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
  it("pays +1 / +5 / +10 for 5 / 6 / 7 letters and nothing shorter", () => {
    expect([3, 4, 5, 6, 7].map((n) => lengthBonus(n))).toEqual([0, 0, 1, 5, 10]);
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
    // A's QUITE survives (33); B's THIS is caught by A (8).
    expect(scoreRound(board, { word: "QUITE", caught: false }, { word: "THIS", caught: true })).toEqual([41, 0]);
    // Both survive.
    expect(scoreRound(board, { word: "HIT", caught: false }, { word: "QUIETS", caught: false })).toEqual([8, 39]);
    // Both caught.
    expect(scoreRound(board, { word: "HIT", caught: true }, { word: "QUIETS", caught: true })).toEqual([17, 4]);
  });
});
