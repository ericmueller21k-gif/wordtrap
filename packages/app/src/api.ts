import type { MatchResponse, SeatCredentials } from "../../server/src/room.ts";

export type { MatchResponse, SeatCredentials };

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; status: number; message: string };

const OFFLINE = "Couldn't reach Word Trap. Check your connection and try again.";

async function call<T>(method: "GET" | "POST", path: string, token?: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, message: String(data.message ?? OFFLINE) };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, status: 0, message: OFFLINE };
  }
}

type WithCreds = { credentials: SeatCredentials; match: MatchResponse };
type WithMatch = { match: MatchResponse };

export const api = {
  create: (name: string) => call<WithCreds>("POST", "/matches", undefined, { name }),
  join: (code: string, name: string) => call<WithCreds>("POST", `/matches/${code}/join`, undefined, { name }),
  rejoin: (rejoinCode: string) => call<WithCreds>("POST", "/rejoin", undefined, { rejoinCode }),
  get: (code: string, token: string) => call<WithMatch>("GET", `/matches/${code}`, token),
  setWord: (code: string, token: string, round: number, word: string) =>
    call<WithMatch>("POST", `/matches/${code}/word`, token, { round, word }),
  guess: (code: string, token: string, round: number, guess: string) =>
    call<WithMatch & { marks: boolean[]; caught: boolean; doneGuessing: boolean }>("POST", `/matches/${code}/guess`, token, {
      round,
      guess,
    }),
  summarySeen: (code: string, token: string, round: number) =>
    call<WithMatch>("POST", `/matches/${code}/summary-seen`, token, { round }),
  rematch: (code: string, token: string) => call<WithCreds>("POST", `/matches/${code}/rematch`, token, {}),
};
