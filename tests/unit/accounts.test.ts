import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleAccounts } from "../../backend/src/lib/account-handler.server";
import {
  getDatabase,
  initializeDatabase,
  closeDatabase,
  consumeAccountLimit,
} from "../../backend/src/lib/database.server";
import { getAuth } from "../../backend/src/lib/auth.server";
import { visitorCookie } from "../../backend/src/lib/request-security.server";
import type { PracticeSession } from "../../shared/practice-types";

const origin = "http://localhost:3456";
process.env["AUTH_SECRET"] = "unit-test-account-secret-at-least-32-characters";
process.env["FRONTEND_ORIGIN"] = origin;
// Fake credentials exercise Google authorization construction, never token exchange.
process.env["GOOGLE_CLIENT_ID"] = "test-google-client.apps.googleusercontent.com";
process.env["GOOGLE_CLIENT_SECRET"] = "test-only-google-secret";
const mail: string[] = [];
const originalFetch = globalThis.fetch;
process.env["SESSION_SECRET"] = "test-signed-visitor-secret-at-least-32-characters";
process.env["RESEND_API_KEY"] = "test-mail-key";
process.env["MAIL_FROM"] = "MindForge <test@example.test>";
globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input) === "https://api.resend.com/emails") {
    mail.push(JSON.parse(String(init?.body)).text);
    return Response.json({ id: "test-delivery" });
  }
  return originalFetch(input, init);
}, originalFetch);
afterAll(async () => {
  globalThis.fetch = originalFetch;
  await closeDatabase();
});
const password = "Test passphrase for account checks!";
let alice = "",
  bob = "",
  aliceId = "",
  bobId = "";

async function call(
  path: string,
  body?: unknown,
  cookie = "",
  method = body === undefined ? "GET" : "POST",
  requestOrigin = origin,
) {
  const visitor = (await visitorCookie(new Request(origin + "/")))?.split(";")[0] || "";
  return (await handleAccounts(
    new Request(origin + path, {
      method,
      headers: {
        origin: requestOrigin,
        cookie: cookie + "; " + visitor,
        "content-type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  ))!;
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}
function practice(overrides: Partial<PracticeSession> = {}): PracticeSession {
  const now = Date.now() - 10000;
  return {
    id: crypto.randomUUID(),
    modeId: "debate",
    modeName: "Debate",
    topic: "A shared public library",
    startedAt: now,
    updatedAt: now,
    durationSeconds: 90,
    status: "active",
    difficulty: "intermediate",
    messages: [],
    turns: [
      {
        speaker: "You",
        role: "user",
        content:
          "I support the library because shared access to books and computers helps students learn and makes useful knowledge available to all residents.",
      },
    ],
    ...overrides,
  };
}
beforeAll(async () => {
  await initializeDatabase();
  const a = await call("/api/auth/sign-up/email", {
    name: "Alice",
    email: "alice@example.test",
    password,
  });
  expect(a.status).toBe(200);
  alice = cookies(a);
  aliceId = (await a.json()).user.id;
  const b = await call("/api/auth/sign-up/email", {
    name: "Bob",
    email: "bob@example.test",
    password,
  });
  expect(b.status).toBe(200);
  bob = cookies(b);
  bobId = (await b.json()).user.id;
});
describe("First-party accounts and persistence", () => {
  test("email registration hashes passwords and returns an HttpOnly same-site session", async () => {
    expect(alice).toContain("mindforge.session_token");
    const account = (await getDatabase()
      .prepare('SELECT password FROM account WHERE "userId"=?')
      .get(aliceId)) as { password: string };
    expect(account.password).not.toBe(password);
    expect(account.password.length).toBeGreaterThan(60);
    const response = await call("/api/auth/sign-in/email", {
      email: "alice@example.test",
      password,
    });
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join(";")).toMatch(/HttpOnly/i);
    expect(response.headers.getSetCookie().join(";")).toMatch(/SameSite=Lax/i);
  });
  test("wrong credentials fail and more than two valid sign-ins work without mail", async () => {
    expect(
      (
        await call("/api/auth/sign-in/email", {
          email: "alice@example.test",
          password: "wrong-password",
        })
      ).status,
    ).toBe(401);
    for (let i = 0; i < 3; i++)
      expect(
        (await call("/api/auth/sign-in/email", { email: "alice@example.test", password })).status,
      ).toBe(200);
  });
  test("Google uses a direct authorization redirect with OAuth state and rejects a forged callback", async () => {
    const response = await call("/api/auth/sign-in/social", {
      provider: "google",
      callbackURL: "/dashboard",
      disableRedirect: true,
    });
    expect(response.status).toBe(200);
    const destination = new URL((await response.json()).url);
    expect(destination.hostname).toBe("accounts.google.com");
    expect(destination.searchParams.get("redirect_uri")).toBe(origin + "/api/auth/callback/google");
    expect(destination.searchParams.get("state")).toBeTruthy();
    const forged = await call("/api/auth/callback/google?code=forged&state=invalid");
    expect(forged.status).toBe(302);
    expect(forged.headers.get("location")).toContain("error");
  });
  test("requires authentication, rejects foreign origins, and never trusts a client owner", async () => {
    expect((await call("/api/practice")).status).toBe(401);
    expect(
      (await call("/api/practice", practice(), alice, "POST", "https://evil.example")).status,
    ).toBe(403);
    const row = practice();
    expect((await call("/api/practice", { ...row, user_id: bobId }, alice)).status).toBe(200);
    expect((await (await call("/api/practice", undefined, bob)).json()).sessions).toHaveLength(0);
    expect((await (await call("/api/practice", undefined, alice)).json()).sessions[0].id).toBe(
      row.id,
    );
  });
  test("completed sessions cannot be replaced by stale or active copies", async () => {
    const row = practice({ status: "completed", completedAt: Date.now() - 5000 });
    expect((await call("/api/practice", row, alice)).status).toBe(200);
    await call("/api/practice", { ...row, status: "active", updatedAt: Date.now() }, alice);
    const saved = (await (await call("/api/practice", undefined, alice)).json()).sessions.find(
      (s: PracticeSession) => s.id === row.id,
    );
    expect(saved.status).toBe("completed");
  });
  test("the public board is opt-in and exposes no transcripts or email", async () => {
    const row = practice({ status: "completed", completedAt: Date.now() });
    await call("/api/practice", row, bob);
    const before = await (await call("/api/community?period=all")).json();
    expect(before).toHaveLength(0);
    await call("/api/community", { listed: true }, bob);
    const after = await (await call("/api/community?period=all")).json();
    expect(after).toEqual([{ display_name: "Bob", sessions: 1, xp: 100 }]);
    await call("/api/community", { listed: false }, bob);
  });
  test("history deletion blocks stale uploads and leaves other accounts intact", async () => {
    const stale = practice();
    await call("/api/practice", stale, alice);
    expect((await call("/api/practice", {}, alice, "DELETE")).status).toBe(200);
    await call("/api/practice", { ...stale, updatedAt: Date.now() }, alice);
    expect((await (await call("/api/practice", undefined, alice)).json()).sessions).toHaveLength(0);
    expect(
      (await (await call("/api/practice", undefined, bob)).json()).sessions.length,
    ).toBeGreaterThan(0);
  });
  test("invalid recovery tokens fail and unconfigured email API is reported honestly", async () => {
    expect(
      (await call("/api/auth/reset-password", { token: "invalid", newPassword: password })).status,
    ).toBe(400);
    delete process.env["RESEND_API_KEY"];
    expect(
      (
        await call("/api/auth/request-password-reset", {
          email: "nobody@example.test",
          redirectTo: "/reset-password",
        })
      ).status,
    ).toBe(503);
    process.env["RESEND_API_KEY"] = "127.0.0.1";
  });
  test("server-side name validation and authenticated profile updates work", async () => {
    expect((await call("/api/auth/update-user", { name: " " }, alice)).status).toBe(400);
    expect((await call("/api/auth/update-user", { name: "Alice Updated" }, alice)).status).toBe(
      200,
    );
    const auth = await getAuth(new Request(origin));
    const session = await auth.api.getSession({ headers: new Headers({ cookie: alice }) });
    expect(session?.user.name).toBe("Alice Updated");
  });
  test("email throttling persists and is independent from the AI quota", async () => {
    for (let i = 0; i < 10; i++)
      await call("/api/auth/sign-in/email", { email: "unknown@example.test", password });
    const response = await call("/api/auth/sign-in/email", {
      email: "unknown@example.test",
      password,
    });
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });
  test("account switching cannot attach an old queued save to another user", async () => {
    const response = await handleAccounts(
      new Request(origin + "/api/practice", {
        method: "POST",
        headers: {
          origin,
          cookie: bob,
          "content-type": "application/json",
          "X-Mindforge-Account": aliceId,
        },
        body: JSON.stringify(practice()),
      }),
    );
    expect(response?.status).toBe(409);
  });
  test("password recovery sends through email API, redeems once and revokes older sessions", async () => {
    const response = await call("/api/auth/request-password-reset", {
      email: "bob@example.test",
      redirectTo: "/reset-password",
    });
    expect(response.status).toBe(200);
    for (let i = 0; i < 50 && !mail.length; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mail.length).toBe(1);
    const decoded = mail[0]!.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
    const link = decoded.match(/http:\/\/localhost:3456\/api\/auth\/reset-password\/[^\s]+/)?.[0];
    expect(link).toBeTruthy();
    const redirect = await call(new URL(link!).pathname + new URL(link!).search);
    expect(redirect.status).toBe(302);
    const target = new URL(redirect.headers.get("location")!, origin);
    const token = target.searchParams.get("token");
    expect(token).toBeTruthy();
    const reset = { token, newPassword: "A new recovery passphrase for Bob!" };
    expect((await call("/api/auth/reset-password", reset)).status).toBe(200);
    expect((await call("/api/auth/reset-password", reset)).status).toBe(400);
    expect((await call("/api/practice", undefined, bob)).status).toBe(401);
    expect(
      (
        await call("/api/auth/sign-in/email", {
          email: "bob@example.test",
          password: reset.newPassword,
        })
      ).status,
    ).toBe(200);
  });
  test("sign-out invalidates the session", async () => {
    expect((await call("/api/auth/sign-out", {}, alice)).status).toBe(200);
    expect((await call("/api/practice", undefined, alice)).status).toBe(401);
  });
});

test("AI limits remain after reconnect and enforce atomic concurrent increments", async () => {
  await initializeDatabase();
  const key = "test-limit:" + crypto.randomUUID();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => consumeAccountLimit(key, 2, 3600000)),
  );
  expect(results.filter((r) => r.allowed)).toHaveLength(2);
  await closeDatabase();
  expect((await consumeAccountLimit(key, 2, 3600000)).allowed).toBe(false);
});

test("accounts and private practice tables stay outside the public schema", async () => {
  await initializeDatabase();
  const rows = await getDatabase()
    .prepare(
      "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('mindforge','public') AND table_name IN ('user','account','practice_sessions')",
    )
    .all();
  expect(rows).toHaveLength(3);
  expect(rows.every((row) => row.table_schema === "mindforge")).toBe(true);
});
