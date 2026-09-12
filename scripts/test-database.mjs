import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
export async function testDatabase() {
  if (process.env.TEST_DATABASE_URL)
    return { url: process.env.TEST_DATABASE_URL, close: async () => {} };
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 5 });
  await server.start();
  return {
    url: "postgresql://postgres:postgres@" + server.getServerConn() + "/postgres?sslmode=disable",
    close: async () => {
      await server.stop();
      await db.close();
    },
  };
}
