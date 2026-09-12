# MindForge

A communication practice app built with React, TanStack Start and Groq. Guest practice works without an account. Email/password and direct Google sign-in use Better Auth with a private SQLite database on your server. **No Supabase account, API, email service or database is required.**

## Run locally

Requires **Node 22.13+** (tested on 22.19) and **Bun 1.4.0**.

```sh
bun install --frozen-lockfile
bun run dev
```

If you do not already have an `.env`, copy `.env.example` to `.env` first. On PowerShell, use `Copy-Item .env.example .env` only when the destination does not exist. Keep existing credentials.

Set `GROQ_API_KEY` for AI practice. Set **two different random values** for `AUTH_SECRET` and `SESSION_SECRET`; generate each with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Keep those values in `.env`. Leave `APP_ORIGIN` blank for localhost development; the app uses the current local origin. Open the address Vite prints. Database tables are created automatically on first account use. Email registration and password sign-in work immediately, without SMTP or an emailed code.

## Accounts

### Email and password

Use **Sign in → Create an account**. Passwords are hashed by Better Auth; sessions use signed HttpOnly, SameSite cookies and expire after seven days. HTTPS deployments use Secure cookies. There is no Supabase mail quota. Sign-in does not send email.

Email ownership is not automatically verified at registration. Accounts do not gain privileges based on an email address. Google identities are never silently linked to an existing unverified account.

Account abuse limits are separate from AI usage: 10 authentication attempts per email/minute, 30 per signed visitor/minute, and 300 across the server/minute. Recovery mail is limited to 3 requests per email/15 minutes. Counters live in SQLite, survive restarts and do not trust client-supplied IP headers. A shared browser cookie can be reset, so both email and global limits are enforced.

### Direct Google sign-in

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), choose your project and configure the app's branding, audience and contact information. During testing, add the Google accounts that will test the app.
2. Create an OAuth client with application type **Web application**.
3. Add your app's origin to **Authorized JavaScript origins**. For the current local workspace, this is `http://127.0.0.1:3001`; use the exact origin shown by your dev server if its port differs.
4. Add **Authorized redirect URI**: `http://127.0.0.1:3001/api/auth/callback/google`. For production use `https://YOUR-DOMAIN/api/auth/callback/google`. Hostname, scheme, port and path must match exactly.
5. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, set `APP_ORIGIN` to the deployed origin in production, and restart the server. Google credentials are read at runtime, never put into browser code.
6. Click **Continue with Google**. The flow requests basic profile/email identity, uses OAuth state protection, and encrypts stored provider tokens.

If you already registered with email/password, sign in that way first and use **Profile → Connect Google** with the same email address. Automatic account linking is disabled to protect existing accounts. Google login needs your own OAuth credentials; the repository cannot provision them.

### Password recovery with your SMTP provider

Configure these server variables in `.env`:

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=MindForge <your-verified-sender@your-domain>
SMTP_REQUIRE_TLS=true
```

Use your provider's SMTP credentials or app password. Port 465 uses implicit TLS; other ports require STARTTLS by default. The sender must be permitted by your mail provider. Restart after changes. **Forgot password?** sends a single-use link valid for 30 minutes. Resetting revokes existing sessions. No reset link or recipient is logged.

SMTP is optional for ordinary signup/login, and required for recovery delivery. Without SMTP, the recovery screen reports that delivery is not configured. Provider-specific mail quotas still apply; there is no Supabase dependency.

## Portable production deployment

```sh
bun run build
node --env-file=.env .output/server/index.mjs
```

Set the following at runtime:

| Variable         | Purpose                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `GROQ_API_KEY`   | Private Groq credential                                                            |
| `AUTH_SECRET`    | At least 32 random characters; signs accounts and encrypts OAuth tokens            |
| `SESSION_SECRET` | Separate random secret of at least 32 characters for AI visitor cookies            |
| `APP_ORIGIN`     | Exact public origin, e.g. `https://practice.example.com`, without a trailing slash |
| `DATABASE_PATH`  | Private persistent SQLite path; defaults to `./data/mindforge.sqlite`              |
| `NODE_ENV`       | `production`                                                                       |
| `PORT`, `HOST`   | Usually `3000` and `0.0.0.0`                                                       |

Deploy the **whole `.output` directory** on a persistent Node server. Use **one application instance with a persistent disk**; an ephemeral serverless filesystem will lose accounts. No external database setup is required. Keep the database outside publicly served folders. Back up the data directory and signing secrets together: stop the app, copy the whole data directory, then restart. Never delete the volume during redeployment. Changing `AUTH_SECRET` can invalidate sessions and make existing encrypted OAuth tokens unreadable.

Use HTTPS and a reverse proxy that preserves the original host, allows streaming and permits requests lasting at least 120 seconds. Do not buffer `/api/session` or cache account/API responses or HTML. Microphone recording requires HTTPS outside localhost.

### Docker

With Docker Engine running and production values in `.env`:

```sh
docker compose up --build -d
docker compose logs --tail 100 mindforge
```

The image builds with Bun and runs as an unprivileged Node user. Secrets enter at runtime. Compose mounts a named **mindforge-data** volume at `/app/data`, so accounts and history survive container replacement. Do not use `docker compose down -v` unless you intend to erase accounts and history.

The HTTP health endpoint `GET /api/health` reports process health and configuration presence. It does not authenticate against Google, Groq or SMTP, or prove database availability. Complete a sign-in and a short practice session when validating a deployment.

## AI models and limits

| Task                                                                                  | Model                              |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| Live conversation in all training modes                                               | `openai/gpt-oss-120b` through Groq |
| Reviews, scoring, observer transcripts, Thinking View, topics and moderator summaries | `openai/gpt-oss-120b` through Groq |

The former chat model was `llama-3.3-70b-versatile`. Groq [retired it on August 16, 2026](https://console.groq.com/docs/deprecations), along with `llama-3.1-8b-instant`, for free/developer accounts. Reinstating that ID would break requests. GPT-OSS 120B is also listed on [Groq's free plan](https://console.groq.com/docs/rate-limits): the published defaults currently list 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. Your account's limits page is authoritative. A model choice alone does not change your billing tier; use a Groq Free account if you require free-only usage.

MindForge additionally enforces **60 AI requests per visitor/hour** and **600 per server process/hour**. Reviews, topics and Thinking View count too. Account login and saved-history operations do not consume this quota. Provider limits may be reached earlier; failures preserve practice and offer retry.

`GROQ_CHAT_MODEL` and `GROQ_STRUCTURED_MODEL` remain configurable in `.env`. Overrides must support the configured Groq generation features; structured tasks require structured outputs. There is no silent provider switch or paid fallback.

Optional `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` make AI counters survive process restarts. This does not make the SQLite account backend suitable for distributed replicas. Redis failures deny new AI requests. Visitor cookies can be reset, so retain provider account limits as well.

## Data and history

Guest practice stays in the browser. Signing in uses a separate account cache and private server history. Guest transcripts are not silently attached to an account.

Sessions autosave locally and sync to the server. Network errors preserve the device copy and show a retry action. Completed reviews cannot be overwritten by older drafts. Account ownership comes from the server session; a queued request from a previous login is rejected if the current account changed.

**Settings → Export all practice data** downloads your history. Clearing history resets derived progress and writes a server deletion marker; stale offline copies cannot restore old sessions.

Earlier guest score-only records migrate once, without inventing missing transcripts or durations. The files in `supabase/` and their PostgreSQL migration tests are retained as **legacy reference only**. Existing Supabase accounts/cloud records are not automatically migrated: this backend creates independent accounts. The old service is not contacted or modified. Export old account data before retiring an existing Supabase deployment.

## Secrets and Git

- Private deployment credentials belong in `.env` locally or your host's runtime secret store.
- `.env`, environment variants, SQLite databases, the private data directory, QA output and logs are ignored by Git and excluded from Docker build context.
- `.env.example` contains variable names and placeholders only.
- Password hashes and sessions necessarily live in the private database; plaintext account passwords are not stored.
- Never give private credentials a `VITE_` prefix.

Before pushing, run:

```sh
node --env-file=.env scripts/verify-secrets.mjs
node --env-file=.env scripts/verify-client.mjs
```

The first scans publishable files and reachable Git history without printing secret values. The second checks the built browser assets for configured server credentials. These checks are focused checks, not a claim to detect every possible secret format.

## Product behavior

- Eight interactive training modes plus Observer Mode, with resumable drafts, adaptive difficulty, contextual follow-ups and simulated events.
- Fifteen-dimension AI reviews, contribution and question-level feedback, custom scoring and suggested next practice.
- Completion needs at least 20 words of the user's contribution. Each completion earns 100 XP; every 500 XP advances a level. Streaks follow local calendar days. Only visible active practice time counts.
- Real activity, analytics, achievements and daily goals; new users start with zero progress.
- An opt-in public leaderboard exposes names and totals, never transcripts. It reflects self-recorded practice.
- Responsive charcoal/green UI, self-hosted fonts, light/system themes, larger text, reduced motion and keyboard navigation. The sidebar keeps the logo and progress fixed, with a subtle navigation scroll thumb.
- TXT, clipboard, native sharing, browser Print / Save as PDF, and JSON history exports.
- Local audio recording, pause/resume, playback and download. Audio is not uploaded or evaluated; written submissions receive feedback.

AI voice analysis, transcription, human multiplayer, friend/college leagues, billing and verified competitions remain future work.

## Verification

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bunx playwright install chromium
bun run test:e2e
```

After building, `node scripts/verify-persistence.mjs` checks that accounts and history survive a Node process restart on test port 3103.

The browser suite starts the production server on port 3100 with an isolated test database and deterministic AI fixtures. Account tests exercise real Better Auth/SQLite requests, password hashing, ownership boundaries, Google OAuth initiation, forged callback rejection, account throttling and SMTP recovery using a local test mail server. The Google token exchange still needs a real OAuth application to verify.

Optional live checks are `scripts/live-ai-check.mjs`, `scripts/live-modes-check.mjs` and `scripts/live-room-check.mjs`. Set `TEST_BASE_URL` for your running local app. They make real provider calls and save ignored QA artifacts under `output/qa`.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the requirement mapping and validation record.

## Development notes

This project is connected to Lovable. Keep pushed branches working and do not rewrite published Git history. The requested `design-taste-frontend` skill informed the typography, spacing, responsive layout and accessibility; existing Radix components provide interactions.
