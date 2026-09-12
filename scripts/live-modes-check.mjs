const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
import { chromium, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
await mkdir("output/qa", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
const results = [];
const errors = [];
page.on("response", async (r) => {
  if (r.url().includes("_serverFn")) {
    const body = await r.text().catch(() => "");
    await writeFile("output/qa/last-serverfn.json", body);
    console.log(
      JSON.stringify({
        serverFunctionStatus: r.status(),
        response:
          body.includes('"Error"') || body.length < 200
            ? body.slice(0, 800)
            : "structured response",
      }),
    );
  }
});
page.on("pageerror", (e) => errors.push(e.message));
const modes = [
  [
    "interview",
    "Your background or target role",
    "Two years in analytics, targeting consulting",
    "Start the interview",
    "I led a team of three analysts to improve our monthly reporting. I clarified each person's responsibilities, checked our assumptions with the sales team, and reduced delays by simplifying the approval process.",
  ],
  [
    "public-speaking",
    "Speech topic",
    "A practical way to improve public transport",
    "Take the stage",
    "Imagine missing a job interview because your bus never arrived. Reliable public transport connects people to opportunity. We should begin by publishing predictable timetables and gathering feedback from regular commuters before expanding routes.",
  ],
  [
    "extempore",
    "Theme (optional)",
    "Learning from mistakes",
    "Get my topic",
    "We often treat mistakes as evidence of failure, but they can help us learn. When a project goes wrong, I would examine my assumptions, ask for feedback, and test a smaller change before trying again.",
  ],
  [
    "negotiation",
    "Scenario",
    "Negotiate a flexible work arrangement with your manager",
    "Begin negotiation",
    "I understand that the team needs predictable collaboration. I propose two remote days with fixed availability hours and weekly delivery goals. We could review the arrangement after one month and adjust it if communication suffers.",
  ],
  [
    "case-discussion",
    "Case area",
    "A café is gaining customers but losing profit",
    "Open the case",
    "I would separate revenue from costs and examine changes in the average order value, ingredient waste and staffing costs. Before recommending a price increase, I would compare profitable and unprofitable items and test a smaller menu.",
  ],
  [
    "simulation",
    "Scenario",
    "A supplier delay threatens our product launch. Lead the stakeholder meeting.",
    "Enter simulation",
    "As the project lead, I recommend delaying the launch rather than promising an unreliable delivery date. We should agree on a revised timeline, give customers an honest update, and assign one owner to each recovery action.",
  ],
];
try {
  for (const [route, label, topic, cta, answer] of modes.filter(
    (m) => !process.env.ONLY_MODE || process.env.ONLY_MODE.split(",").includes(m[0]),
  )) {
    await page.goto(BASE_URL + "/" + route);
    await page.getByLabel(label, { exact: true }).fill(topic);
    if (route === "simulation")
      await page.getByLabel("Your role", { exact: true }).fill("Project lead");
    await page.getByRole("button", { name: cta, exact: true }).click();
    if (route === "extempore")
      await page
        .getByRole("button", { name: "Ready to speak", exact: true })
        .click({ timeout: 70000 });
    await expect(
      page
        .getByRole("log")
        .locator(":scope > div")
        .filter({ has: page.locator("p") }),
    ).toHaveCount(1, { timeout: 70000 });
    await page
      .getByRole("button", { name: "Stop response", exact: true })
      .waitFor({ state: "hidden", timeout: 70000 });
    await page.getByLabel("Your response", { exact: true }).fill(answer);
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
    if (route === "simulation") {
      await page.getByRole("button", { name: "Thinking View off", exact: true }).click();
      await page.getByRole("button", { name: /Thinking View · turn 3/ }).click();
      await page.getByText("Your best next move", { exact: true }).waitFor({ timeout: 90000 });
      await page.getByRole("button", { name: "Introduce an event", exact: true }).click();
      await expect(
        page
          .getByRole("log")
          .locator(":scope > div")
          .filter({ has: page.locator("p") }),
      ).toHaveCount(4, { timeout: 70000 });
      await page
        .getByRole("button", { name: "Stop response", exact: true })
        .waitFor({ state: "hidden", timeout: 70000 });
    }
    await page.getByRole("button", { name: "Finish & review", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry review", exact: true })
      .or(
        page.getByRole("heading", {
          name: "What to take into your next conversation",
          exact: true,
        }),
      )
      .waitFor({ timeout: 90000 });
    if (await page.getByRole("button", { name: "Retry review", exact: true }).isVisible())
      throw new Error("Review failed for " + route);
    await expect(page.getByRole("heading", { name: "A closer look", exact: true })).toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]"),
    );
    results.push({ route, session: saved[0] });
    console.log(
      JSON.stringify({
        mode: route,
        liveExchange: true,
        review: !!saved[0]?.evaluation,
        turns: saved[0]?.turns.length,
      }),
    );
  }
} catch (error) {
  console.log(
    JSON.stringify({
      error: String(error).slice(0, 1000),
      body: (await page.locator("main").innerText()).slice(-1500),
    }),
  );
  await page.screenshot({ path: "output/qa/live-modes-error.png", fullPage: true });
  process.exitCode = 1;
} finally {
  await writeFile(
    `output/qa/live-modes-${process.env.ONLY_MODE || "all"}.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
