import { spawn } from "node:child_process";
import { once } from "node:events";
import { testDatabase } from "./test-database.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3103";
const database = await testDatabase();
let server;
async function start() {
  server = spawn(process.execPath, ["backend/dist/index.mjs"], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: "3103",
      HOST: "127.0.0.1",
      NODE_ENV: "test",
      FRONTEND_ORIGIN: base,
      DATABASE_URL: database.url,
      PG_POOL_MAX: "1",
      AUTH_SECRET: "persistence-test-auth-secret-more-than-32-characters",
      SESSION_SECRET: "persistence-test-visitor-secret-more-than-32-characters",
      GROQ_API_KEY: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      SMTP_HOST: "",
    },
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error("Test server exited during startup.");
    try {
      if ((await fetch(base + "/api/health")).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not start.");
}
async function stop() {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
async function request(path, body, cookie = "") {
  return fetch(base + path, {
    headers: { origin: base, "content-type": "application/json", cookie },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
}
try {
  await start();
  const signup = await request("/api/auth/sign-up/email", {
    name: "Restart Check",
    email: "restart-" + crypto.randomUUID() + "@example.test",
    password: "A temporary restart test passphrase!",
  });
  assert.equal(signup.status, 200);
  const cookie = signup.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const id = crypto.randomUUID(),
    now = Date.now();
  const saved = await request(
    "/api/practice",
    {
      id,
      modeId: "debate",
      modeName: "Debate",
      topic: "Persistence check",
      startedAt: now,
      updatedAt: now,
      durationSeconds: 0,
      status: "active",
      difficulty: "intermediate",
      messages: [],
      turns: [],
    },
    cookie,
  );
  assert.equal(saved.status, 200);
  await stop();
  await start();
  const restored = await request("/api/practice", undefined, cookie);
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).sessions[0].id, id);
  console.log(
    "Restart check passed: signed-in session and private practice survive a fresh Node process.",
  );
} finally {
  await stop();
  await database.close();
}
