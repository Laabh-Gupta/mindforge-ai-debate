import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3101";
try {
  for (const route of ["login", "signup", "dashboard"]) {
    await page.goto(base + "/" + route);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: "output/qa/" + route + "-accounts-desktop.png", fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 620 });
  await page.goto(base + "/dashboard");
  await page.locator("aside nav").hover();
  await page.screenshot({ path: "output/qa/sidebar-accounts.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/signup");
  await page.getByLabel("Name", { exact: true }).waitFor();
  await page.screenshot({ path: "output/qa/signup-accounts-mobile.png", fullPage: true });
  console.log(JSON.stringify({ errors }));
} finally {
  await browser.close();
}
