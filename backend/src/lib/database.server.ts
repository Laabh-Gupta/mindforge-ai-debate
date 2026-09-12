import { Pool, type PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
const transactions = new AsyncLocalStorage<PoolClient>();
let pool: Pool | undefined;
export function getPool() {
  if (pool) return pool;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString)
    throw new Error("Set DATABASE_URL to your Supabase session-pooler connection string.");
  const connection = new URL(connectionString);
  if (
    process.env["NODE_ENV"] === "production" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(connection.hostname)
  ) {
    connection.searchParams.set("sslmode", "verify-full");
  }
  pool = new Pool({
    connectionString: connection.href,
    max: Math.max(1, Math.min(5, Number(process.env["PG_POOL_MAX"]) || 3)),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    onConnect: async (client) => {
      await client.query(
        "SET search_path TO mindforge, pg_catalog; SET statement_timeout TO 15000",
      );
    },
  });
  pool.on("error", () => console.warn("Database connection interrupted."));
  return pool;
}
export async function initializeDatabase() {
  const db = getPool();
  await db.query(`
    CREATE SCHEMA IF NOT EXISTS mindforge;
    REVOKE ALL ON SCHEMA mindforge FROM PUBLIC;
    CREATE TABLE IF NOT EXISTS mindforge.practice_sessions (
      user_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
      started_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
      completed_at BIGINT, status TEXT NOT NULL CHECK(status IN ('active','completed')),
      meaningful INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,id));
    CREATE INDEX IF NOT EXISTS practice_by_owner ON mindforge.practice_sessions(user_id,updated_at DESC);
    CREATE TABLE IF NOT EXISTS mindforge.practice_resets (user_id TEXT PRIMARY KEY, cleared_at BIGINT NOT NULL);
    CREATE TABLE IF NOT EXISTS mindforge.community_profiles (user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, listed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS mindforge.request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL);
  `);
}
/** Parameterized PostgreSQL statements, using the current account transaction when present. */
export function getDatabase() {
  return {
    prepare(sql: string) {
      let position = 0;
      const statement = sql.replace(/\?/g, () => "$" + ++position);
      const query = (...values: unknown[]) =>
        (transactions.getStore() || getPool()).query(statement, values);
      return {
        async get(...values: unknown[]) {
          return (await query(...values)).rows[0];
        },
        async all(...values: unknown[]) {
          return (await query(...values)).rows;
        },
        async run(...values: unknown[]) {
          return query(...values);
        },
      };
    },
  };
}
export async function withOwnerTransaction<T>(owner: string, work: () => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [owner]);
    const result = await transactions.run(client, work);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function consumeAccountLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const result = await getPool().query(
    `
    INSERT INTO mindforge.request_limits(key,count,expires_at) VALUES($1,1,$2)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE WHEN request_limits.expires_at <= $3 THEN 1 ELSE request_limits.count+1 END,
      expires_at=CASE WHEN request_limits.expires_at <= $3 THEN $2 ELSE request_limits.expires_at END
    RETURNING count,expires_at`,
    [key, now + windowMs, now],
  );
  // Bounded opportunistic cleanup; no timers that keep a free database awake.
  if (key === "ai:global" || key === "auth:global")
    await getPool().query(
      "DELETE FROM mindforge.request_limits WHERE key IN (SELECT key FROM mindforge.request_limits WHERE expires_at <= $1 LIMIT 100)",
      [now],
    );
  const row = result.rows[0];
  return {
    allowed: row.count <= max,
    retryAfter: Math.max(1, Math.ceil((Number(row.expires_at) - now) / 1000)),
  };
}
export async function closeDatabase() {
  await pool?.end();
  pool = undefined;
}
