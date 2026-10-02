/**
 * Every tunable rule in Word Trap lives here, so playtesting changes never
 * touch game code. Values are the starting values from spec.md.
 */

export interface SquareSettings {
  /** Possible multipliers, each drawn with the matching weight. */
  multipliers: readonly number[];
  weights: readonly number[];
  /** Lowest and highest slot (1-based, inclusive) the square may sit on. */
  minSlot: number;
  maxSlot: number;
}

export interface Settings {
  roundsPerMatch: number;
  /** Rack size, which is also the number of board slots. */
  rackSize: number;
  minWordLength: number;
  guessesPerWord: number;
  /** Bonus by word length, added after multipliers, paid only on survival. */
  lengthBonus: Readonly<Record<number, number>>;
  /** Fraction of the tile score a catcher earns, rounded up. */
  catchRewardFraction: number;
  letterSquare: SquareSettings;
  wordSquare: SquareSettings;
  rackFilter: {
    minCommonWords: number;
    minLongWords: number;
    /** Words of at least this length count towards minLongWords. */
    longWordLength: number;
    /** Safety valve so a bad combination of settings can't loop forever. */
    maxRedraws: number;
  };
  dictionary: {
    /** How many of the most frequent 3-7 letter words form the common list. */
    commonCutoff: number;
    /**
     * A regular inflection of a common word is common only if it appears at
     * least this often in the subtitle corpus (0 accepts any real inflection).
     * Filters out real-but-odd forms like ABODED and HEEDER.
     */
    inflectionMinCount: number;
  };
  letterValues: Readonly<Record<string, number>>;
  /** Tile bag (count per letter). Standard English Scrabble, no blanks. */
  bag: Readonly<Record<string, number>>;
}

export const DEFAULT_SETTINGS: Settings = {
  roundsPerMatch: 5,
  rackSize: 7,
  minWordLength: 3,
  // spec.md starts at 3; the balance report (reports/balance.md) showed 3 lets the
  // guesser catch ~94% of words, so v1 playtests with 2. See DECISIONS.md.
  guessesPerWord: 2,
  lengthBonus: { 5: 1, 6: 5, 7: 10 },
  catchRewardFraction: 0.5,
  letterSquare: { multipliers: [2, 3], weights: [1, 1], minSlot: 1, maxSlot: 7 },
  wordSquare: { multipliers: [2, 3], weights: [1, 1], minSlot: 4, maxSlot: 7 },
  rackFilter: { minCommonWords: 25, minLongWords: 3, longWordLength: 5, maxRedraws: 10_000 },
  dictionary: { commonCutoff: 10_000, inflectionMinCount: 20 },
  letterValues: {
    A: 1, E: 1, I: 1, L: 1, N: 1, O: 1, R: 1, S: 1, T: 1, U: 1,
    D: 2, G: 2,
    B: 3, C: 3, M: 3, P: 3,
    F: 4, H: 4, V: 4, W: 4, Y: 4,
    K: 5,
    J: 8, X: 8,
    Q: 10, Z: 10,
  },
  bag: {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
    N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  },
};
