const COOKIE = "mf_visitor";
const LIMIT_BYTES = 262144;
const devState = globalThis as typeof globalThis & { __mindforgeDevSecret?: string };
const localSecret =
  process.env["NODE_ENV"] === "production"
    ? ""
    : (devState.__mindforgeDevSecret ??= crypto.randomUUID() + crypto.randomUUID());
const buckets = new Map<string, { count: number; until: number }>();
const encoder = new TextEncoder();
function secret() {
  const value = process.env["SESSION_SECRET"];
  return process.env["NODE_ENV"] === "production"
    ? value && value.length >= 32
      ? value
      : null
    : value || localSecret;
}
async function sign(value: string, key: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
export async function getVisitorId(request: Request) {
  const key = secret();
  if (!key) return null;
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!token || token.length > 200) return null;
  const [id, expires, signature] = token.split(".");
  if (!id || !expires || !signature || Number(expires) < Date.now() || !/^[0-9a-f-]{36}$/.test(id))
    return null;
  const expected = await sign(id + "." + expires, key);
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference ? null : id;
}
export async function visitorCookie(request: Request) {
  const key = secret();
  if (!key || (await getVisitorId(request))) return null;
  const payload = crypto.randomUUID() + "." + (Date.now() + 86400000 * 30);
  return `${COOKIE}=${payload}.${await sign(payload, key)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function incrementLocal(key: string, limit: number, now = Date.now()) {
  if (buckets.size >= 10000) for (const [k, b] of buckets) if (b.until <= now) buckets.delete(k);
  if (!buckets.has(key) && buckets.size >= 10000) return false;
  const previous = buckets.get(key);
  const bucket = previous && previous.until > now ? previous : { count: 0, until: now + 3600000 };
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= limit;
}
async function withinLimit(key: string, limit: number) {
  const url = process.env["UPSTASH_REDIS_REST_URL"],
    token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) return incrementLocal(key, limit);
  const bucket = `mindforge:${Math.floor(Date.now() / 3600000)}:${key}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      "EVAL",
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],3600) end; return n",
      1,
      bucket,
    ]),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Rate limit service unavailable");
  const data = (await response.json()) as { result?: number; error?: string };
  if (typeof data.result !== "number") throw new Error("Rate limit service unavailable");
  return data.result <= limit;
}
export async function guardAiRequest(request: Request) {
  if (!secret()) return new Response("AI practice is temporarily unavailable.", { status: 503 });
  const origin = request.headers.get("origin");
  const allowed = process.env["APP_ORIGIN"] || new URL(request.url).origin;
  if (!origin || origin !== allowed || request.headers.get("sec-fetch-site") === "cross-site")
    return new Response("This request must come from MindForge.", { status: 403 });
  if (Number(request.headers.get("content-length")) > LIMIT_BYTES)
    return new Response("This session is too large. Start a new session.", { status: 413 });
  const copy = request.clone();
  const reader = copy.body?.getReader();
  if (reader) {
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > LIMIT_BYTES) {
          void reader.cancel();
          return new Response("This session is too large. Start a new session.", { status: 413 });
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  const id = await getVisitorId(request);
  if (!id) return new Response("Refresh this page before starting AI practice.", { status: 403 });
  try {
    const personal = Number(process.env["AI_REQUESTS_PER_HOUR"]) || 60;
    const global = Number(process.env["AI_GLOBAL_REQUESTS_PER_HOUR"]) || 600;
    if (!(await withinLimit("global", global)) || !(await withinLimit(id, personal)))
      return new Response("The hourly practice limit has been reached. Please try again later.", {
        status: 429,
        headers: { "Retry-After": "3600" },
      });
  } catch {
    return new Response("AI practice is temporarily unavailable. Please try again later.", {
      status: 503,
    });
  }
  return null;
}
