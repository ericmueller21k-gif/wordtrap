import type { MatchState, Seat } from "@wordtrap/engine";
import type { MatchResponse, SeatCredentials } from "./api.ts";

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

/** An online match this device holds a seat in, with the last view seen (shown instantly on open). */
export interface OnlineMatch extends SeatCredentials {
  match: MatchResponse;
  updatedAt: number;
}

const ONLINE_KEY = "wordtrap.online-matches.v1";
const NAME_KEY = "wordtrap.name";

export function loadOnlineMatches(): OnlineMatch[] {
  try {
    const raw = localStorage.getItem(ONLINE_KEY);
    return raw ? (JSON.parse(raw) as OnlineMatch[]) : [];
  } catch {
    return [];
  }
}

export function saveOnlineMatches(matches: OnlineMatch[]): void {
  try {
    localStorage.setItem(ONLINE_KEY, JSON.stringify(matches));
  } catch {
    // See saveLocalMatches.
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Not important.
  }
}
