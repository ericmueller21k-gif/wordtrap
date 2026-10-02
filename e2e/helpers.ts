import { expect, type Page } from "@playwright/test";
import type { MatchState, Rack } from "../packages/engine/src/index.ts";
import { loadDictionary } from "../packages/engine/src/node.ts";

export const dict = loadDictionary();

/** Taps rack tiles to spell `word`. */
export async function spell(page: Page, word: string) {
  for (const letter of word) {
    await page.locator(`.rack button[aria-label="Place ${letter}"]:not([disabled])`).first().click();
  }
}

export function playable(rack: Rack, length?: number): string[] {
  return dict.playableWords(rack).filter((w) => w.length >= 3 && (length === undefined || w.length === length));
}

export async function readLocalMatch(page: Page): Promise<{ state: MatchState; activeSeat: 0 | 1 }> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wordtrap.local-matches.v1")!)[0]);
}

export async function shot(page: Page, name: string) {
  await page.waitForTimeout(450); // let animations settle
  await page.screenshot({ path: `e2e/screenshots/${test_project(page)}-${name}.png` });
}

function test_project(page: Page): string {
  const w = page.viewportSize()?.width ?? 0;
  return `${w}w`;
}

export { expect };
