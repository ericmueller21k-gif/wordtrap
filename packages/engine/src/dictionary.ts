import type { Rack } from "./types.ts";

const A = "A".charCodeAt(0);

function countVector(word: string): Uint8Array {
  const v = new Uint8Array(26);
  for (let i = 0; i < word.length; i++) v[word.charCodeAt(i) - A]!++;
  return v;
}

/**
 * The two word lists from spec.md: a large "real word" list and the smaller
 * "common" list (a subset of it) that is actually playable. Words are stored
 * upper case. Build the lists with scripts/build-dictionary.ts.
 */
export class Dictionary {
  private readonly real: ReadonlySet<string>;
  private readonly common: ReadonlySet<string>;
  private readonly commonEntries: readonly { word: string; counts: Uint8Array }[];

  constructor(realWords: Iterable<string>, commonWords: Iterable<string>) {
    const common = new Set<string>();
    for (const w of commonWords) common.add(w.toUpperCase());
    const real = new Set<string>(common);
    for (const w of realWords) real.add(w.toUpperCase());
    this.real = real;
    this.common = common;
    this.commonEntries = [...common].sort().map((word) => ({ word, counts: countVector(word) }));
  }

  isCommon(word: string): boolean {
    return this.common.has(word);
  }

  isReal(word: string): boolean {
    return this.real.has(word);
  }

  get commonSize(): number {
    return this.common.size;
  }

  get realSize(): number {
    return this.real.size;
  }

  /** Every common word that can be made from the rack, alphabetical. */
  playableWords(rack: Rack): string[] {
    const available = countVector(rack.join(""));
    const out: string[] = [];
    outer: for (const { word, counts } of this.commonEntries) {
      if (word.length > rack.length) continue;
      for (let i = 0; i < 26; i++) {
        if (counts[i]! > available[i]!) continue outer;
      }
      out.push(word);
    }
    return out;
  }
}
