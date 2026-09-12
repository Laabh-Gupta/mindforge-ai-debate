const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("output/qa", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(BASE_URL + "/dashboard");
await page.getByRole("heading", { name: "Your practice starts here." }).waitFor();
await page.getByText("No sessions yet", { exact: true }).waitFor();
await page.screenshot({ path: "output/qa/dashboard-desktop.png", fullPage: true });
await page.goto(BASE_URL + "/interview");
await expect(page.getByLabel("Your background or target role", { exact: true })).toBeEnabled();
await expect(page.getByRole("combobox", { name: "Interview type", exact: true })).toContainText(
  "HR",
);
await page.screenshot({ path: "output/qa/interview-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE_URL + "/dashboard");
await page.getByText("No sessions yet", { exact: true }).waitFor();
await page.screenshot({ path: "output/qa/dashboard-mobile.png", fullPage: true });
console.log(JSON.stringify({ errors }));
await browser.close();
