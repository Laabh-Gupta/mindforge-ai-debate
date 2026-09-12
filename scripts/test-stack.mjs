import { spawn } from "node:child_process";
import { preview } from "vite";
import { testDatabase } from "./test-database.mjs";
const db = await testDatabase();
process.env.API_PROXY_TARGET = "http://127.0.0.1:4100";
const child = spawn(process.execPath, ["backend/dist/index.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: "4100",
    FRONTEND_ORIGIN: "http://127.0.0.1:3100",
    DATABASE_URL: db.url,
    PG_POOL_MAX: "1",
    AUTH_SECRET: "test-auth-secret-for-browser-checks-123456789",
    SESSION_SECRET: "test-visitor-secret-for-browser-checks-123456789",
    GROQ_API_KEY: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    RESEND_API_KEY: "",
  },
});
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    if ((await fetch("http://127.0.0.1:4100/api/health")).ok) break;
  } catch {}
  if (attempt === 99) throw new Error("Test backend did not start");
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const frontend = await preview({ preview: { host: "127.0.0.1", port: 3100, strictPort: true } });
async function stop() {
  frontend.httpServer.close();
  child.kill();
  await db.close();
  process.exit();
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
