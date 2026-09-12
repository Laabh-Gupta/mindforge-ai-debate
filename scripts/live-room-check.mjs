import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3101";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const output = [];
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function reviewed() {
  await page
    .getByRole("button", { name: "Retry review", exact: true })
    .or(
      page.getByRole("heading", { name: "What to take into your next conversation", exact: true }),
    )
    .waitFor({ timeout: 90000 });
  if (await page.getByRole("button", { name: "Retry review", exact: true }).isVisible())
    throw new Error("Review failed: " + (await page.locator("main").innerText()).slice(0, 600));
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]"),
  );
  output.push(saved[0]);
  console.log(
    JSON.stringify({ mode: saved[0].modeId, turns: saved[0].turns.length, review: true }),
  );
}
try {
  if (!process.env.ONLY_MODE || process.env.ONLY_MODE === "group-discussion") {
    await page.goto(BASE_URL + "/group-discussion");
    await page
      .getByLabel("GD topic", { exact: true })
      .fill("Should early-career employees work primarily from the office?");
    await page.getByRole("button", { name: "Enter the room", exact: true }).click();
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              JSON.parse(
                localStorage.getItem("mindforge:practice:v2:guest") || "[]",
              )[0]?.messages.filter((m) => m.role === "assistant").length,
          ),
        { timeout: 70000 },
      )
      .toBe(1);
    await page.getByRole("button", { name: "Speak", exact: true }).waitFor();
    await page
      .getByLabel("Your contribution", { exact: true })
      .fill(
        "I would build on the concern about learning by separating mentoring from routine work. New employees could benefit from regular office days with structured feedback, while focused individual tasks could still be completed remotely.",
      );
    await page.getByRole("button", { name: "Speak", exact: true }).click();
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              JSON.parse(
                localStorage.getItem("mindforge:practice:v2:guest") || "[]",
              )[0]?.messages.filter((m) => m.role === "assistant").length,
          ),
        { timeout: 70000 },
      )
      .toBe(2);
    await page
      .getByRole("button", { name: "Close & get moderator feedback", exact: true })
      .click({ timeout: 70000 });
    await page
      .getByText("Participant contribution summary", { exact: true })
      .waitFor({ timeout: 90000 });
    await page.screenshot({ path: "output/qa/live-gd.png", fullPage: true });
    await page.getByRole("button", { name: "Finish & get evaluation", exact: true }).click();
    await reviewed();
  }
  if (!process.env.ONLY_MODE || process.env.ONLY_MODE === "observer") {
    await page.goto(BASE_URL + "/observer");
    await page
      .getByLabel("Discussion topic", { exact: true })
      .fill("Should universities focus more on practical skills than examinations?");
    await page.getByRole("button", { name: "Generate discussion", exact: true }).click();
    await expect(page.locator("main textarea")).toHaveCount(5, { timeout: 90000 });
    for (let i = 0; i < 5; i++)
      await page
        .locator("main textarea")
        .nth(i)
        .fill(
          "The discussion improved when participants acknowledged another viewpoint and asked for specific evidence. A stronger approach would separate practical skills from examination design, compare their different purposes, and invite quieter participants to explain their assumptions.",
        );
    await page.getByRole("button", { name: "Submit analysis", exact: true }).click();
    await reviewed();
  }
} catch (e) {
  console.log(
    JSON.stringify({
      error: String(e),
      body: (await page.locator("main").innerText()).slice(-1500),
    }),
  );
  await page.screenshot({ path: "output/qa/room-error.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await writeFile(
    `output/qa/live-rooms-${process.env.ONLY_MODE || "all"}.json`,
    JSON.stringify({ output, errors }, null, 2),
  );
  await browser.close();
}
