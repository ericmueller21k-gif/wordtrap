/**
 * Milestone 2 balance report. Deals thousands of racks and boards, lists every
 * playable word, measures how many words share each clue, and how often the
 * simple guesser (random among words fitting the clue and feedback) catches a
 * word. Writes reports/balance.md.
 *
 *   npm run balance                      # 5000 deals, seed 1
 *   npm run balance -- --deals 20000 --seed 7 --words words.csv
 *
 * --words writes every deal's playable words as CSV (large; not committed).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SETTINGS,
  catchProbabilities,
  catchReward,
  drawRack,
  generateBoard,
  generateRack,
  isRackPlayable,
  lengthBonus,
  mulberry32,
  tileScore,
  type Board,
  type Rack,
  type Settings,
} from "../src/index.ts";
import { loadDictionary } from "../src/node.ts";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DEALS = Number(arg("deals") ?? 5000);
const SEED = Number(arg("seed") ?? 1);
const WORDS_CSV = arg("words");
const GUESS_OPTIONS = [1, 2, 3, 4];

const settings: Settings = DEFAULT_SETTINGS;
const dict = loadDictionary();
const lengths = Array.from({ length: settings.rackSize - settings.minWordLength + 1 }, (_, i) => i + settings.minWordLength);

interface WordRow {
  word: string;
  length: number;
  tile: number;
  /** Number of playable words sharing this word's clue, itself included. */
  group: number;
  /** Catch probability by number of guesses allowed. */
  p: Record<number, number>;
}

interface Deal {
  rack: Rack;
  board: Board;
  words: WordRow[];
}

function analyseDeal(rack: Rack, board: Board): Deal {
  const playable = dict
    .playableWords(rack)
    .filter((w) => w.length >= settings.minWordLength && w.length <= settings.rackSize);
  const groups = new Map<string, string[]>();
  const tiles = new Map<string, number>();
  for (const w of playable) {
    const t = tileScore(w, board, settings);
    tiles.set(w, t);
    const key = `${w.length}:${t}`;
    const g = groups.get(key);
    if (g) g.push(w);
    else groups.set(key, [w]);
  }
  const words: WordRow[] = [];
  for (const group of groups.values()) {
    const byGuesses = GUESS_OPTIONS.map((k) => [k, catchProbabilities(group, k)] as const);
    for (const w of group) {
      const p: Record<number, number> = {};
      for (const [k, probs] of byGuesses) p[k] = probs.get(w)!;
      words.push({ word: w, length: w.length, tile: tiles.get(w)!, group: group.length, p });
    }
  }
  return { rack, board, words };
}

// Payoffs for a word under a given rule variant.
interface Variant {
  name: string;
  guesses: number;
  catchFraction: number;
  bonus: Record<number, number>;
}
const ownerEV = (w: WordRow, v: Variant) => (1 - w.p[v.guesses]!) * (w.tile + (v.bonus[w.length] ?? 0));
const guesserEV = (w: WordRow, v: Variant) => w.p[v.guesses]! * Math.ceil(w.tile * v.catchFraction);
const netEV = (w: WordRow, v: Variant) => ownerEV(w, v) - guesserEV(w, v);

const describeBonus = (b: Record<number, number>) =>
  Object.keys(b).length ? Object.values(b).map((n) => `+${n}`).join("/") : "no";
const describe = (v: Omit<Variant, "name">) =>
  `${v.guesses} guess${v.guesses === 1 ? "" : "es"}, ${v.catchFraction * 100}% catch, ${describeBonus(v.bonus)} length bonus`;
const base = {
  guesses: settings.guessesPerWord,
  catchFraction: settings.catchRewardFraction,
  bonus: { ...settings.lengthBonus },
};
const current: Variant = { ...base, name: `**Current settings** (${describe(base)})` };
const alternatives: Omit<Variant, "name">[] = [
  { ...base, guesses: 1 },
  { ...base, guesses: 2 },
  { ...base, guesses: 3 },
  { ...base, guesses: 4 },
  { ...base, bonus: {} },
  { ...base, bonus: { 5: 2, 6: 8, 7: 15 } },
  { ...base, catchFraction: 1 },
];
const variants: Variant[] = [
  current,
  ...alternatives
    .map((v) => ({ ...v, name: describe(v) }))
    .filter((v) => describe(v) !== describe(base)),
];

// ---- Deal ----
const started = performance.now();
const rng = mulberry32(SEED);
const deals: Deal[] = [];
for (let i = 0; i < DEALS; i++) {
  const rack = generateRack(rng, dict, settings);
  deals.push(analyseDeal(rack, generateBoard(rng, settings)));
}
const filterRng = mulberry32(SEED + 1);
let passed = 0;
const FILTER_SAMPLE = 5000;
for (let i = 0; i < FILTER_SAMPLE; i++) if (isRackPlayable(drawRack(filterRng, settings), dict, settings)) passed++;
const seconds = ((performance.now() - started) / 1000).toFixed(1);

// ---- Aggregate ----
const all = deals.flatMap((d) => d.words);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const f1 = (x: number) => x.toFixed(1);
const byLength = (L: number) => all.filter((w) => w.length === L);

const lines: string[] = [];
const out = (s = "") => lines.push(s);
const table = (head: string[], rows: (string | number)[][]) => {
  out(`| ${head.join(" | ")} |`);
  out(`| ${head.map(() => "---").join(" | ")} |`);
  for (const r of rows) out(`| ${r.join(" | ")} |`);
  out();
};

out("# Word Trap balance report");
out();
out(
  `${DEALS.toLocaleString("en-US")} deals (seed ${SEED}) with the settings in \`packages/engine/src/settings.ts\` ` +
    `and ${dict.commonSize.toLocaleString("en-US")} common words. Generated by \`npm run balance\` in ${seconds}s.`,
);
out();
out(
  "**How to read this.** Each playable word on each deal is treated as a possible secret. Its *clue group* is every " +
    "playable word with the same length and tile score: the words a guesser can't tell apart from the clue alone. " +
    "*Catch rate* is the exact chance the simple guesser (random among words still fitting the clue and the feedback) " +
    "catches it. Every playable word counts equally, so these are averages over all words, not over words a " +
    "thoughtful player would pick.",
);
out();

out("## Racks");
out();
const counts = deals.map((d) => d.words.length);
table(
  ["Measure", "Value"],
  [
    ["Raw draws passing the rack filter", pct(passed / FILTER_SAMPLE)],
    ["Playable words per rack: median", quantile(counts, 0.5)],
    ["Playable words per rack: 10th / 90th percentile", `${quantile(counts, 0.1)} / ${quantile(counts, 0.9)}`],
    ["Playable words per rack: max", Math.max(...counts)],
  ],
);

out("## Clues and catches by word length");
out();
table(
  ["Length", "Words per rack", "Avg tile score", "Avg clue group", "Unique clue (caught for sure)", `Catch rate (${current.guesses} guesses)`, "Owner EV", "Catcher EV", "Net EV"],
  lengths.map((L) => {
    const ws = byLength(L);
    return [
      L,
      f1(ws.length / DEALS),
      f1(mean(ws.map((w) => w.tile))),
      f1(mean(ws.map((w) => w.group))),
      pct(mean(ws.map((w) => (w.group === 1 ? 1 : 0)))),
      pct(mean(ws.map((w) => w.p[current.guesses]!))),
      f1(mean(ws.map((w) => ownerEV(w, current)))),
      f1(mean(ws.map((w) => guesserEV(w, current)))),
      f1(mean(ws.map((w) => netEV(w, current)))),
    ];
  }),
);
out(
  "*Owner EV* is the expected points the word earns its owner, (1 − catch rate) × (tile score + length bonus). " +
    "*Catcher EV* is the expected points it hands the opponent. *Net EV* is the difference, which is what matters for winning.",
);
out();

out("### Clue group sizes");
out();
const buckets: [string, (n: number) => boolean][] = [
  ["1", (n) => n === 1],
  ["2", (n) => n === 2],
  ["3", (n) => n === 3],
  ["4-5", (n) => n >= 4 && n <= 5],
  ["6-10", (n) => n >= 6 && n <= 10],
  ["11+", (n) => n >= 11],
];
table(
  ["Length", ...buckets.map(([b]) => `${b} words`)],
  lengths.map((L) => {
    const ws = byLength(L);
    return [L, ...buckets.map(([, test]) => pct(ws.filter((w) => test(w.group)).length / Math.max(1, ws.length)))];
  }),
);

out("## Number of guesses");
out();
table(
  ["Length", ...GUESS_OPTIONS.map((k) => `Catch rate, ${k} guess${k === 1 ? "" : "es"}`)],
  [
    ...lengths.map((L) => [L, ...GUESS_OPTIONS.map((k) => pct(mean(byLength(L).map((w) => w.p[k]!))))]),
    ["All", ...GUESS_OPTIONS.map((k) => pct(mean(all.map((w) => w.p[k]!))))],
  ],
);

out("## Which word should a player set?");
out();
out(
  "For each deal, the word with the highest net EV against the simple guesser, under each rule variant. " +
    "This shows which lengths the scoring rewards. A healthy game spreads the best word across several lengths.",
);
out();
table(
  ["Variant", ...lengths.map((L) => `${L} letters`), "Avg net EV of best word"],
  variants.map((v) => {
    const best = deals.map((d) => d.words.reduce((a, b) => (netEV(b, v) > netEV(a, v) ? b : a)));
    return [
      v.name,
      ...lengths.map((L) => pct(best.filter((w) => w.length === L).length / DEALS)),
      f1(mean(best.map((w) => netEV(w, v)))),
    ];
  }),
);

out("## Example deals");
out();
for (const d of deals.slice(0, 3)) {
  const { letterSquare: ls, wordSquare: ws } = d.board;
  out(`**Rack ${d.rack.join(" ")}**, ${ls.multiplier}L on slot ${ls.slot}, ${ws.multiplier}W on slot ${ws.slot}. ${d.words.length} playable words:`);
  out();
  const groups = new Map<string, WordRow[]>();
  for (const w of d.words) {
    const key = `${w.length} letters, ${w.tile}`;
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  const sorted = [...groups.entries()].sort(([, a], [, b]) => a[0]!.length - b[0]!.length || a[0]!.tile - b[0]!.tile);
  table(
    ["Clue", "Words (catch rate)"],
    sorted.map(([clue, ws]) => [clue, ws.map((w) => `${w.word} (${pct(w.p[current.guesses]!)})`).join(", ")]),
  );
}

const reportDir = fileURLToPath(new URL("../../../reports/", import.meta.url));
mkdirSync(reportDir, { recursive: true });
writeFileSync(reportDir + "balance.md", lines.join("\n"));
console.log(`Wrote reports/balance.md (${DEALS} deals, ${seconds}s)`);

if (WORDS_CSV) {
  const csv = [`deal,rack,letter_square,word_square,word,length,tile_score,length_bonus,clue_group,catch_rate_${current.guesses},catch_reward`];
  deals.forEach((d, i) => {
    const ls = `${d.board.letterSquare.multiplier}L@${d.board.letterSquare.slot}`;
    const ws = `${d.board.wordSquare.multiplier}W@${d.board.wordSquare.slot}`;
    for (const w of d.words) {
      csv.push(
        [i + 1, d.rack.join(""), ls, ws, w.word, w.length, w.tile, lengthBonus(w.length, settings), w.group, w.p[current.guesses]!.toFixed(4), catchReward(w.tile, settings)].join(","),
      );
    }
  });
  writeFileSync(WORDS_CSV, csv.join("\n") + "\n");
  console.log(`Wrote ${WORDS_CSV} (${csv.length - 1} rows)`);
}
