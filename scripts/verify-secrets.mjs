import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const names = [
  "GROQ_API_KEY",
  "AUTH_SECRET",
  "SESSION_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_PASSWORD",
  "UPSTASH_REDIS_REST_TOKEN",
];
const configured = names.filter((name) => process.env[name]?.length >= 8);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const leaks = [];
for (const file of files) {
  if (/^\.env(?:$|\.)/.test(file) && file !== ".env.example") {
    leaks.push({ file, issue: "Environment file is tracked or not ignored" });
    continue;
  }
  if (/\.(?:sqlite|db)(?:-|$)/.test(file)) {
    leaks.push({ file, issue: "Private database is not ignored" });
    continue;
  }
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const name of configured)
    if (text.includes(process.env[name])) leaks.push({ file, credential: name });
  if (
    /gsk_[A-Za-z0-9]{40,}/.test(text) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)
  )
    leaks.push({ file, issue: "Credential-like literal" });
}
// Inspect all reachable history in memory. Never print patch contents or secret values.
const history = execFileSync("git", ["log", "--all", "-p", "--format=", "--no-ext-diff"], {
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});
for (const name of configured)
  if (history.includes(process.env[name])) leaks.push({ scope: "Git history", credential: name });
if (/gsk_[A-Za-z0-9]{40,}/.test(history))
  leaks.push({ scope: "Git history", issue: "Groq credential-like literal" });
if (leaks.length) {
  console.error("Potential secrets found (values withheld):", leaks);
  process.exitCode = 1;
} else
  console.log(
    "Credential scan passed: publishable files and all reachable Git history; " +
      configured.length +
      " configured private values checked. Secret values were not printed.",
  );
