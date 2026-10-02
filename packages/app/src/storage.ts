import type { MatchState, Seat } from "@wordtrap/engine";

/** A pass-the-phone match, kept only on this device. */
export interface LocalMatch {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: MatchState;
  /** Who was holding the phone last. */
  activeSeat: Seat;
}

const KEY = "wordtrap.local-matches.v1";

export function loadLocalMatches(): LocalMatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalMatch[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalMatches(matches: LocalMatch[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(matches));
  } catch {
    // Storage can be unavailable (private mode, quota). The game still works for this visit.
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
