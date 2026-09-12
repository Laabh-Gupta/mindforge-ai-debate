import { closeTestDatabase } from "./test-database.mjs";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const directory = await mkdtemp(join(tmpdir(), "mindforge-import-test-"));
const file = join(directory, "fixture.sqlite");
const source = new DatabaseSync(file);
source.exec(`CREATE TABLE user(id TEXT PRIMARY KEY,name TEXT,email TEXT,emailVerified INTEGER,createdAt INTEGER,updatedAt INTEGER);
INSERT INTO user VALUES('11111111-1111-4111-8111-111111111111','Import Test','import@example.test',1,1700000000000,1700000000000);
CREATE TABLE account(id TEXT PRIMARY KEY,accountId TEXT,providerId TEXT,userId TEXT,password TEXT,createdAt INTEGER,updatedAt INTEGER);
INSERT INTO account VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','credential','11111111-1111-4111-8111-111111111111','preserve-this-password-hash',1700000000000,1700000000000);`);
source.close();
const db = await PGlite.create();
const wire = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
await wire.start();
async function run() {
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/import-sqlite.ts", file], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@" + wire.getServerConn() + "/postgres",
      PG_POOL_MAX: "1",
      FRONTEND_ORIGIN: "http://127.0.0.1:3001",
      AUTH_SECRET: "import-test-auth-secret-at-least-32-characters",
      SESSION_SECRET: "import-test-session-secret-at-least-32-characters",
    },
  });
  return new Promise((resolve) => child.on("exit", resolve));
}
try {
  assert.equal(await run(), 0);
  const user = (await db.query('SELECT * FROM mindforge."user"')).rows[0];
  assert.equal(user.emailVerified, true);
  assert.equal(new Date(user.createdAt).getTime(), 1700000000000);
  assert.equal(
    (await db.query("SELECT password FROM mindforge.account")).rows[0].password,
    "preserve-this-password-hash",
  );
  assert.notEqual(await run(), 0);
  assert.equal((await db.query('SELECT * FROM mindforge."user"')).rows.length, 1);
  console.log(
    "Import check passed: timestamps, verification and password hashes preserved; nonempty target refused.",
  );
} finally {
  await closeTestDatabase(wire, db);
  // Delete only this generated fixture, then its now-empty temporary directory.
  await rm(file);
  await (await import("node:fs/promises")).rmdir(directory);
}
