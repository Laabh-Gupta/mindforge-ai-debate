import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const state = globalThis as typeof globalThis & { __mindforgeDatabase?: DatabaseSync };
export function getDatabase() {
  if (state.__mindforgeDatabase) return state.__mindforgeDatabase;
  const path = resolve(process.env["DATABASE_PATH"] || "data/mindforge.sqlite");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      user_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
      started_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      completed_at INTEGER, status TEXT NOT NULL CHECK(status IN ('active','completed')),
      meaningful INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id,id)
    );
    CREATE INDEX IF NOT EXISTS practice_by_owner ON practice_sessions(user_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS practice_resets (user_id TEXT PRIMARY KEY, cleared_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS community_profiles (
      user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, listed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS request_limits (
      key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
    );
  `);
  state.__mindforgeDatabase = db;
  return db;
}

/** A synchronous SQLite write is atomic across processes sharing this database. */
export function consumeAccountLimit(key: string, max: number, windowMs: number) {
  const db = getDatabase();
  const now = Date.now();
  db.prepare("DELETE FROM request_limits WHERE expires_at <= ?").run(now);
  const row = db
    .prepare(
      `
    INSERT INTO request_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count,expires_at
  `,
    )
    .get(key, now + windowMs) as { count: number; expires_at: number };
  return {
    allowed: row.count <= max,
    retryAfter: Math.max(1, Math.ceil((row.expires_at - now) / 1000)),
  };
}
