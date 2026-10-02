/**
 * Pure logic for one online match: seats, tokens, rejoin codes and the
 * engine's match flow. The Durable Object in match-room.ts only stores the
 * record and calls these functions, so this file is unit-testable in Node.
 */
import {
  createMatch,
  joinMatch,
  markSummarySeen,
  setWord,
  submitGuess,
  viewFor,
  type Dictionary,
  type MatchState,
  type PlayerView,
  type Round,
  type Seat,
} from "@wordtrap/engine";
import { cryptoBytes, formatRejoinCode, randomCode, randomToken, REJOIN_SECRET_LENGTH, type RandomBytes } from "./codes.ts";

export interface RematchInfo {
  code: string;
  tokens: [string, string];
  rejoinSecrets: [string, string];
}

export interface MatchRecord {
  code: string;
  state: MatchState;
  tokens: [string, string | null];
  rejoinSecrets: [string, string | null];
  createdAt: number;
  updatedAt: number;
  rematch: RematchInfo | null;
}

/** What a seat's device keeps: enough to reopen the match and act in it. */
export interface SeatCredentials {
  code: string;
  seat: Seat;
  token: string;
  rejoinCode: string;
}

export interface MatchResponse {
  code: string;
  seat: Seat;
  rejoinCode: string;
  /** Set once either player has asked for a rematch. */
  rematchCode: string | null;
  view: PlayerView;
}

export type Failure = { ok: false; status: number; message: string };
export type Result<T> = ({ ok: true } & T) | Failure;

const fail = (status: number, message: string): Failure => ({ ok: false, status, message });

export const NAME_MAX = 16;

export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return name.length ? name : null;
}

function newSecret(bytes: RandomBytes) {
  return randomCode(REJOIN_SECRET_LENGTH, bytes);
}

export function credentials(record: MatchRecord, seat: Seat): SeatCredentials {
  return {
    code: record.code,
    seat,
    token: record.tokens[seat]!,
    rejoinCode: formatRejoinCode(record.code, record.rejoinSecrets[seat]!),
  };
}

export function response(record: MatchRecord, seat: Seat): MatchResponse {
  return {
    code: record.code,
    seat,
    rejoinCode: formatRejoinCode(record.code, record.rejoinSecrets[seat]!),
    rematchCode: record.rematch?.code ?? null,
    view: viewFor(record.state, seat),
  };
}

export function newRecord(
  code: string,
  rounds: Round[],
  creatorName: string,
  now: number,
  bytes: RandomBytes = cryptoBytes,
): MatchRecord {
  return {
    code,
    state: createMatch(rounds, creatorName),
    tokens: [randomToken(bytes), null],
    rejoinSecrets: [newSecret(bytes), null],
    createdAt: now,
    updatedAt: now,
    rematch: null,
  };
}

/** A rematch starts with both seats filled, using credentials the old match hands out. */
export function rematchRecord(info: RematchInfo, rounds: Round[], names: [string, string], now: number): MatchRecord {
  return {
    code: info.code,
    state: createMatch(rounds, names[0], names[1]),
    tokens: [...info.tokens],
    rejoinSecrets: [...info.rejoinSecrets],
    createdAt: now,
    updatedAt: now,
    rematch: null,
  };
}

export function join(record: MatchRecord, name: string, bytes: RandomBytes = cryptoBytes): Result<{ record: MatchRecord }> {
  if (record.state.names[1] !== null) return fail(409, "That game already has two players.");
  return {
    ok: true,
    record: {
      ...record,
      state: joinMatch(record.state, name),
      tokens: [record.tokens[0], randomToken(bytes)],
      rejoinSecrets: [record.rejoinSecrets[0], newSecret(bytes)],
    },
  };
}

export function seatForToken(record: MatchRecord, token: string | null): Seat | null {
  if (!token) return null;
  if (record.tokens[0] === token) return 0;
  if (record.tokens[1] === token) return 1;
  return null;
}

export function seatForRejoinSecret(record: MatchRecord, secret: string): Seat | null {
  if (record.rejoinSecrets[0] === secret) return 0;
  if (record.rejoinSecrets[1] === secret) return 1;
  return null;
}

export function applyWord(
  record: MatchRecord,
  seat: Seat,
  round: unknown,
  word: unknown,
  dictionary: Dictionary,
): Result<{ record: MatchRecord }> {
  if (typeof round !== "number" || typeof word !== "string") return fail(400, "Bad request.");
  const r = setWord(record.state, seat, round, word.toUpperCase(), dictionary);
  if (!r.ok) return fail(r.problem === "not_your_turn" ? 409 : 422, r.message);
  return { ok: true, record: { ...record, state: r.state } };
}

export function applyGuess(
  record: MatchRecord,
  seat: Seat,
  round: unknown,
  guess: unknown,
  dictionary: Dictionary,
): Result<{ record: MatchRecord; marks: boolean[]; caught: boolean; doneGuessing: boolean }> {
  if (typeof round !== "number" || typeof guess !== "string") return fail(400, "Bad request.");
  const r = submitGuess(record.state, seat, round, guess.toUpperCase(), dictionary);
  if (!r.ok) return fail(r.problem === "not_your_turn" ? 409 : 422, r.message);
  return { ok: true, record: { ...record, state: r.state }, marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
}

export function applySummarySeen(record: MatchRecord, seat: Seat, round: unknown): Result<{ record: MatchRecord }> {
  if (typeof round !== "number") return fail(400, "Bad request.");
  return { ok: true, record: { ...record, state: markSummarySeen(record.state, seat, round) } };
}

export function planRematch(newCode: string, bytes: RandomBytes = cryptoBytes): RematchInfo {
  return {
    code: newCode,
    tokens: [randomToken(bytes), randomToken(bytes)],
    rejoinSecrets: [newSecret(bytes), newSecret(bytes)],
  };
}
