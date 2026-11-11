import { defineConfig, devices } from "@playwright/test";

// Browser smoke tests over the static export in out/. Run `npm run build`
// first: the suite tests what would be deployed, not the dev server.
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // The CI runner is shared: other pipelines running beside this one made
  // tests time out at the default 30 s with a worker per core.
  timeout: 60_000,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["junit", { outputFile: "e2e-results/junit.xml" }]] : "list",
  outputDir: "e2e-results/artifacts",
  // Same reason for the assertions: a 5 s expect that holds here in 0.2 s timed out on the shared runner
  // while five other pipelines ran beside it (six distinct tests, all "visible within 5000ms", all passing
  // on rerun). The assertions are unchanged; only the patience is.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node e2e/serve.mjs out`,
    url: `http://127.0.0.1:${PORT}/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
