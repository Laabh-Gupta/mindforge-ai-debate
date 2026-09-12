import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env["TEST_BASE_URL"] || "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env["TEST_BASE_URL"]
    ? []
    : {
        command: "node .output/server/index.mjs",
        url: "http://127.0.0.1:3100/api/health",
        env: {
          PORT: "3100",
          HOST: "127.0.0.1",
          NODE_ENV: "production",
          APP_ORIGIN: "http://127.0.0.1:3100",
          AUTH_SECRET: "test-only-auth-secret-for-browser-tests-123456789",
          DATABASE_PATH: "output/qa/e2e-accounts.sqlite",
          SESSION_SECRET: "test-only-secret-for-browser-tests-123456789",
        },
        reuseExistingServer: false,
      },
});
