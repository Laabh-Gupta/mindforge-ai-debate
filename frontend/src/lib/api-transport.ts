const backend = (import.meta.env["VITE_BACKEND_ORIGIN"] || "").replace(/\/$/, "");
let warmedUntil = 0;
let warming: Promise<void> | undefined;
export function ensureBackend() {
  if (!backend || warmedUntil > Date.now()) return Promise.resolve();
  return (warming ??= (async () => {
    window.dispatchEvent(new CustomEvent("mindforge:connection", { detail: true }));
    try {
      const response = await fetch(backend + "/api/health", {
        credentials: "omit",
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) throw new Error("The practice server is unavailable. Please retry.");
      warmedUntil = Date.now() + 60000;
    } finally {
      warming = undefined;
      window.dispatchEvent(new CustomEvent("mindforge:connection", { detail: false }));
    }
  })());
}
export const accountFetch: typeof fetch = async (input, init) => {
  await ensureBackend();
  return fetch(input, init);
};
let capability: { token: string; expiresAt: number } | undefined;
let acquiring: Promise<void> | undefined;
export const aiFetch: typeof fetch = async (input, init) => {
  await ensureBackend();
  if (!capability || capability.expiresAt <= Date.now()) {
    await (acquiring ??= (async () => {
      try {
        const response = await fetch("/api/access", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) throw new Error("Could not connect to practice. Please retry.");
        capability = await response.json();
      } finally {
        acquiring = undefined;
      }
    })());
  }
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    window.location.origin,
  );
  const headers = new Headers(init?.headers);
  headers.set("Authorization", "Bearer " + capability!.token);
  // Long AI responses bypass Netlify's proxy timeout. The token grants AI access only.
  return fetch((backend || window.location.origin) + url.pathname, {
    ...init,
    credentials: "omit",
    headers,
  });
};
