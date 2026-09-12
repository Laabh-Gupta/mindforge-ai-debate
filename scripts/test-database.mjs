import { setImmediate } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
/** The wire server closes its listener before queued socket close callbacks finish. */
export async function closeTestDatabase(server, db) {
  await server.stop();
  // Let disconnected clients finish their cleanup while the engine is still alive.
  await setImmediate();
  await db.runExclusive(async () => {});
  await setImmediate();
  await db.close();
}
export async function testDatabase() {
  if (process.env.TEST_DATABASE_URL)
    return { url: process.env.TEST_DATABASE_URL, close: async () => {} };
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 5 });
  await server.start();
  return {
    url: "postgresql://postgres:postgres@" + server.getServerConn() + "/postgres?sslmode=disable",
    close: async () => {
      await closeTestDatabase(server, db);
    },
  };
}
