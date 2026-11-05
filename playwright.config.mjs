import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./tmp/playwright-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8787/firecloud/",
    timezoneId: "Asia/Shanghai",
    serviceWorkers: "block",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/serve-browser-dist.mjs",
    url: "http://127.0.0.1:8787/firecloud/",
    reuseExistingServer: false,
    timeout: 10_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 }
  }
});
