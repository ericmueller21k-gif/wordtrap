import { describe, expect, it } from "vitest";
import { buildWordLists, inflectionCandidates } from "../src/index.ts";

describe("inflectionCandidates", () => {
  it.each([
    ["STOP", "STOPPED"],
    ["STOP", "STOPPING"],
    ["BIG", "BIGGEST"],
    ["CRY", "CRIES"],
    ["CRY", "CRIED"],
    ["HAPPY", "HAPPIER"],
    ["MAKE", "MAKING"],
    ["BAKE", "BAKED"],
    ["LATE", "LATEST"],
    ["DIE", "DYING"],
    ["BOX", "BOXES"],
    ["PLAY", "PLAYED"],
  ])("%s -> %s", (base, form) => {
    expect(inflectionCandidates(base)).toContain(form);
  });

  it("does not double W, X or Y", () => {
    expect(inflectionCandidates("BOX")).not.toContain("BOXXED");
    expect(inflectionCandidates("PLAY")).not.toContain("PLAYYED");
  });
});

describe("buildWordLists", () => {
  const base = {
    realWords: ["the", "cat", "cats", "dog", "dogs", "running", "run", "zebra", "rue", "ruing", "ox", "elephants", "slur", "slurs", "bob", "bobs"],
    frequencyRanked: ["the", "ox", "cat", "run", "dog", "slur", "bob", "zebra", "rue", "cats", "running", "dogs"].map(
      (w, i) => [w, 100 - i] as const,
    ),
    allow: [] as string[],
    deny: [] as string[],
    offensive: [] as string[],
    commonCutoff: 3,
    inflectionMinCount: 0,
    minLength: 3,
    maxLength: 7,
  };

  it("takes the most frequent in-range real words up to the cutoff, plus their real inflections", () => {
    const { real, common } = buildWordLists(base);
    expect(common).toEqual(["CAT", "CATS", "RUN", "RUNNING", "THE"]);
    expect(real).not.toContain("OX");
    expect(real).not.toContain("ELEPHANTS");
  });

  it("can require inflections to be attested in the corpus", () => {
    const counted = { ...base, frequencyRanked: [["cat", 50], ["run", 40], ["the", 30], ["cats", 25], ["running", 5]] as const };
    expect(buildWordLists({ ...counted, inflectionMinCount: 20 }).common).toEqual(["CAT", "CATS", "RUN", "THE"]);
  });

  it("applies deny (with inflections), allow, and the offensive list", () => {
    const { real, common } = buildWordLists({
      ...base,
      commonCutoff: 100,
      deny: ["cat", "# a comment"],
      allow: ["zebra", "cats"],
      offensive: ["slur"],
    });
    expect(common).not.toContain("CAT");
    expect(common).toContain("CATS"); // rescued by allow
    expect(common).toContain("ZEBRA");
    expect(common).not.toContain("SLUR");
    expect(real).not.toContain("SLUR");
    expect(real).not.toContain("SLURS");
  });

  it("never lets allow override a direct deny entry", () => {
    const { common } = buildWordLists({ ...base, commonCutoff: 100, deny: ["bob"], allow: ["bob"] });
    expect(common).not.toContain("BOB");
    expect(common).not.toContain("BOBS");
  });
});
