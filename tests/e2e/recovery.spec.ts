import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { EVALUATION_DIMENSIONS } from "../../frontend/src/lib/evaluation-shared";
const id = "40000000-0000-4000-8000-000000000001";
const scores = Object.fromEntries(EVALUATION_DIMENSIONS.map((k, i) => [k, 40 + i * 3]));
const completed = {
  id,
  modeId: "debate",
  modeName: "Debate Arena",
  topic: "Education and opportunity — शिक्षा",
  startedAt: Date.now() - 600000,
  updatedAt: Date.now(),
  completedAt: Date.now(),
  durationSeconds: 600,
  status: "completed",
  difficulty: "beginner",
  messages: [],
  turns: [
    {
      speaker: "You",
      role: "user",
      content:
        "Access to education matters because it helps people make informed choices, develop useful skills, and take part in their communities with greater confidence.",
    },
  ],
  evaluation: {
    summary: "A clear position with room for stronger evidence.",
    scores,
    strengths: ["Clear claim."],
    weaknesses: ["Use a specific example."],
    suggestions: ["Compare two approaches."],
    fallacies: [],
  },
  overall: 60,
  profileId: "balanced",
};
test("rescoring persists per-session weights and exports selectable report content", async ({
  page,
}) => {
  await page.addInitScript((s) => {
    if (!localStorage.getItem("qa-seeded")) {
      localStorage.setItem("mindforge:practice:v2:guest", JSON.stringify([s]));
      localStorage.setItem("qa-seeded", "yes");
    }
  }, completed);
  await page.goto("/evaluation?session=" + id);
  await page.getByRole("button", { name: "Customise weights", exact: true }).click();
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await slider.press("Home");
  await page.getByRole("button", { name: "Re-run scoring", exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("mindforge:practice:v2:guest")!)[0],
  );
  expect(before.profileId).toBe("custom");
  await page.evaluate(() =>
    localStorage.setItem("mindforge:custom-profile", JSON.stringify({ communication: 10 })),
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Evaluation profile", exact: true }),
  ).toContainText("Custom");
  await page.getByRole("button", { name: "Export session", exact: true }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("menuitem", { name: "PDF / Print report", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.locator("body")).toContainText(completed.topic);
  await expect(popup.locator("body")).toContainText("Overall: " + before.overall + "/100");
  await expect(popup.locator("body")).toContainText(completed.turns[0]!.content);
  await popup.close();
  await page.getByRole("button", { name: "Export session", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download TXT", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("argulab-" + id + ".txt");
  await page.goto("/dashboard");
  await expect(page.getByText("100 XP", { exact: true })).toBeVisible();
});
test("history opens the selected unfinished session and clear resets open tabs", async ({
  page,
  context,
}) => {
  const older = {
    ...completed,
    id: "40000000-0000-4000-8000-000000000002",
    status: "active",
    evaluation: undefined,
    completedAt: undefined,
    topic: "The earlier unfinished session",
    draft: "An earlier draft.",
  };
  const newer = {
    ...older,
    id: "40000000-0000-4000-8000-000000000003",
    updatedAt: Date.now() + 1000,
    topic: "The most recent unfinished session",
    draft: "A newer draft.",
  };
  await page.addInitScript(
    (s) => {
      if (!localStorage.getItem("qa-seeded")) {
        localStorage.setItem("mindforge:practice:v2:guest", JSON.stringify(s));
        localStorage.setItem("qa-seeded", "yes");
      }
    },
    [newer, older],
  );
  await page.route("**/api/session", (route) => route.abort());
  await page.goto("/profile");
  await page.getByRole("link", { name: /The earlier unfinished session/ }).click();
  await page.getByRole("button", { name: "Resume session", exact: true }).click();
  await expect(page.getByLabel("Your response", { exact: true })).toHaveValue("An earlier draft.");
  const second = await context.newPage();
  await second.goto("/settings");
  await second.getByRole("button", { name: "Clear practice history", exact: true }).click();
  await second.getByRole("button", { name: "Delete history", exact: true }).click();
  await expect(page.getByLabel("Motion", { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("No sessions yet", { exact: true })).toBeVisible();
  await expect(page.getByText("0 XP", { exact: true })).toBeVisible();
});
test("legacy guest records migrate once without invented time or transcript", async ({ page }) => {
  await page.addInitScript((s) => {
    localStorage.setItem(
      "mindforge:skills",
      JSON.stringify([
        {
          modeId: s.modeId,
          modeName: s.modeName,
          topic: s.topic,
          at: s.completedAt,
          overall: 60,
          scores: s.evaluation.scores,
        },
      ]),
    );
  }, completed);
  await page.goto("/dashboard");
  await expect(page.getByText("100 XP", { exact: true })).toBeVisible();
  const first = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindforge:practice:v2:guest")!),
  );
  expect(first[0].durationSeconds).toBe(0);
  expect(first[0].turns).toEqual([]);
  await page.reload();
  await expect(page.getByText("100 XP", { exact: true })).toBeVisible();
  const second = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mindforge:practice:v2:guest")!),
  );
  expect(second.map((s: { id: string }) => s.id)).toEqual(first.map((s: { id: string }) => s.id));
});
test("primary screens have no serious accessibility violations in either theme", async ({
  page,
}) => {
  for (const theme of ["dark", "light"]) {
    await page.addInitScript(
      (theme) => localStorage.setItem("mindforge:preferences", JSON.stringify({ theme })),
      theme,
    );
    for (const route of ["/dashboard", "/interview", "/settings", "/profile"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
  }
});
