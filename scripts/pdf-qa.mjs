const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const { results } = JSON.parse(
  await readFile("output/qa/live-modes-interview,public-speaking.json", "utf8"),
);
const session = results[0]?.session;
if (!session?.evaluation) throw new Error("Run the live mode checks first.");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(
  (s) => localStorage.setItem("mindforge:practice:v2:guest", JSON.stringify([s])),
  session,
);
await page.goto(BASE_URL + "/evaluation?session=" + session.id);
await page.getByRole("button", { name: "Export session", exact: true }).click();
const popupPromise = page.waitForEvent("popup");
await page.getByRole("menuitem", { name: "PDF / Print report", exact: true }).click();
const popup = await popupPromise;
await popup.getByRole("heading", { name: "ARGULAB", exact: true }).waitFor();
await popup.pdf({
  path: "output/qa/session-report.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("Saved output/qa/session-report.pdf");
await browser.close();
