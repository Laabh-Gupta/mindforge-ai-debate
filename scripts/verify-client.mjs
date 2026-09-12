import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
async function files(dir) {
  const rows = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      rows.map((r) => (r.isDirectory() ? files(join(dir, r.name)) : [join(dir, r.name)])),
    )
  ).flat();
}
const secrets = [
  "GROQ_API_KEY",
  "AUTH_SECRET",
  "SESSION_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_PASSWORD",
  "UPSTASH_REDIS_REST_TOKEN",
].filter((k) => process.env[k]);
const leaks = [];
for (const file of await files(".output/public")) {
  if (!/\.(js|html|css|map)$/.test(file)) continue;
  const text = await readFile(file, "utf8");
  for (const key of secrets) if (text.includes(process.env[key])) leaks.push({ file, key });
}
if (leaks.length) {
  console.error("Server credentials found in client artifacts:", leaks);
  process.exitCode = 1;
} else
  console.log(
    "Client credential scan passed (" + secrets.length + " configured server credentials checked).",
  );
