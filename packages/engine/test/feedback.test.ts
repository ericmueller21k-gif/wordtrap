import { describe, expect, it } from "vitest";
import { guessFeedback, isCatch } from "../src/index.ts";

describe("guessFeedback", () => {
  it("matches the feedback example in spec.md", () => {
    // Secret THIS: THUS marks slots 1, 2 and 4; SHUT marks slot 2 only.
    expect(guessFeedback("THIS", "THUS")).toEqual([true, true, false, true]);
    expect(guessFeedback("THIS", "SHUT")).toEqual([false, true, false, false]);
  });

  it("gives no credit for a right letter in the wrong slot", () => {
    expect(guessFeedback("TEA", "EAT")).toEqual([false, false, false]);
  });

  it("marks every slot on an exact match, which is a catch", () => {
    expect(guessFeedback("QUITE", "QUITE")).toEqual([true, true, true, true, true]);
    expect(isCatch("QUITE", "QUITE")).toBe(true);
    expect(isCatch("QUITE", "QUIET")).toBe(false);
  });

  it("rejects guesses of a different length", () => {
    expect(() => guessFeedback("THIS", "HIT")).toThrow();
  });
});
