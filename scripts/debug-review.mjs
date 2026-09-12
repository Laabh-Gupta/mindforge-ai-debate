import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage();
const logs = [];
p.on("response", async (r) => {
  if (r.url().includes("_serverFn")) {
    const body = await r.text().catch(() => "");
    logs.push({ status: r.status(), body: body.slice(0, 1200) });
  }
});
await p.goto("http://127.0.0.1:3101/interview");
await p
  .getByLabel("Your background or target role", { exact: true })
  .fill("An analyst moving into consulting");
await p.getByRole("button", { name: "Start the interview", exact: true }).click();
await p.getByRole("log").getByText("Interviewer", { exact: true }).waitFor();
await p
  .getByRole("button", { name: "Stop response", exact: true })
  .waitFor({ state: "hidden", timeout: 70000 });
await p
  .getByLabel("Your response", { exact: true })
  .fill(
    "I led a team of three analysts to improve our monthly reporting. I clarified responsibilities, checked our assumptions with sales, and reduced delays by simplifying the approval process.",
  );
await p.getByRole("button", { name: "Send response", exact: true }).click();
await p.getByRole("button", { name: "Finish & review", exact: true }).click({ timeout: 70000 });
await p
  .getByRole("button", { name: "Retry review", exact: true })
  .or(p.getByRole("heading", { name: "What to take into your next conversation", exact: true }))
  .waitFor({ timeout: 90000 });
console.log(JSON.stringify(logs));
await b.close();
