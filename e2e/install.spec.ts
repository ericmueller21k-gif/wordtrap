import { test } from "@playwright/test";
import { expect } from "./helpers.ts";

test("installable: manifest, icons and full-screen meta", async ({ page, request }) => {
  await page.goto("/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.orientation).toBe("portrait");
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  expect((await request.get(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href") as string)).status()).toBe(200);
});

test("opens offline after the first visit, and pass-the-phone works offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Wait until the service worker controls the page and has finished precaching.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Word Trap" })).toBeVisible();
  await page.getByRole("button", { name: "Pass the phone", exact: true }).click();
  await page.getByLabel("First player").fill("Eric");
  await page.getByLabel("Second player").fill("Sam");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: /^I'm Eric/ }).click();
  await expect(page.getByRole("heading", { name: "Set your word" })).toBeVisible();

  // An invite link still opens the app shell offline.
  await page.goto("/join/ABCDEF").catch(() => {});
  await expect(page.getByLabel("Your name")).toBeVisible();
  await context.setOffline(false);
});

test("Add to Home Screen instructions on iPhone Safari, dismissible", async ({ page }, info) => {
  test.skip(info.project.name === "android", "Android uses the browser's own install prompt");
  await page.goto("/");
  const card = page.getByRole("region", { name: "Install Word Trap" });
  await expect(card).toContainText("Add to Home Screen");
  await card.getByRole("button", { name: "Dismiss" }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Word Trap" })).toBeVisible();
  await expect(card).toBeHidden();
});
