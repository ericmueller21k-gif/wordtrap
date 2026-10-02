import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  drawRack,
  fullBag,
  generateBoard,
  generateMatchRounds,
  generateRack,
  letterCounts,
  mulberry32,
  canMakeFromRack,
  pickReusable,
  rackStats,
  type Settings,
} from "../src/index.ts";
import { loadDictionary } from "../src/node.ts";

const dict = loadDictionary();

describe("fullBag", () => {
  it("is the 98-tile Scrabble bag without blanks", () => {
    const bag = fullBag();
    expect(bag).toHaveLength(98);
    expect(letterCounts(bag).get("E")).toBe(12);
    expect(letterCounts(bag).get("Q")).toBe(1);
  });
});

describe("drawRack", () => {
  it("draws 7 tiles without replacement", () => {
    const rng = mulberry32(1);
    const bag = letterCounts(fullBag());
    for (let i = 0; i < 2000; i++) {
      const rack = drawRack(rng);
      expect(rack).toHaveLength(7);
      for (const [letter, n] of letterCounts(rack)) expect(n).toBeLessThanOrEqual(bag.get(letter)!);
    }
  });

  it("is reproducible from a seed", () => {
    expect(drawRack(mulberry32(42))).toEqual(drawRack(mulberry32(42)));
  });
});

describe("Q racks", () => {
  it("always come with a U", () => {
    const rng = mulberry32(11);
    let qRacks = 0;
    for (let i = 0; i < 20_000; i++) {
      const rack = drawRack(rng);
      if (rack.includes("Q")) {
        qRacks++;
        expect(rack).toContain("U");
      }
    }
    expect(qRacks).toBeGreaterThan(500);
  });
});

describe("reusable letter", () => {
  it("is a rack letter, never an excluded one", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 2000; i++) {
      const rack = drawRack(rng);
      const r = pickReusable(rng, rack);
      if (r === null) continue;
      expect(rack).toContain(r);
      expect(["J", "K", "Q", "V", "W", "X", "Y", "Z"]).not.toContain(r);
    }
  });

  it("can be used any number of times", () => {
    const rack = ["B", "A", "N", "E", "R", "T", "S"];
    expect(canMakeFromRack("BANANA", rack, "A")).toBe(false); // only one N
    expect(canMakeFromRack("BANANA", rack, "N")).toBe(false); // only one A
    expect(canMakeFromRack("ASSESS", rack, "S")).toBe(true); // one A, one E, four S
    expect(canMakeFromRack("TESTS", rack, "S")).toBe(false); // only one T
    expect(canMakeFromRack("SEES", rack, "E")).toBe(false); // only one S
    expect(canMakeFromRack("TREES", rack, "E")).toBe(true);
    expect(canMakeFromRack("TREES", rack, null)).toBe(false);
    expect(dict.playableWords(rack, "E")).toContain("TREES");
    expect(dict.playableWords(rack)).not.toContain("TREES");
  });

  it("is dealt with every round", () => {
    for (const round of generateMatchRounds(mulberry32(8), dict)) {
      expect(round.reusable).toBeTruthy();
      expect(round.rack).toContain(round.reusable);
    }
  });
});

describe("generateBoard", () => {
  it("keeps squares in range and on different slots, with each multiplier appearing", () => {
    const rng = mulberry32(7);
    const seen = { letterSlots: new Set<number>(), wordSlots: new Set<number>(), lm: new Set<number>(), wm: new Set<number>() };
    for (let i = 0; i < 2000; i++) {
      const { letterSquare, wordSquare } = generateBoard(rng);
      expect(letterSquare.slot).toBeGreaterThanOrEqual(1);
      expect(letterSquare.slot).toBeLessThanOrEqual(7);
      expect(wordSquare.slot).toBeGreaterThanOrEqual(4);
      expect(wordSquare.slot).toBeLessThanOrEqual(7);
      expect(wordSquare.slot).not.toBe(letterSquare.slot);
      seen.letterSlots.add(letterSquare.slot);
      seen.wordSlots.add(wordSquare.slot);
      seen.lm.add(letterSquare.multiplier);
      seen.wm.add(wordSquare.multiplier);
    }
    expect(seen.letterSlots.size).toBe(7);
    expect(seen.wordSlots.size).toBe(4);
    expect([...seen.lm].sort()).toEqual([2, 3]);
    expect([...seen.wm].sort()).toEqual([2, 3]);
  });
});

describe("generateRack", () => {
  it("only returns racks that pass the rack filter", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const { rack, reusable } = generateRack(rng, dict);
      const stats = rackStats(rack, dict, undefined, reusable);
      expect(stats.commonWords).toBeGreaterThanOrEqual(25);
      expect(stats.longWords).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives up with an error when the filter cannot be met", () => {
    const impossible: Settings = {
      ...DEFAULT_SETTINGS,
      rackFilter: { ...DEFAULT_SETTINGS.rackFilter, minCommonWords: 1_000_000, maxRedraws: 20 },
    };
    expect(() => generateRack(mulberry32(1), dict, impossible)).toThrow(/No playable rack/);
  });
});

describe("generateMatchRounds", () => {
  it("deals one rack and board per round, reproducibly", () => {
    const rounds = generateMatchRounds(mulberry32(99), dict);
    expect(rounds).toHaveLength(5);
    expect(generateMatchRounds(mulberry32(99), dict)).toEqual(rounds);
  });
});
