import { expect, test } from "@playwright/test";

test("email signup, reload, profile edit, sign-out and email login work without Supabase", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("supabase")) external.push(request.url());
  });
  const email = "browser-" + crypto.randomUUID() + "@example.test";
  const password = "Browser test passphrase 2026!";
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Practice Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Personal workspace", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Personal workspace", { exact: true })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Practice Tester", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit name" }).click();
  await page.getByLabel("Full name").fill("Updated Tester");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Updated Tester" })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Personal workspace", { exact: true })).toBeVisible();
  expect(external).toEqual([]);
});
test("Google configuration errors are visible and leave email sign-in usable", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("use email and password");
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
});
test("sidebar scrolls independently and keeps its logo and progress visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await page.goto("/dashboard");
  const nav = page.locator("aside nav");
  await expect(nav).toHaveCSS("scrollbar-width", "thin");
  const before = await page.locator("aside").boundingBox();
  await nav.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.locator("aside").getByText("XP to the next level", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator("aside").getByRole("link", { name: "MindForge", exact: true }),
  ).toBeVisible();
  expect(await page.locator("aside").boundingBox()).toEqual(before);
});
