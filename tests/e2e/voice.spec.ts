import { test, expect } from "@playwright/test";
test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["microphone"],
});
test("recording can pause, resume, play back and download without uploading audio", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.headers()["content-type"]?.startsWith("audio/"))
      uploads.push(r.url());
  });
  await page.route("**/api/session", (route) =>
    route.fulfill({ status: 503, body: "AI unavailable in this recording test." }),
  );
  await page.goto("/interview");
  await page.getByLabel("Your background or target role", { exact: true }).fill("Graduate analyst");
  await page.getByRole("button", { name: "Start the interview", exact: true }).click();
  await page.getByText("Record a practice answer", { exact: true }).click();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByRole("button", { name: "Pause recording", exact: true }).click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume recording", exact: true }).click();
  await expect(page.getByText("Recording", { exact: true })).toBeVisible();
  // Wait for one MediaRecorder chunk, rather than stopping before any audio exists.
  await expect.poll(() => page.locator("details").innerText()).toContain("0:01");
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByLabel("Recorded answer", { exact: true })).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download recording", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/argulab-recording\.(webm|m4a)$/);
  expect(uploads).toEqual([]);
});
