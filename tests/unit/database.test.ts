import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
let db: PGlite;
const userA = "11111111-1111-4111-8111-111111111111",
  userB = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const payload = {
  id,
  status: "completed",
  updatedAt: 1000,
  startedAt: 0,
  durationSeconds: 60,
  completedAt: 1000,
  modeId: "debate",
  topic: "Private transcript",
  turns: [],
  messages: [],
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values ('${userA}'),('${userB}');`);
  const migration = await readFile("supabase/migrations/202609110001_practice.sql", "utf8");
  await db.exec(migration);
  await db.exec(migration);
}, 30000);
afterAll(async () => {
  await db.close();
});
async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
test("migration is repeatable and saves an owned session", async () => {
  await asUser(userA);
  await db.query("select public.save_practice_session($1,$2)", [id, payload]);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(1);
});
test("another user cannot read, update, delete or take ownership of private sessions", async () => {
  await asUser(userB);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(0);
  expect(
    (
      await db.query("update public.practice_sessions set user_id=$1 where id=$2 returning id", [
        userB,
        id,
      ])
    ).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("delete from public.practice_sessions where id=$1 returning id", [id])).rows,
  ).toHaveLength(0);
  await expect(
    db.query("insert into public.practice_sessions(id,user_id,payload) values($1,$2,$3)", [
      crypto.randomUUID(),
      userA,
      payload,
    ]),
  ).rejects.toThrow();
});
test("late autosaves cannot replace completed reviews", async () => {
  await asUser(userA);
  await db.query("select public.save_practice_session($1,$2)", [
    id,
    { ...payload, status: "active", updatedAt: 2000 },
  ]);
  const { rows } = await db.query<{ status: string }>(
    "select payload->>'status' as status from public.practice_sessions",
  );
  expect(rows[0]?.status).toBe("completed");
});
test("public board exposes only opted-in names and totals", async () => {
  await asUser(userA);
  await db.query(
    "insert into public.community_profiles(user_id,display_name,listed) values($1,'Practice Member',true)",
    [userA],
  );
  await db.exec("reset role; set role anon");
  await expect(db.query("select * from public.practice_sessions")).rejects.toThrow();
  await expect(db.query("select * from public.community_profiles")).rejects.toThrow();
  const { rows } = await db.query("select * from public.practice_leaderboard('all')");
  expect(rows).toHaveLength(1);
  expect(Object.keys(rows[0]!)).toEqual(["display_name", "sessions", "xp"]);
});
test("invalid payloads are rejected at the database boundary", async () => {
  await asUser(userA);
  await expect(
    db.query("select public.save_practice_session($1,$2)", [
      id,
      { ...payload, durationSeconds: -1 },
    ]),
  ).rejects.toThrow();
});

test("clearing history rejects stale offline uploads but accepts new practice", async () => {
  await asUser(userA);
  const reset = await db.query<{ cutoff: string }>(
    "select public.clear_practice_history() as cutoff",
  );
  const cutoff = Number(reset.rows[0]!.cutoff);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(0);
  await db.query("select public.save_practice_session($1,$2)", [
    id,
    { ...payload, updatedAt: cutoff + 100 },
  ]);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(0);
  const fresh = crypto.randomUUID();
  await db.query("select public.save_practice_session($1,$2)", [
    fresh,
    { ...payload, id: fresh, startedAt: cutoff + 1, updatedAt: cutoff + 100 },
  ]);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(1);
  await asUser(userB);
  expect((await db.query("select * from public.practice_history_resets")).rows).toHaveLength(0);
  await db.query("select public.clear_practice_history()");
  await asUser(userA);
  expect((await db.query("select * from public.practice_sessions")).rows).toHaveLength(1);
});
