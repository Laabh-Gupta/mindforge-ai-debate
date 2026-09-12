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
        command: "node scripts/test-stack.mjs",
        url: "http://127.0.0.1:3100/api/health",
        timeout: 120000,
        reuseExistingServer: false,
      },
});
