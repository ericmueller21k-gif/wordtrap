import { describe, expect, it } from "vitest";
import { Dictionary, tileScore, type Board } from "../src/index.ts";
import { loadDictionary, readWordFile, WORDS_DIR } from "../src/node.ts";

const dict = loadDictionary();

describe("built word lists", () => {
  const real = readWordFile(`${WORDS_DIR}/real.txt`);
  const common = readWordFile(`${WORDS_DIR}/common.txt`);

  it("keep common a subset of real, all 3 to 7 upper-case letters", () => {
    const realSet = new Set(real);
    for (const w of common) expect(realSet.has(w), w).toBe(true);
    for (const w of real) expect(w, w).toMatch(/^[A-Z]{3,7}$/);
  });

  it("are roughly the size the settings ask for", () => {
    expect(common.length).toBeGreaterThan(10_000);
    expect(common.length).toBeLessThan(25_000);
  });

  it("include everyday words and regular inflections", () => {
    for (const w of ["HIT", "THIS", "QUITE", "QUIETS", "STOPPED", "BIGGEST", "CRIES", "MAKING"]) {
      expect(dict.isCommon(w), w).toBe(true);
    }
  });

  it("know obscure words as real but not common", () => {
    expect(dict.isReal("QAID")).toBe(true);
    expect(dict.isCommon("QAID")).toBe(false);
  });

  it("drop denied names and offensive words", () => {
    expect(dict.isCommon("LAURA")).toBe(false);
    expect(dict.isCommon("LOGAN")).toBe(false);
    expect(dict.isReal("FAGGOT")).toBe(false);
    expect(dict.isReal("FAGGOTS")).toBe(false);
  });
});

describe("playableWords", () => {
  it("finds the clue ambiguity described in spec.md", () => {
    const rack = ["Q", "U", "I", "T", "H", "E", "S"];
    const board: Board = { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } };
    const words = dict.playableWords(rack);
    const matching = (length: number, score: number) =>
      words.filter((w) => w.length === length && tileScore(w, board) === score);
    expect(matching(4, 15)).toEqual(expect.arrayContaining(["THIS", "THUS", "SHUT", "QUIT"]));
    expect(matching(5, 32)).toEqual(expect.arrayContaining(["QUITE", "QUIET", "QUEST", "QUITS"]));
  });

  it("respects duplicate tiles", () => {
    const small = new Dictionary(["SEES", "SEE"], ["SEES", "SEE"]);
    expect(small.playableWords(["S", "E", "E", "A", "B", "C", "D"])).toEqual(["SEE"]);
  });
});
