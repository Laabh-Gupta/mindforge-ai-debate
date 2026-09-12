import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { default: lighthouse } = await import(pathToFileURL(process.env.LIGHTHOUSE_ENTRY).href);
const browser = await chromium.launch({ args: ["--remote-debugging-port=9223"] });
try {
  const result = await lighthouse(process.env.TEST_BASE_URL || "http://127.0.0.1:3101/dashboard", {
    port: 9223,
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    logLevel: "error",
  });
  await writeFile("output/qa/lighthouse.json", result.report);
  console.log(
    JSON.stringify(
      Object.fromEntries(Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score])),
    ),
  );
} finally {
  await browser.close();
}
