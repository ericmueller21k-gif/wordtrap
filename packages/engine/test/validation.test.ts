import { describe, expect, it } from "vitest";
import { canMakeFromRack, Dictionary, normalizeWord, validateGuess, validateSetWord } from "../src/index.ts";

const rack = ["Q", "U", "I", "T", "H", "E", "S"];
const dict = new Dictionary(["HUIS", "QUITE", "THIS", "THUS", "SHUT", "QUIT", "HIT"], ["QUITE", "THIS", "THUS", "SHUT", "QUIT", "HIT"]);

describe("canMakeFromRack", () => {
  it("uses each tile at most once", () => {
    expect(canMakeFromRack("QUITE", rack)).toBe(true);
    expect(canMakeFromRack("SHUTS", rack)).toBe(false);
    expect(canMakeFromRack("SEES", ["S", "E", "E", "S", "A", "B", "C"])).toBe(true);
    expect(canMakeFromRack("SEES", ["S", "E", "X", "S", "A", "B", "C"])).toBe(false);
  });
});

describe("normalizeWord", () => {
  it("upper-cases and trims", () => {
    expect(normalizeWord("  quite ")).toBe("QUITE");
  });
});

describe("validateSetWord", () => {
  it("accepts a common word from the rack", () => {
    expect(validateSetWord("QUITE", rack, dict)).toEqual({ ok: true });
  });

  it("uses the spec.md messages", () => {
    expect(validateSetWord("HUIS", rack, dict)).toMatchObject({
      ok: false,
      problem: "uncommon",
      message: "That's a real word, but it's too uncommon for Word Trap.",
    });
    expect(validateSetWord("SHIQ", rack, dict)).toMatchObject({
      ok: false,
      problem: "not_a_word",
      message: "That's not a word we know.",
    });
    expect(validateSetWord("ZEST", rack, dict)).toMatchObject({
      ok: false,
      problem: "no_tiles",
      message: "You don't have the tiles for that.",
    });
  });

  it("enforces 3 to 7 letters", () => {
    expect(validateSetWord("HI", rack, dict)).toMatchObject({ ok: false, problem: "too_short" });
    expect(validateSetWord("QUITESS", rack, dict)).toMatchObject({ ok: false, problem: "no_tiles" });
    expect(validateSetWord("QUIETEST", rack, dict)).toMatchObject({ ok: false, problem: "too_long" });
  });

  it("rejects non-letters and lower case (callers normalise first)", () => {
    expect(validateSetWord("QU1T", rack, dict)).toMatchObject({ ok: false, problem: "not_letters" });
    expect(validateSetWord("quit", rack, dict)).toMatchObject({ ok: false, problem: "not_letters" });
  });
});

describe("validateGuess", () => {
  const context = { rack, length: 4, previousGuesses: ["THUS"] };

  it("accepts a common word of the clue length from the rack, whatever its score", () => {
    expect(validateGuess("SHUT", context, dict)).toEqual({ ok: true });
    expect(validateGuess("QUIT", context, dict)).toEqual({ ok: true });
  });

  it("rejects the wrong length, repeats, and words that fail the set-word checks", () => {
    expect(validateGuess("HIT", context, dict)).toMatchObject({ ok: false, problem: "wrong_length" });
    expect(validateGuess("THUS", context, dict)).toMatchObject({ ok: false, problem: "repeated" });
    expect(validateGuess("HUIS", context, dict)).toMatchObject({ ok: false, problem: "uncommon" });
    expect(validateGuess("SHIQ", context, dict)).toMatchObject({ ok: false, problem: "not_a_word" });
    expect(validateGuess("ZEST", context, dict)).toMatchObject({ ok: false, problem: "no_tiles" });
  });
});
