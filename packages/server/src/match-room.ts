import { DurableObject } from "cloudflare:workers";
import { generateMatchRounds, type Seat } from "@wordtrap/engine";
import { getDictionary } from "./dictionary.ts";
import {
  applyGuess,
  applySummarySeen,
  applyWord,
  credentials,
  join,
  newRecord,
  planRematch,
  rematchRecord,
  response,
  seatForRejoinSecret,
  seatForToken,
  type Failure,
  type MatchRecord,
  type MatchResponse,
  type RematchInfo,
  type Result,
  type SeatCredentials,
} from "./room.ts";
import { randomCode, JOIN_CODE_LENGTH } from "./codes.ts";
import type { Env } from "./index.ts";

type WithCreds = Result<{ credentials: SeatCredentials; match: MatchResponse }>;

const notFound: Failure = { ok: false, status: 404, message: "We couldn't find that game. Check the code." };
const forbidden: Failure = { ok: false, status: 403, message: "This device isn't part of that game." };

/**
 * One Durable Object per match, named by its join code. It holds the racks,
 * boards and secret words, and is the only place moves are validated.
 * Durable Objects run one request at a time, so moves can't race.
 */
export class MatchRoom extends DurableObject<Env> {
  private record: MatchRecord | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.record = (await ctx.storage.get<MatchRecord>("match")) ?? null;
    });
  }

  private async save(record: MatchRecord): Promise<void> {
    record.updatedAt = Date.now();
    this.record = record;
    await this.ctx.storage.put("match", record);
  }

  private withSeat(token: string | null): { record: MatchRecord; seat: Seat } | Failure {
    if (!this.record) return notFound;
    const seat = seatForToken(this.record, token);
    return seat === null ? forbidden : { record: this.record, seat };
  }

  private withCreds(record: MatchRecord, seat: Seat): WithCreds {
    return { ok: true, credentials: credentials(record, seat), match: response(record, seat) };
  }

  async create(code: string, creatorName: string): Promise<WithCreds | { ok: false; status: 409; exists: true; message: string }> {
    if (this.record) return { ok: false, status: 409, exists: true, message: "Code in use." };
    const rounds = generateMatchRounds(Math.random, getDictionary());
    const record = newRecord(code, rounds, creatorName, Date.now());
    await this.save(record);
    return this.withCreds(record, 0);
  }

  async createRematch(info: RematchInfo, names: [string, string]): Promise<{ ok: boolean }> {
    if (this.record) return { ok: false };
    const rounds = generateMatchRounds(Math.random, getDictionary());
    await this.save(rematchRecord(info, rounds, names, Date.now()));
    return { ok: true };
  }

  async join(name: string): Promise<WithCreds> {
    if (!this.record) return notFound;
    const r = join(this.record, name);
    if (!r.ok) return r;
    await this.save(r.record);
    return this.withCreds(r.record, 1);
  }

  async rejoin(secret: string): Promise<WithCreds> {
    if (!this.record) return notFound;
    const seat = seatForRejoinSecret(this.record, secret);
    if (seat === null) return { ok: false, status: 404, message: "That rejoin code doesn't match. Check it and try again." };
    return this.withCreds(this.record, seat);
  }

  async get(token: string | null): Promise<Result<{ match: MatchResponse }>> {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    return { ok: true, match: response(s.record, s.seat) };
  }

  async setWord(token: string | null, round: unknown, word: unknown): Promise<Result<{ match: MatchResponse }>> {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applyWord(s.record, s.seat, round, word, getDictionary());
    if (!r.ok) return r;
    await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat) };
  }

  async guess(
    token: string | null,
    round: unknown,
    guess: unknown,
  ): Promise<Result<{ match: MatchResponse; marks: boolean[]; caught: boolean; doneGuessing: boolean }>> {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applyGuess(s.record, s.seat, round, guess, getDictionary());
    if (!r.ok) return r;
    await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat), marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
  }

  async summarySeen(token: string | null, round: unknown): Promise<Result<{ match: MatchResponse }>> {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const r = applySummarySeen(s.record, s.seat, round);
    if (!r.ok) return r;
    if (r.record.state !== s.record.state) await this.save(r.record);
    return { ok: true, match: response(r.record, s.seat) };
  }

  /** Starts (or returns) the rematch, and hands this seat its credentials for it. */
  async rematch(token: string | null): Promise<WithCreds> {
    const s = this.withSeat(token);
    if ("ok" in s) return s;
    const { record, seat } = s;
    if (record.state.names[1] === null) return { ok: false, status: 409, message: "Your friend hasn't joined yet." };
    let info = record.rematch;
    if (!info) {
      const names: [string, string] = [record.state.names[0], record.state.names[1]];
      for (let attempt = 0; attempt < 5 && !info; attempt++) {
        const candidate = planRematch(randomCode(JOIN_CODE_LENGTH));
        const stub = this.env.MATCHES.get(this.env.MATCHES.idFromName(candidate.code));
        if ((await stub.createRematch(candidate, names)).ok) info = candidate;
      }
      if (!info) return { ok: false, status: 500, message: "Couldn't start a rematch. Try again." };
      await this.save({ ...record, rematch: info });
    }
    const target = this.env.MATCHES.get(this.env.MATCHES.idFromName(info.code));
    const r = await target.get(info.tokens[seat]);
    if (!r.ok) return r;
    return {
      ok: true,
      credentials: { code: info.code, seat, token: info.tokens[seat], rejoinCode: r.match.rejoinCode },
      // RPC results lose tuple types; the shape is the same MatchResponse.
      match: r.match as MatchResponse,
    };
  }
}
