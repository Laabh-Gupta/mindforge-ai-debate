import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { consumeAccountLimit } from "./database.server";
const COOKIE = "mf_visitor";
function secret() {
  const key = process.env["SESSION_SECRET"];
  if (!key || key.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return key;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
function token(id: string, purpose: string, duration: number) {
  const payload = [id, purpose, Date.now() + duration].join(".");
  return payload + "." + sign(payload);
}
function verify(value: string | undefined, purpose: string) {
  if (!value || value.length > 250) return null;
  const parts = value.split(".");
  const [id, scope, expires, signature] = parts;
  if (
    parts.length !== 4 ||
    !id ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    scope !== purpose ||
    !expires ||
    !Number.isFinite(Number(expires)) ||
    Number(expires) <= Date.now() ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return null;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(sign(parts.slice(0, 3).join("."))))
    ? id
    : null;
}
export async function getVisitorId(request: Request) {
  return verify(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1),
    "visitor",
  );
}
export async function ensureVisitor(request: Request) {
  const existing = await getVisitorId(request);
  const id = existing || randomUUID();
  const cookie = existing
    ? null
    : COOKIE +
      "=" +
      token(id, "visitor", 30 * 86400000) +
      "; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000" +
      (new URL(request.url).protocol === "https:" ? "; Secure" : "");
  return { id, cookie };
}
export async function visitorCookie(request: Request) {
  return (await ensureVisitor(request)).cookie;
}
export function aiAccess(id: string) {
  return { token: token(id, "ai", 300000), expiresAt: Date.now() + 290000 };
}
export async function guardAiRequest(request: Request) {
  const allowed = process.env["FRONTEND_ORIGIN"];
  if (request.headers.get("origin") !== allowed)
    return new Response("Origin not allowed.", { status: 403 });
  const id = verify(request.headers.get("authorization")?.replace(/^Bearer /, ""), "ai");
  if (!id) return new Response("Refresh your practice connection.", { status: 401 });
  if (Number(request.headers.get("content-length")) > 262144)
    return new Response("Session too large.", { status: 413 });
  const global = await consumeAccountLimit(
    "ai:global",
    Number(process.env["AI_GLOBAL_REQUESTS_PER_HOUR"]) || 600,
    3600000,
  );
  const personal = global.allowed
    ? await consumeAccountLimit(
        "ai:" + id,
        Number(process.env["AI_REQUESTS_PER_HOUR"]) || 60,
        3600000,
      )
    : global;
  if (!personal.allowed)
    return new Response("The hourly practice limit has been reached. Please try again later.", {
      status: 429,
      headers: { "Retry-After": String(personal.retryAfter) },
    });
  return null;
}
