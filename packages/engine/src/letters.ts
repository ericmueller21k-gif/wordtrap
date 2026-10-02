import type { Rack } from "./types.ts";

/** Upper-cases and trims a word. Game words are always A-Z upper case. */
export function normalizeWord(word: string): string {
  return word.trim().toUpperCase();
}

export function isAlphabetic(word: string): boolean {
  return /^[A-Z]+$/.test(word);
}

export function letterCounts(letters: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/** True if `word` uses each rack tile at most once. */
export function canMakeFromRack(word: string, rack: Rack): boolean {
  const available = letterCounts(rack);
  for (const ch of word) {
    const left = available.get(ch) ?? 0;
    if (left === 0) return false;
    available.set(ch, left - 1);
  }
  return true;
}
