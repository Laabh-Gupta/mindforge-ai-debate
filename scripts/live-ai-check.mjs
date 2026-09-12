const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
import { expect } from "@playwright/test";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("output/qa", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(BASE_URL + "/debate");
  await page
    .getByLabel("Motion", { exact: true })
    .fill("Was Shantanu responsible for Bhishma giving up the throne in the Mahabharata?");
  await page.getByRole("button", { name: "Enter the arena", exact: true }).click();
  await page
    .getByRole("button", { name: "Stop response", exact: true })
    .waitFor({ state: "hidden", timeout: 70000 });
  await page
    .getByRole("log")
    .getByText(/Shantanu|Bhishma/)
    .first()
    .waitFor({ timeout: 70000 });
  await page
    .getByLabel("Your response", { exact: true })
    .fill(
      "I think Shantanu bears responsibility because his desire to marry Satyavati created the situation that required Bhishma to sacrifice the throne, even though Bhishma formally made the choice.",
    );
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(
    page
      .getByRole("log")
      .locator(":scope > div")
      .filter({ has: page.locator("p") }),
  ).toHaveCount(3, { timeout: 70000 });
  await page
    .getByRole("button", { name: "Stop response", exact: true })
    .waitFor({ state: "hidden", timeout: 70000 });
  await page.getByRole("button", { name: "Finish & review" }).click({ timeout: 70000 });
  await page
    .getByRole("heading", { name: "What to take into your next conversation" })
    .waitFor({ timeout: 90000 });
  await page.screenshot({ path: "output/qa/live-review.png", fullPage: true });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]"),
  );
  await writeFile(
    "output/qa/live-result.json",
    JSON.stringify(
      {
        transcript: saved[0]?.turns,
        scores: saved[0]?.evaluation?.scores,
        summary: saved[0]?.evaluation?.summary,
        turns: saved[0]?.turns.length,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      liveDebate: true,
      evaluation: !!saved[0]?.evaluation,
      turns: saved[0]?.turns.length,
      errors,
    }),
  );
} catch (error) {
  await page.screenshot({ path: "output/qa/live-error.png", fullPage: true });
  console.log(
    JSON.stringify({
      error: String(error).slice(0, 1000),
      body: (await page.locator("main").innerText()).slice(-3000),
      errors,
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
