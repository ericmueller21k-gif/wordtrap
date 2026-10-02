import { test, type Page } from "@playwright/test";
import { expect, playable, spell } from "./helpers.ts";

/** Words each player set, by round, so the test can choose catching or missing guesses. */
type Chosen = Record<string, string[]>;

async function roundNumber(page: Page): Promise<number> {
  const text = (await page.locator(".header-round").textContent()) ?? "";
  return Number(text.match(/Round (\d+)/)?.[1]) - 1;
}

async function rackLetters(page: Page): Promise<string[]> {
  const labels = await page.locator(".rack button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  return labels.map((l) => l.replace("Place ", "")).filter((l) => l.length === 1);
}

/** Takes one action if this player has one. Returns false when the match is over for them. */
async function step(page: Page, me: string, other: string, chosen: Chosen): Promise<boolean> {
  if (await page.getByRole("heading", { name: /win|tie!/ }).isVisible()) return false;

  if (await page.getByRole("heading", { name: "Set your word" }).isVisible()) {
    const round = await roundNumber(page);
    const words = playable(await rackLetters(page));
    const word = words.find((w) => w.length === 4 + ((round + (me === "Eric" ? 0 : 1)) % 2)) ?? words[0]!;
    await spell(page, word);
    await page.getByRole("button", { name: "Lock in" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Lock in" }).click();
    (chosen[me] ??= [])[round] = word;
    await expect(page.getByRole("heading", { name: "Set your word" })).toBeHidden();
    return true;
  }

  if (await page.getByRole("button", { name: "Guess" }).isVisible()) {
    const round = await roundNumber(page);
    const secret = chosen[other]![round]!;
    const previous = (await page.locator(".guess-rows .board-row").count()) - 1;
    const wrong = playable(await rackLetters(page), secret.length).filter((w) => w !== secret);
    const guess = previous === 0 && round % 2 === 1 && wrong[0] ? wrong[0] : previous === 1 && round === 3 && wrong[1] ? wrong[1] : secret;
    await spell(page, guess);
    await page.getByRole("button", { name: "Guess" }).click();
    await page.waitForTimeout(150);
    return true;
  }

  for (const name of ["Continue", "Next round", "Final score"]) {
    const b = page.getByRole("button", { name });
    if (await b.isVisible()) {
      await b.click();
      return true;
    }
  }
  return true; // waiting
}

test("two phones play a full online match, rejoin, and rematch", async ({ browser }, info) => {
  const device = info.project.use;
  const eric = await (await browser.newContext({ ...device })).newPage();
  const sam = await (await browser.newContext({ ...device })).newPage();

  await eric.goto("/");
  await eric.getByRole("button", { name: "New game" }).click();
  await eric.getByLabel("Your name").fill("Eric");
  await eric.getByRole("button", { name: "Create game" }).click();
  const code = (await eric.locator(".invite-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  await eric.getByRole("button", { name: "Set your word" }).click();
  await expect(eric.getByText("Your friend hasn't joined yet.")).toBeVisible();

  // Sam opens the invite link.
  await sam.goto(`/join/${code}`);
  await sam.getByLabel("Your name").fill("Sam");
  await sam.getByRole("button", { name: "Join game" }).click();
  await expect(sam.getByRole("heading", { name: "Set your word" })).toBeVisible();

  const chosen: Chosen = {};
  let ericLive = true;
  let samLive = true;
  for (let i = 0; i < 400 && (ericLive || samLive); i++) {
    if (ericLive) ericLive = await step(eric, "Eric", "Sam", chosen);
    if (samLive) samLive = await step(sam, "Sam", "Eric", chosen);
    if (i % 10 === 9) await eric.waitForTimeout(200);
  }
  await expect(eric.getByRole("heading", { name: /win|tie!/ })).toBeVisible();
  await expect(sam.getByRole("heading", { name: /win|tie!/ })).toBeVisible();
  const ericScore = await eric.locator(".final-score").textContent();
  const samScore = await sam.locator(".final-score").textContent();
  expect(ericScore!.split("–").map((s) => s.trim()).reverse().join(" – ")).toBe(samScore);

  // Sam rejoins from a fresh device (like the installed home-screen app) with their rejoin code.
  const samEntry = await sam.evaluate(() => JSON.parse(localStorage.getItem("wordtrap.online-matches.v1")!)[0]);
  const samPhone2 = await (await browser.newContext({ ...device })).newPage();
  await samPhone2.goto("/");
  await samPhone2.getByRole("button", { name: "Join with a code" }).click();
  await samPhone2.getByLabel("Code").fill(samEntry.rejoinCode.toLowerCase());
  await samPhone2.getByRole("button", { name: "Continue" }).click();
  await expect(samPhone2.getByRole("heading", { name: /win|tie!/ })).toBeVisible();

  // A wrong code gets a clear message.
  await samPhone2.getByRole("button", { name: "Home" }).click();
  await samPhone2.getByRole("button", { name: "Join with a code" }).click();
  await samPhone2.getByLabel("Code").fill("ZZZZZZ");
  await samPhone2.getByRole("button", { name: "Continue" }).click();
  await samPhone2.getByLabel("Your name").fill("Mallory");
  await samPhone2.getByRole("button", { name: "Join game" }).click();
  await expect(samPhone2.locator(".message")).toHaveText("We couldn't find that game. Check the code.");

  // Rematch: Eric starts it, Sam's final screen offers to join it.
  await eric.getByRole("button", { name: "Rematch" }).click();
  await expect(eric.getByRole("heading", { name: "Set your word" })).toBeVisible();
  await expect(sam.getByRole("button", { name: "Play Eric's rematch" })).toBeVisible({ timeout: 15_000 });
  await sam.getByRole("button", { name: "Play Eric's rematch" }).click();
  await expect(sam.getByRole("heading", { name: "Set your word" })).toBeVisible();
  await expect(sam.getByText("Round 1")).toBeVisible();

  // Home shows both games with statuses.
  await sam.getByRole("button", { name: "Home" }).click();
  await expect(sam.locator(".match-item")).toHaveCount(2);
  await expect(sam.locator(".match-urgent")).toHaveCount(1);
});

test("a third player can't join a full game", async ({ browser }, info) => {
  const device = info.project.use;
  const pages = await Promise.all([0, 1, 2].map(async () => (await browser.newContext({ ...device })).newPage()));
  const [a, b, c] = pages as [Page, Page, Page];
  await a.goto("/");
  await a.getByRole("button", { name: "New game" }).click();
  await a.getByLabel("Your name").fill("Ann");
  await a.getByRole("button", { name: "Create game" }).click();
  const code = (await a.locator(".invite-code").textContent())!.trim();
  for (const [page, name] of [
    [b, "Bo"],
    [c, "Cy"],
  ] as const) {
    await page.goto(`/join/${code}`);
    await page.getByLabel("Your name").fill(name);
    await page.getByRole("button", { name: "Join game" }).click();
  }
  await expect(c.locator(".message")).toHaveText("That game already has two players.");
});
