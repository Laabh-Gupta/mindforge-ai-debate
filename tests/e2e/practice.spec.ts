import { test, expect, type Page } from "@playwright/test";
async function fakeConversation(page: Page) {
  await page.route("**/api/session", async (route) => {
    const body = route.request().postDataJSON();
    const userText = body.messages
      .at(-1)
      .parts.map((p: { text: string }) => p.text)
      .join("");
    const response =
      userText === "__mindforge_open__"
        ? "Welcome. What is your position on this topic, and what is your strongest reason?"
        : "You argue that broader access creates opportunity. How would you address the cost of expanding this approach?";
    const events = [
      { type: "start", messageId: crypto.randomUUID() },
      { type: "text-start", id: "text" },
      { type: "text-delta", id: "text", delta: response },
      { type: "text-end", id: "text" },
      { type: "finish", finishReason: "stop" },
    ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: events.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") + "data: [DONE]\n\n",
    });
  });
}
const answer =
  "I believe public transport should be supported because it improves access to jobs and education for people who cannot afford private vehicles.";
test("new guest has zero stats and working navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(page.getByText("0 XP", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your practice starts here." })).toBeVisible();
  await expect(page.getByText("4,820", { exact: false })).toHaveCount(0);
  await page.getByRole("link", { name: "Start a session", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training Hub" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("debate saves draft, restores transcript and completes exactly once", async ({ page }) => {
  await fakeConversation(page);
  await page.goto("/debate");
  await page.getByLabel("Motion", { exact: true }).fill("Should public transport be subsidised?");
  await page.getByRole("button", { name: "Enter the arena", exact: true }).click();
  await expect(page.getByText("Welcome. What is your position", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish & review" })).toBeDisabled();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]")[0]
              ?.durationSeconds,
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(2);
  await page.getByLabel("Your response", { exact: true }).fill(answer);
  await page.getByRole("button", { name: "Send response", exact: true }).click();
  await expect(page.getByText("You argue that broader access", { exact: false })).toBeVisible();
  await page.getByLabel("Your response", { exact: true }).fill("My next point is saved.");
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]")[0]?.draft,
      ),
    )
    .toBe("My next point is saved.");
  await page.reload();
  await page.getByRole("button", { name: "Resume session", exact: true }).click();
  await expect(page.getByLabel("Your response", { exact: true })).toHaveValue(
    "My next point is saved.",
  );
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  // Make the evaluation provider unavailable to test recoverable completion.
  await page.route("**/_serverFn/**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.getByRole("button", { name: "Finish & review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Session review", exact: true })).toBeVisible();
  await expect(page.getByText("100 XP earned", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("100 XP earned", { exact: false })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("100 XP", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("mindforge:practice:v2:guest") || "[]").length,
    ),
  ).toBe(1);
});
test("all session modes render and keep empty progress honest", async ({ page }) => {
  for (const route of [
    "/group-discussion",
    "/interview",
    "/public-speaking",
    "/extempore",
    "/negotiation",
    "/case-discussion",
    "/simulation",
    "/observer",
    "/profile",
    "/analytics",
    "/achievements",
    "/leaderboard",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
test("settings persist and mobile navigation is keyboard accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByRole("combobox", { name: "Theme", exact: true }).click();
  await page.getByRole("option", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("switch", { name: "Larger text", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Debate Arena", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test("server rejects foreign-origin and malformed AI requests", async ({ request, baseURL }) => {
  const foreign = await request.post("/api/session", {
    headers: { origin: "https://other.example" },
    data: {},
  });
  expect(foreign.status()).toBe(403);
  const first = await request.get("/dashboard");
  expect(first.headers()["x-content-type-options"]).toBe("nosniff");
  const malformed = await request.post("/api/session", {
    headers: { origin: baseURL! },
    data: { topic: "Hi", modeId: "unknown", messages: [] },
  });
  expect(malformed.status()).toBe(400);
});
