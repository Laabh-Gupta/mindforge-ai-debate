import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { initializeDatabase, getPool, closeDatabase } from "../backend/src/lib/database.server";
import { getAuth } from "../backend/src/lib/auth.server";
const file = process.argv[2];
if (!file)
  throw new Error(
    "Pass the existing SQLite path. Stop the backend and use an empty target schema.",
  );
const source = new DatabaseSync(resolve(file), { readOnly: true });
const tables = [
  "user",
  "account",
  "session",
  "verification",
  "practice_sessions",
  "practice_resets",
  "community_profiles",
];
try {
  await initializeDatabase();
  await getAuth(new Request(process.env["FRONTEND_ORIGIN"] || "http://127.0.0.1:3001"));
  const target = await getPool().connect();
  try {
    await target.query("BEGIN");
    await target.query("SELECT pg_advisory_xact_lock(98171325)");
    for (const table of tables) {
      const count = await target.query('SELECT count(*)::int AS n FROM mindforge."' + table + '"');
      if (count.rows[0].n)
        throw new Error("Target schema is not empty. Import stopped without overwriting records.");
    }
    for (const table of tables) {
      const exists = source
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      if (!exists) continue;
      const columns = (
        await target.query(
          "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='mindforge' AND table_name=$1",
          [table],
        )
      ).rows as { column_name: string; data_type: string }[];
      const rows = source.prepare('SELECT * FROM "' + table + '"').all();
      for (const row of rows) {
        const used = columns.filter((column) => Object.hasOwn(row, column.column_name));
        const values = used.map((column) => {
          const value = row[column.column_name];
          if (value === null || value === undefined) return null;
          if (column.data_type.includes("timestamp"))
            return new Date(
              typeof value === "number" || typeof value === "bigint"
                ? Number(value)
                : String(value),
            );
          if (column.data_type === "boolean") return Boolean(value);
          return value;
        });
        await target.query(
          'INSERT INTO mindforge."' +
            table +
            '" (' +
            used.map((c) => '"' + c.column_name + '"').join(",") +
            ") VALUES (" +
            used.map((_, i) => "$" + (i + 1)).join(",") +
            ")",
          values,
        );
      }
      console.log(table + ": " + rows.length + " records imported.");
    }
    await target.query("COMMIT");
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  } finally {
    target.release();
  }
} finally {
  source.close();
  await closeDatabase();
}
