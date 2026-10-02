import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8787",
    trace: "retain-on-failure",
  },
  // The real Worker and Durable Objects, run locally by wrangler (it builds the app first).
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://localhost:8787",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    // Smallest current iPhone width (iOS 18 dropped the 320 px models).
    { name: "small-phone", use: { ...devices["iPhone SE (3rd gen)"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
});
