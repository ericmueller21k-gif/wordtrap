import { describe, expect, it } from "vitest";
import {
  candidatesForClue,
  catchProbabilities,
  filterByFeedback,
  guessFeedback,
  mulberry32,
  simulateGuesser,
  type Board,
} from "../src/index.ts";

const board: Board = { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } };

describe("candidatesForClue", () => {
  it("keeps words matching the clue's length and tile score", () => {
    const playable = ["THIS", "THUS", "SHUT", "QUIT", "HITS", "HIT", "QUITE"];
    expect(candidatesForClue(playable, { length: 4, tileScore: 15 }, board)).toEqual(["THIS", "THUS", "SHUT", "QUIT"]);
  });
});

describe("filterByFeedback", () => {
  it("keeps candidates consistent with the marks and drops the guess", () => {
    const pool = ["THIS", "THUS", "SHUT", "QUIT"];
    // Secret THIS, guess SHUT marks slot 2 only.
    expect(filterByFeedback(pool, "SHUT", guessFeedback("THIS", "SHUT"))).toEqual(["THIS"]);
    // Secret QUIT, guess THIS marks slot 3 (I) only: QUIT stays, THUS and SHUT go.
    expect(filterByFeedback(pool, "THIS", guessFeedback("QUIT", "THIS"))).toEqual(["QUIT"]);
  });
});

describe("catchProbabilities", () => {
  it("is certain for a lone candidate and 1/n with one guess", () => {
    expect(catchProbabilities(["QUIT"], 3).get("QUIT")).toBe(1);
    const one = catchProbabilities(["A", "B", "C", "D"].map((c) => c + "AT"), 1);
    for (const p of one.values()) expect(p).toBeCloseTo(0.25);
  });

  it("is 1 for n distinct candidates when guesses >= n", () => {
    for (const p of catchProbabilities(["CAT", "DOG", "PIG"], 3).values()) expect(p).toBeCloseTo(1);
  });

  it("matches simulation", () => {
    const pool = ["THIS", "THUS", "SHUT", "QUIT", "HITS", "SUIT", "TUSH", "QUIS"];
    const exact = catchProbabilities(pool, 3);
    const rng = mulberry32(1);
    for (const secret of pool) {
      let caught = 0;
      const trials = 20_000;
      for (let i = 0; i < trials; i++) if (simulateGuesser(rng, pool, secret, 3) > 0) caught++;
      expect(caught / trials).toBeCloseTo(exact.get(secret)!, 1);
    }
  });
});
