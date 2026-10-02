/**
 * Pure logic for building the real and common word lists from source data.
 * File reading and writing lives in scripts/build-dictionary.ts.
 */

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function endsConsonantY(word: string): boolean {
  return word.length >= 2 && word.endsWith("Y") && !VOWELS.has(word[word.length - 2]!);
}

/**
 * Candidate regular inflections (plural, -ed, -ing, -er, -est) of a word.
 * Over-generates on purpose: callers keep only candidates that are real words.
 */
export function inflectionCandidates(word: string): string[] {
  const out = new Set<string>();
  const last = word[word.length - 1]!;
  const stem = word.slice(0, -1);

  for (const suffix of ["S", "ES", "ED", "ING", "ER", "EST"]) out.add(word + suffix);
  if (last === "E") {
    for (const suffix of ["D", "R", "ST"]) out.add(word + suffix);
    for (const suffix of ["ING"]) out.add(stem + suffix);
  }
  if (word.endsWith("IE")) out.add(word.slice(0, -2) + "YING");
  if (endsConsonantY(word)) {
    for (const suffix of ["IES", "IED", "IER", "IEST"]) out.add(stem + suffix);
  }
  // Doubled final consonant: STOP -> STOPPED, BIG -> BIGGEST.
  if (!VOWELS.has(last) && !"WXY".includes(last)) {
    for (const suffix of ["ED", "ING", "ER", "EST"]) out.add(word + last + suffix);
  }
  out.delete(word);
  return [...out];
}

export interface WordListSources {
  /** The large real-word list (any case, any length). */
  realWords: Iterable<string>;
  /** Words with corpus counts, in descending frequency order (any case). */
  frequencyRanked: Iterable<readonly [word: string, count: number]>;
  /**
   * Hand-edited: always common (if made of letters and in length range),
   * unless listed directly in the deny or offensive lists.
   */
  allow: Iterable<string>;
  /**
   * Hand-edited: never common, nor are its regular inflections. Overrides the
   * cutoff and the allow file.
   */
  deny: Iterable<string>;
  /**
   * Offensive terms: they and their plurals leave both lists. Only plurals are
   * added, because other inflections hit innocent words (BUTT -> BUTTER).
   */
  offensive: Iterable<string>;
  /** Number of most frequent in-range real words taken before inflections. */
  commonCutoff: number;
  /**
   * An inflection of a common word is common only if the corpus has it at
   * least this many times. 0 accepts every real inflection.
   */
  inflectionMinCount: number;
  minLength: number;
  maxLength: number;
}

export interface WordLists {
  real: string[];
  common: string[];
  /** Counts for the build log. */
  stats: { real: number; fromFrequency: number; fromInflection: number; fromAllow: number; denied: number; common: number };
}

function clean(words: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const w of words) {
    const word = w.trim().toUpperCase();
    if (word && !word.startsWith("#")) out.add(word);
  }
  return out;
}

/** The words plus every regular inflection of them. */
function withInflections(words: Set<string>): Set<string> {
  const out = new Set(words);
  for (const w of words) for (const form of inflectionCandidates(w)) out.add(form);
  return out;
}

export function buildWordLists(sources: WordListSources): WordLists {
  const inRange = (w: string) => /^[A-Z]+$/.test(w) && w.length >= sources.minLength && w.length <= sources.maxLength;
  const offensiveEntries = clean(sources.offensive);
  const offensive = new Set([...offensiveEntries].flatMap((w) => [w, w + "S"]));
  const denyEntries = clean(sources.deny);
  const deny = withInflections(denyEntries);
  const allow = [...clean(sources.allow)].filter(inRange);

  const real = new Set<string>();
  for (const w of clean(sources.realWords)) if (inRange(w) && !offensive.has(w)) real.add(w);

  const counts = new Map<string, number>();
  const common = new Set<string>();
  const frequent: string[] = [];
  for (const [raw, count] of sources.frequencyRanked) {
    const w = raw.trim().toUpperCase();
    if (!counts.has(w)) counts.set(w, count);
    if (frequent.length >= sources.commonCutoff) continue;
    if (!real.has(w) || deny.has(w) || common.has(w)) continue;
    common.add(w);
    frequent.push(w);
  }

  let fromInflection = 0;
  for (const base of frequent) {
    for (const form of inflectionCandidates(base)) {
      const attested = (counts.get(form) ?? 0) >= sources.inflectionMinCount;
      if (attested && real.has(form) && !deny.has(form) && !common.has(form)) {
        common.add(form);
        fromInflection++;
      }
    }
  }

  // The allow file can rescue an inflection caught by the deny or offensive
  // filters, but never a word listed in either file directly.
  let fromAllow = 0;
  for (const w of allow) {
    if (offensiveEntries.has(w) || denyEntries.has(w)) continue;
    real.add(w);
    if (!common.has(w)) {
      common.add(w);
      fromAllow++;
    }
  }

  return {
    real: [...real].sort(),
    common: [...common].sort(),
    stats: {
      real: real.size,
      fromFrequency: frequent.length,
      fromInflection,
      fromAllow,
      denied: denyEntries.size,
      common: common.size,
    },
  };
}
