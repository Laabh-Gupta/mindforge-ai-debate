import { writeFile } from "node:fs/promises";
if (process.env.NETLIFY === "true") {
  const raw = process.env.VITE_BACKEND_ORIGIN;
  if (!raw) throw new Error("Set VITE_BACKEND_ORIGIN to your HTTPS Render origin in Netlify.");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.origin !== raw || url.username || url.password)
    throw new Error("VITE_BACKEND_ORIGIN must be an HTTPS origin with no trailing slash.");
  await writeFile(
    "frontend/dist/_redirects",
    "/api/* " + url.origin + "/api/:splat 200!\n/* /index.html 200\n",
  );
  await writeFile(
    "frontend/dist/_headers",
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: microphone=(self), camera=(), geolocation=()
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${url.origin}; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: no-cache
`,
  );
}
