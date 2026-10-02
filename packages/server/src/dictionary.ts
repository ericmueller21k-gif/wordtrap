import { Dictionary } from "@wordtrap/engine";
import commonText from "../../engine/data/words/common.txt";
import realText from "../../engine/data/words/real.txt";

const parse = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

let dictionary: Dictionary | null = null;

/** Parsed once per isolate, on first use. */
export function getDictionary(): Dictionary {
  dictionary ??= new Dictionary(parse(realText), parse(commonText));
  return dictionary;
}
