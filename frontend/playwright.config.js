import { defineConfig } from "@playwright/test";

/**
 * End-to-end smoke suite against a running app (Vite on :5173 proxying to the Laravel API), signed
 * in as the users of a disposable test store. See e2e/README.md for the setup and environment.
 * Not part of `npm test`; run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  // The specs share one store's stock and books, so run them one after another.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],
  outputDir: "e2e-results",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    // The installed Chrome, so no separate browser download is needed.
    channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
    headless: process.env.E2E_HEADED !== "1",
    viewport: { width: 1366, height: 860 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.js/ },
    { name: "e2e", testMatch: /\.spec\.js/, dependencies: ["setup"] },
  ],
});
