import { spawn } from "node:child_process";
import { testDatabase } from "./test-database.mjs";
const db = await testDatabase();
try {
  const child = spawn("bun", ["test", "tests/unit"], {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, DATABASE_URL: db.url, PG_POOL_MAX: "1" },
  });
  process.exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
} finally {
  await db.close();
}
