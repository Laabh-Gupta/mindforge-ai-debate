# MindForge

React + Vite frontend on Netlify, Fastify + TypeScript backend on Render, and the **existing Supabase PostgreSQL database**. Email/password and direct Google OAuth use Better Auth in the backend, independently of Supabase Auth. Guest practice stays available; account history syncs through the backend.

| Directory | Responsibility                                                                    |
| --------- | --------------------------------------------------------------------------------- |
| frontend/ | Static React app, practice UI, local guest history                                |
| backend/  | Authentication, ownership checks, PostgreSQL persistence, AI streaming and quotas |
| shared/   | Public practice schemas, evaluation types, participant metadata                   |
| supabase/ | Historical Supabase migrations; retained without changing existing data           |

## Run locally

Requires Node 22.13+ and Bun 1.4. Run commands from the repository root, which owns package.json and bun.lock:

```sh
cd /d/Projects/mindforge-ai-debate
bun install --frozen-lockfile
```

Supabase connects through the backend's pg driver. No Supabase frontend/SSR packages or NEXT_PUBLIC_SUPABASE variables are needed. Copy `backend/.env.example` to `backend/.env`, fill the Supabase connection string and secrets, then run in separate terminals:

```sh
bun run dev:backend
bun run dev
```

Frontend: http://127.0.0.1:3001. Backend: http://127.0.0.1:4000. Use the exact frontend host configured in FRONTEND_ORIGIN. No SQLite fallback exists. The old ignored data directory is preserved.

See [deployment instructions](docs/DEPLOYMENT.md) for Supabase, Netlify, Render, Google and email setup.

## Verification

`bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run test:e2e`, `bun run test:persistence`, `bun run test:import`.

Unit/integration tests use an isolated PostgreSQL-compatible PGlite wire server locally; the deployed backend always uses PostgreSQL through pg. CI additionally uses a real PostgreSQL service via TEST_DATABASE_URL. Browser tests start separate backend and static frontend servers.

The default chat and structured-review model is `openai/gpt-oss-120b` through Groq. Both are configurable in backend environment variables. Provider quotas apply in addition to app limits of 60 AI requests per signed visitor/hour and 600 globally/hour. Signed visitor limits are device-based; clearing cookies starts a new visitor, while the global budget still applies. Four simultaneous AI requests are allowed per backend process.

Secrets belong in ignored backend/.env locally and Render environment settings in production. Netlify receives only the public VITE_BACKEND_ORIGIN. Run `node --env-file=backend/.env scripts/verify-secrets.mjs` and `node --env-file=backend/.env scripts/verify-client.mjs` before publishing.

This is deployment configuration, not a claim of a live deployment. Free services may sleep or pause; see the deployment guide.
