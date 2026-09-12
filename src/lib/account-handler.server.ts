import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { getAuth, accountOrigin, googleConfigured, mailConfigured } from "./auth.server";
import { consumeAccountLimit, getDatabase } from "./database.server";
import { getVisitorId } from "./request-security.server";
import { PracticeSchema } from "./practice-schema";
import { canComplete, type PracticeSession } from "./practice-types";

const json = (data: unknown, status = 200) => Response.json(data, { status });
export async function handleAccounts(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/auth/") && !["/api/practice", "/api/community"].includes(path))
    return null;
  const mutation = !["GET", "HEAD"].includes(request.method);
  let body: unknown;
  if (mutation) {
    if (request.headers.get("origin") !== accountOrigin(request))
      return json({ message: "Origin not allowed." }, 403);
    const maxBytes = path === "/api/practice" ? 1048576 : 16384;
    const reader = request.clone().body?.getReader();
    let size = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return json({ message: "Request too large." }, 413);
        }
      }
    }
    try {
      body = size ? await request.clone().json() : {};
    } catch {
      return json({ message: "Invalid JSON." }, 400);
    }
  }
  if (path === "/api/auth/config" && request.method === "GET") {
    return json({ email: true, google: googleConfigured(), passwordReset: mailConfigured() });
  }
  if (path.startsWith("/api/auth/")) {
    if (mutation) {
      if (path.endsWith("/sign-up/email") || path.endsWith("/update-user")) {
        const name = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(body);
        if (!name.success) return json({ message: "Use a name between 1 and 60 characters." }, 400);
      }
      const visitor = (await getVisitorId(request)) || "no-visitor";
      const parsedEmail = z.object({ email: z.string().email().max(254) }).safeParse(body);
      const recovery =
        path.endsWith("/request-password-reset") || path.endsWith("/send-verification-email");
      const limits = [
        consumeAccountLimit("auth:global", 300, 60000),
        consumeAccountLimit("auth:visitor:" + visitor, 30, 60000),
      ];
      if (parsedEmail.success) {
        const hash = createHash("sha256")
          .update(parsedEmail.data.email.trim().toLowerCase())
          .digest("hex");
        limits.push(
          consumeAccountLimit(
            (recovery ? "auth:mail:" : "auth:email:") + hash,
            recovery ? 3 : 10,
            recovery ? 900000 : 60000,
          ),
        );
      }
      const denied = limits.find((limit) => !limit.allowed);
      if (denied)
        return Response.json(
          { message: "Too many attempts. Please wait and try again." },
          { status: 429, headers: { "Retry-After": String(denied.retryAfter) } },
        );
      if (recovery && !mailConfigured())
        return json({ message: "Email recovery is not configured on this deployment yet." }, 503);
      if (
        (path.endsWith("/sign-in/social") || path.endsWith("/link-social")) &&
        !googleConfigured()
      )
        return json(
          {
            message:
              "Google sign-in is not configured on this deployment yet. You can use email and password.",
          },
          503,
        );
    }
    return (await getAuth(request)).handler(request);
  }
  const db = getDatabase();
  // Only aggregate, explicitly opted-in data is public.
  if (path === "/api/community" && request.method === "GET" && !url.searchParams.has("mine")) {
    const period = url.searchParams.get("period") || "week";
    if (!["week", "month", "all"].includes(period))
      return json({ message: "Invalid period." }, 400);
    const since = period === "all" ? 0 : Date.now() - 86400000 * (period === "week" ? 7 : 30);
    const entries = db
      .prepare(
        `
      SELECT c.display_name, COUNT(*) AS sessions, COUNT(*)*100 AS xp
      FROM community_profiles c JOIN practice_sessions p ON p.user_id=c.user_id
      WHERE c.listed=1 AND p.meaningful=1 AND p.completed_at>=?
      GROUP BY c.user_id ORDER BY xp DESC, c.display_name ASC LIMIT 100
    `,
      )
      .all(since);
    return json(entries);
  }
  const auth = await getAuth(request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ message: "Sign in to access your saved practice." }, 401);
  const owner = session.user.id;
  // A queued save from an older account must never be attached to a new login.
  const expectedOwner = request.headers.get("X-Mindforge-Account");
  if (expectedOwner && expectedOwner !== owner)
    return json({ message: "The signed-in account changed. Please retry." }, 409);
  if (path === "/api/community") {
    if (request.method === "GET")
      return json(
        db.prepare("SELECT listed FROM community_profiles WHERE user_id=?").get(owner) || {
          listed: 0,
        },
      );
    if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
    const parsed = z.object({ listed: z.boolean() }).strict().safeParse(body);
    if (!parsed.success) return json({ message: "Invalid profile setting." }, 400);
    db.prepare(
      `INSERT INTO community_profiles(user_id,display_name,listed) VALUES(?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET listed=excluded.listed,display_name=excluded.display_name`,
    ).run(owner, session.user.name.slice(0, 60), Number(parsed.data.listed));
    return json({ ok: true });
  }
  const reset = () =>
    Number(
      (
        db.prepare("SELECT cleared_at FROM practice_resets WHERE user_id=?").get(owner) as
          { cleared_at?: number } | undefined
      )?.cleared_at || 0,
    );
  if (request.method === "GET") {
    const offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ message: "Invalid page." }, 400);
    const rows = db
      .prepare(
        "SELECT payload FROM practice_sessions WHERE user_id=? ORDER BY id LIMIT 100 OFFSET ?",
      )
      .all(owner, offset) as { payload: string }[];
    return json({ sessions: rows.map((row) => JSON.parse(row.payload)), clearedAt: reset() });
  }
  if (request.method === "DELETE") {
    const clearedAt = Date.now();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM practice_sessions WHERE user_id=?").run(owner);
      db.prepare(
        "INSERT INTO practice_resets(user_id,cleared_at) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET cleared_at=excluded.cleared_at",
      ).run(owner, clearedAt);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return json({ clearedAt });
  }
  if (request.method !== "POST") return json({ message: "Method not allowed." }, 405);
  const parsed = PracticeSchema.safeParse(body);
  if (!parsed.success) return json({ message: "Invalid practice session." }, 400);
  const practice = parsed.data as PracticeSession;
  if (practice.startedAt > Date.now() + 60000 || practice.updatedAt > Date.now() + 60000)
    return json({ message: "Invalid session timestamp." }, 400);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (practice.startedAt > reset()) {
      db.prepare(
        `INSERT INTO practice_sessions(user_id,id,payload,started_at,updated_at,completed_at,status,meaningful)
        VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET
        payload=excluded.payload,updated_at=excluded.updated_at,completed_at=excluded.completed_at,
        status=excluded.status,meaningful=excluded.meaningful
        WHERE NOT (practice_sessions.status='completed' AND excluded.status='active')
        AND (excluded.updated_at>practice_sessions.updated_at OR
          (excluded.status='completed' AND practice_sessions.status='active'))`,
      ).run(
        owner,
        practice.id,
        JSON.stringify(practice),
        practice.startedAt,
        practice.updatedAt,
        practice.completedAt ?? null,
        practice.status,
        Number(practice.status === "completed" && canComplete(practice)),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return json({ ok: true });
}
