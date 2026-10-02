/**
 * Node-only helpers for loading the built word lists from disk. Kept out of
 * index.ts so the core engine stays free of I/O and runs in any environment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Dictionary } from "./dictionary.ts";

export const WORDS_DIR = fileURLToPath(new URL("../data/words/", import.meta.url));

export function readWordFile(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function loadDictionary(dir: string = WORDS_DIR): Dictionary {
  return new Dictionary(readWordFile(`${dir}/real.txt`), readWordFile(`${dir}/common.txt`));
}
