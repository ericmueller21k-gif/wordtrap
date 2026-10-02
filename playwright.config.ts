import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build -w @wordtrap/app && npm run preview -w @wordtrap/app -- --port 4173 --strictPort",
    cwd: ".",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    // Smallest current iPhone width (iOS 18 dropped the 320 px models).
    { name: "small-phone", use: { ...devices["iPhone SE (3rd gen)"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
});
