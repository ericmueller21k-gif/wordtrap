import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  createMatch,
  Dictionary,
  isMatchFinished,
  joinMatch,
  markSummarySeen,
  matchTotals,
  setWord,
  stageFor,
  submitGuess,
  viewFor,
  type MatchState,
  type Round,
} from "../src/index.ts";

const round: Round = {
  rack: ["Q", "U", "I", "T", "H", "E", "S"],
  board: { letterSquare: { slot: 2, multiplier: 3 }, wordSquare: { slot: 5, multiplier: 2 } },
};
const words = ["HIT", "THIS", "THUS", "SHUT", "QUIT", "QUITE", "QUIET", "QUEST", "QUITS", "SUITE", "HITS"];
const dict = new Dictionary(words, words);

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
}

function newMatch(rounds = 2): MatchState {
  return joinMatch(createMatch(Array.from({ length: rounds }, () => round), "Eric"), "Sam");
}

describe("match flow", () => {
  it("lets both set words in either order, then guess", () => {
    let s = newMatch();
    expect(stageFor(s, 0)).toEqual({ kind: "set", round: 0 });
    s = ok(setWord(s, 1, 0, "QUITE", dict)).state;
    expect(stageFor(s, 1)).toEqual({ kind: "waitingForWord", round: 0 });
    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    expect(stageFor(s, 0)).toEqual({ kind: "guess", round: 0 });
    expect(stageFor(s, 1)).toEqual({ kind: "guess", round: 0 });
  });

  it("lets the creator set a word before the friend joins", () => {
    let s = createMatch([round], "Eric");
    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    expect(stageFor(s, 0)).toEqual({ kind: "waitingForWord", round: 0 });
    expect(viewFor(s, 0).opponentName).toBeNull();
  });

  it("rejects out-of-turn actions and invalid words without changing state", () => {
    const s = newMatch();
    expect(setWord(s, 0, 1, "THIS", dict)).toMatchObject({ ok: false, problem: "not_your_turn" });
    expect(submitGuess(s, 0, 0, "THIS", dict)).toMatchObject({ ok: false, problem: "not_your_turn" });
    expect(setWord(s, 0, 0, "ZZZ", dict)).toMatchObject({ ok: false, problem: "no_tiles" });
  });

  it("ends guessing on a catch or after the last guess, then waits for the other player", () => {
    let s = newMatch();
    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    s = ok(setWord(s, 1, 0, "QUITE", dict)).state;

    // Rejected guesses don't use a try.
    expect(submitGuess(s, 0, 0, "HIT", dict)).toMatchObject({ ok: false, problem: "wrong_length" });

    const g1 = ok(submitGuess(s, 0, 0, "QUIET", dict));
    expect(g1.marks).toEqual([true, true, true, false, false]);
    expect(g1.doneGuessing).toBe(false);
    s = g1.state;
    expect(submitGuess(s, 0, 0, "QUIET", dict)).toMatchObject({ ok: false, problem: "repeated" });
    const g2 = ok(submitGuess(s, 0, 0, "QUITS", dict));
    expect(g2.caught).toBe(false);
    expect(g2.doneGuessing).toBe(true); // 2 guesses per word
    s = g2.state;

    // Eric sees Sam's word, but the next round waits for Sam to finish guessing.
    expect(viewFor(s, 0).rounds[0]!.opponentWord).toBe("QUITE");
    expect(stageFor(s, 0)).toEqual({ kind: "waitingForGuesses", round: 0 });
    expect(setWord(s, 0, 1, "HIT", dict)).toMatchObject({ ok: false, problem: "not_your_turn" });

    const g3 = ok(submitGuess(s, 1, 0, "THIS", dict));
    expect(g3.caught).toBe(true);
    s = g3.state;
    expect(stageFor(s, 0)).toEqual({ kind: "set", round: 1 });
    expect(stageFor(s, 1)).toEqual({ kind: "set", round: 1 });

    // Round 1: Eric's THIS caught (scores nothing), Sam's QUITE survived (32 + 5 bonus).
    expect(viewFor(s, 0).rounds[0]!.result).toEqual({ scores: [0, 37], caught: [true, false] });
    expect(viewFor(s, 1).rounds[0]!.result).toEqual({ scores: [37, 0], caught: [false, true] });
    expect(matchTotals(s)).toEqual([0, 37]);
  });

  it("with waitForRoundEnd off (the spec's flow), lets a player set their next word straight away", () => {
    const spec = { ...DEFAULT_SETTINGS, waitForRoundEnd: false };
    let s = newMatch();
    s = ok(setWord(s, 0, 0, "THIS", dict, spec)).state;
    s = ok(setWord(s, 1, 0, "QUITE", dict, spec)).state;
    s = ok(submitGuess(s, 0, 0, "QUITE", dict, spec)).state;
    expect(stageFor(s, 0, spec)).toEqual({ kind: "set", round: 1 });
    s = ok(setWord(s, 0, 1, "HIT", dict, spec)).state;
    expect(stageFor(s, 0, spec)).toEqual({ kind: "waitingForWord", round: 1 });
  });

  it("finishes after the last round", () => {
    let s = newMatch(1);
    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    s = ok(setWord(s, 1, 0, "HIT", dict)).state;
    s = ok(submitGuess(s, 0, 0, "HIT", dict)).state;
    expect(stageFor(s, 0)).toEqual({ kind: "waitingForGuesses", round: 0 });
    s = ok(submitGuess(s, 1, 0, "SHUT", dict)).state;
    s = ok(submitGuess(s, 1, 0, "THUS", dict)).state;
    expect(isMatchFinished(s)).toBe(true);
    expect(stageFor(s, 0)).toEqual({ kind: "finished" });
    expect(matchTotals(s)).toEqual([15 + 2, 0]);
  });

  it("tracks dismissed summaries per seat, only for complete rounds", () => {
    let s = newMatch(1);
    expect(markSummarySeen(s, 0, 0)).toBe(s);
    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    s = ok(setWord(s, 1, 0, "HIT", dict)).state;
    s = ok(submitGuess(s, 0, 0, "HIT", dict)).state;
    s = ok(submitGuess(s, 1, 0, "THIS", dict)).state;
    s = markSummarySeen(s, 1, 0);
    expect(s.summariesSeen).toEqual([0, 1]);
  });
});

describe("visibility (spec.md: What each player may see)", () => {
  it("never shows the other word before this player finishes guessing", () => {
    let s = newMatch();
    s = ok(setWord(s, 1, 0, "QUITE", dict)).state;
    const before = viewFor(s, 0);
    expect(JSON.stringify(before)).not.toContain("QUITE");
    expect(before.rounds[0]!.opponentSubmitted).toBe(true);
    expect(before.rounds[0]!.clue).toBeNull();

    s = ok(setWord(s, 0, 0, "THIS", dict)).state;
    const guessing = viewFor(s, 0);
    expect(JSON.stringify(guessing)).not.toContain("QUITE");
    expect(guessing.rounds[0]!.clue).toEqual({ length: 5, tileScore: 32 });

    s = ok(submitGuess(s, 1, 0, "SHUT", dict)).state;
    // Sam's guesses at Eric's word stay hidden from Eric until both finish.
    expect(viewFor(s, 0).rounds[0]!.opponentGuesses).toBeNull();
    expect(JSON.stringify(viewFor(s, 0))).not.toContain("SHUT");
  });

  it("hides racks for rounds not yet reached", () => {
    expect(viewFor(newMatch(5), 0).rounds).toHaveLength(1);
  });
});
