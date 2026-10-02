import { describe, expect, it } from "vitest";
import { Dictionary, type Round } from "@wordtrap/engine";
import { CODE_ALPHABET, isJoinCode, normalizeCode, parseRejoinCode, randomCode } from "../src/codes.ts";
import {
  applyGuess,
  applyWord,
  cleanName,
  credentials,
  join,
  newRecord,
  planRematch,
  rematchRecord,
  response,
  seatForRejoinSecret,
  seatForToken,
} from "../src/room.ts";

const round: Round = {
  rack: ["Q", "U", "I", "T", "H", "E", "S"],
  board: { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } },
};
const words = ["HIT", "THIS", "THUS", "SHUT", "QUIT", "QUITE"];
const dict = new Dictionary(words, words);

describe("codes", () => {
  it("draws codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const c = randomCode(6);
      expect(c).toHaveLength(6);
      expect([...c].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
      expect(isJoinCode(c)).toBe(true);
    }
    expect(CODE_ALPHABET).not.toMatch(/[ILO01]/);
  });

  it("parses rejoin codes leniently", () => {
    expect(parseRejoinCode("k7pm2q-w3xrt9")).toEqual({ code: "K7PM2Q", secret: "W3XRT9" });
    expect(parseRejoinCode("K7PM 2QW3 XRT9")).toEqual({ code: "K7PM2Q", secret: "W3XRT9" });
    expect(parseRejoinCode("K7PM2Q")).toBeNull();
    expect(parseRejoinCode("K7PM2Q-W3XRT0")).toBeNull();
    expect(normalizeCode(" ab-cd ")).toBe("ABCD");
  });
});

describe("cleanName", () => {
  it("trims, collapses spaces and caps length", () => {
    expect(cleanName("  Sam   Lee ")).toBe("Sam Lee");
    expect(cleanName("A".repeat(40))).toHaveLength(16);
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(42)).toBeNull();
  });
});

describe("match record", () => {
  const created = newRecord("K7PM2Q", [round], "Eric", 0);

  it("gives each seat a token and a rejoin code", () => {
    const joined = join(created, "Sam");
    if (!joined.ok) throw new Error();
    const r = joined.record;
    expect(seatForToken(r, r.tokens[0])).toBe(0);
    expect(seatForToken(r, r.tokens[1])).toBe(1);
    expect(seatForToken(r, "nope")).toBeNull();
    expect(seatForToken(r, null)).toBeNull();
    const creds = credentials(r, 1);
    expect(creds.rejoinCode).toMatch(/^K7PM2Q-[A-Z2-9]{6}$/);
    expect(seatForRejoinSecret(r, creds.rejoinCode.slice(7))).toBe(1);
    expect(join(r, "Third")).toMatchObject({ ok: false, status: 409 });
  });

  it("validates moves on the server with the spec's messages", () => {
    const joined = join(created, "Sam");
    if (!joined.ok) throw new Error();
    expect(applyWord(joined.record, 0, 0, "ZEST", dict)).toMatchObject({ ok: false, status: 422, message: "You don't have the tiles for that." });
    expect(applyWord(joined.record, 0, 1, "THIS", dict)).toMatchObject({ ok: false, status: 409 });
    expect(applyWord(joined.record, 0, "0", "THIS", dict)).toMatchObject({ ok: false, status: 400 });
    const a = applyWord(joined.record, 0, 0, "this", dict);
    if (!a.ok) throw new Error();
    // Sam's view doesn't contain Eric's word yet.
    expect(JSON.stringify(response(a.record, 1))).not.toContain("THIS");
    const b = applyWord(a.record, 1, 0, "QUITE", dict);
    if (!b.ok) throw new Error();
    const g = applyGuess(b.record, 1, 0, "THIS", dict);
    expect(g).toMatchObject({ ok: true, caught: true, doneGuessing: true });
  });

  it("starts a rematch with both seats filled", () => {
    const info = planRematch("ABCDEF");
    const r = rematchRecord(info, [round], ["Eric", "Sam"], 0);
    expect(r.state.names).toEqual(["Eric", "Sam"]);
    expect(seatForToken(r, info.tokens[1])).toBe(1);
  });
});
