/**
 * One-off: trims FrequencyWords' en_full.txt (20 MB, not committed) down to
 * the words the game can use: 3-7 letters and in the ENABLE list, keeping the
 * original frequency order and counts. Output: data/sources/frequency-3to7.txt
 *
 *   curl -O https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt
 *   npx tsx packages/engine/scripts/extract-frequency.ts en_full.txt
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [input] = process.argv.slice(2);
if (!input) throw new Error("Usage: extract-frequency.ts <path to en_full.txt>");

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
const enable = new Set(readFileSync(dataDir + "sources/enable1.txt", "utf8").split("\n").map((w) => w.trim()));

const out: string[] = [];
const seen = new Set<string>();
for (const line of readFileSync(input, "utf8").split("\n")) {
  const [word, count] = line.trim().split(" ");
  if (!word || !count || seen.has(word)) continue;
  if (word.length < 3 || word.length > 7 || !enable.has(word)) continue;
  seen.add(word);
  out.push(`${word} ${count}`);
}

writeFileSync(
  dataDir + "sources/frequency-3to7.txt",
  "# Derived from FrequencyWords en_full.txt (OpenSubtitles 2018), CC BY-SA 4.0, by scripts/extract-frequency.ts.\n" +
    "# Only 3-7 letter words that are in enable1.txt. Format: word count, most frequent first.\n" +
    out.join("\n") +
    "\n",
);
console.log(`${out.length} words`);
