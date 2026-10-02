import { Dictionary } from "@wordtrap/engine";
import commonUrl from "../../engine/data/words/common.txt?url";
import realUrl from "../../engine/data/words/real.txt?url";

const parse = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

let loading: Promise<Dictionary> | null = null;

/** Fetches both word lists once. They're static, hashed assets, so the browser caches them. */
export function loadDictionary(): Promise<Dictionary> {
  loading ??= Promise.all([fetch(realUrl), fetch(commonUrl)])
    .then(async ([real, common]) => {
      if (!real.ok || !common.ok) throw new Error("Couldn't load the word list");
      return new Dictionary(parse(await real.text()), parse(await common.text()));
    })
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}
