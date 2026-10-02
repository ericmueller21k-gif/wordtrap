import { test } from "@playwright/test";
import { expect, playable, readLocalMatch, shot, spell } from "./helpers.ts";

test("a full pass-the-phone match", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Word Trap/ })).toBeVisible();
  await shot(page, "01-home-empty");

  await page.getByRole("button", { name: "Pass the phone" }).click();
  await page.getByLabel("First player").fill("Eric");
  await page.getByLabel("Second player").fill("Sam");
  await shot(page, "02-new-game");
  await page.getByRole("button", { name: "Start" }).click();

  const shots = new Set<string>();
  const once = async (name: string) => {
    if (shots.has(name)) return;
    shots.add(name);
    await shot(page, name);
  };

  for (let step = 0; step < 200; step++) {
    if (await page.getByRole("heading", { name: /wins!|tie!/ }).isVisible()) break;

    const handoff = page.getByRole("button", { name: /^I'm / });
    if (await handoff.isVisible()) {
      await once("03-handoff");
      await handoff.click();
      continue;
    }

    const { state, activeSeat } = await readLocalMatch(page);

    if (await page.getByRole("heading", { name: "Set your word" }).isVisible()) {
      const round = state.progress.findIndex((p) => p[activeSeat].word === null);
      const words = playable(state.rounds[round]!.rack);
      // Mix lengths across rounds; prefer 4-5 letters.
      const word = words.find((w) => w.length === 4 + (round % 2)) ?? words[0]!;

      // Invalid words are rejected with the spec's message.
      if (round === 0 && activeSeat === 0) {
        await shot(page, "04-set-word-empty");
        await spell(page, word.slice(0, 2));
        await page.getByRole("button", { name: "Lock in" }).click();
        await expect(page.locator(".message")).toHaveText("Words need at least 3 letters.");
        await page.getByRole("button", { name: "Clear" }).click();
      }

      await spell(page, word);
      await expect(page.locator(".score-big")).toBeVisible();
      await once("05-set-word-built");
      await page.getByRole("button", { name: "Lock in" }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await once("06-confirm");
      await page.getByRole("alertdialog").getByRole("button", { name: "Lock in" }).click();
      continue;
    }

    if (await page.getByRole("button", { name: "Guess" }).isVisible()) {
      const round = state.progress.findIndex((p) => !p[activeSeat].doneGuessing);
      const me = state.progress[round]![activeSeat];
      const secret = state.progress[round]![activeSeat === 0 ? 1 : 0].word!;
      const others = playable(state.rounds[round]!.rack, secret.length).filter(
        (w) => w !== secret && !me.guesses.includes(w),
      );
      // Catch on even rounds (second guess), miss on odd rounds.
      const guess = me.guesses.length === 0 || round % 2 === 1 ? (others[0] ?? secret) : secret;
      await once("07-guess-empty");
      await spell(page, guess);
      await once("08-guess-built");
      await page.getByRole("button", { name: "Guess" }).click();
      await page.waitForTimeout(100);
      continue;
    }

    const cont = page.getByRole("button", { name: "Continue" });
    if (await cont.isVisible()) {
      await once(`09-reveal-${(await page.locator(".reveal-title").textContent())?.startsWith("Caught") ? "caught" : "missed"}`);
      await cont.click();
      continue;
    }

    const next = page.getByRole("button", { name: /Next round|Final score/ });
    if (await next.isVisible()) {
      await once("10-summary");
      await next.click();
      continue;
    }

    await page.waitForTimeout(100);
  }

  await expect(page.getByRole("heading", { name: /wins!|tie!/ })).toBeVisible();
  await shot(page, "11-final");
  const { state } = await readLocalMatch(page);
  expect(state.progress.every((p) => p[0].doneGuessing && p[1].doneGuessing)).toBe(true);

  // Home lists the finished match; rematch starts a new one.
  await page.getByRole("button", { name: "Rematch" }).click();
  await expect(page.getByRole("button", { name: /^I'm Eric/ })).toBeVisible();
  await page.getByRole("button", { name: "Home" }).click();
  await expect(page.locator(".match-item")).toHaveCount(2);
  await shot(page, "12-home-list");
});

test("game screens never scroll and keep 44px targets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pass the phone" }).click();
  await page.getByLabel("First player").fill("Alexandra");
  await page.getByLabel("Second player").fill("Bartholomew");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: /^I'm / }).click();
  await expect(page.getByRole("heading", { name: "Set your word" })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight - window.innerHeight,
    screen: [...document.querySelectorAll(".screen")].map((el) => el.scrollHeight - el.clientHeight),
  }));
  expect(overflow.doc).toBeLessThanOrEqual(0);
  for (const o of overflow.screen) expect(o).toBeLessThanOrEqual(0);

  const small = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.width < 43.5 || r.height < 43.5)).length,
  );
  expect(small).toBe(0);
});
