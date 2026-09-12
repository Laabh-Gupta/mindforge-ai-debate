# MindForge implementation record

Updated 11 September 2026.

The two supplied documents were used as product requirements and development history. Their older sprint-only, manual-copying and preserve-the-original-UI instructions were distinguished from the current request to implement the complete application with a cleaner UI. The selected launch shape is a portable deployment with guest practice.

## Requirement coverage

| Area              | Implemented behavior                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Debate            | Contextual Socratic turns, explicit clarification handling, evidence-type selection, difficulty, Thinking View and review                                              |
| Group discussion  | Existing moderator/cast retained, distinct participant turns, stay-silent control, participation counts, moderator closing and contribution feedback                   |
| Interviews        | HR, MBA, RBI, UPSC, consulting, finance, product, startup and technical formats; context-based follow-ups and question-level reviews                                   |
| Public speaking   | Topic-specific speech coaching, pacing guidance, local recorder and written-submission review                                                                          |
| Extempore         | Generated topic, preparation/speaking countdowns, saved phase and remaining time                                                                                       |
| Negotiation       | Configurable counterpart style, scenario context, concessions and trade-off feedback                                                                                   |
| Case discussion   | Case framing, probing questions, recommendations and evidence-oriented review                                                                                          |
| Simulation        | Custom scenarios and preset rooms, user role, stakeholder turns and explicit simulated events                                                                          |
| Observer          | Generated multi-participant discussion, five analysis questions, saved answers and analysis review                                                                     |
| Resume/history    | Separate record IDs, exact-history links, full messages/context, drafts, duration and relevant mode state                                                              |
| Evaluation        | Fifteen raw dimensions, strengths, weaknesses, reasoning issues, contribution analysis, question-by-question feedback and next topic                                   |
| Custom scoring    | Preset and custom weights, instant preview, explicit save, weights restored with each review; completion/XP unchanged                                                  |
| Progress          | Actual completed sessions, debates, visible practice time, calendar streaks, 100 XP per completion and deterministic levels                                            |
| Dashboard         | Zero/new-user state, daily goal, resume, quick start, weekly activity, next focus, recent history and rotating challenge                                               |
| Analytics/profile | Period filters, skill averages, four-week trend, activity readiness, weekly report, real name and history filtering                                                    |
| Achievements      | Nine badges derived from actual activity and evaluation records                                                                                                        |
| Leaderboard       | Optional public membership, real opted-in names and totals, week/month/all-time filters; no transcripts exposed                                                        |
| Preferences       | Dark/light/system themes, goal, difficulty, response language, scoring profile, reduced motion and larger text                                                         |
| Exports           | TXT, clipboard, native share, printable PDF report, weekly report and complete JSON history export                                                                     |
| Voice             | Actual local recording, pause/resume, stop, playback, elapsed time and audio download; no audio uploads                                                                |
| Accounts          | First-party email/password, direct Google OAuth, profile editing and SMTP recovery; no Supabase dependency; guest use remains available                                |
| Persistence       | Validated browser records, owner-separated caches, authenticated SQLite sync, retries, account-switch guards and durable account-history deletion markers              |
| Server            | Server-only credentials, request/schema limits, same-origin checks, signed guest cookies, quotas, cancellation, safe provider errors and bounded retries               |
| Deployment        | Standalone Node/Nitro build, compressed assets, unprivileged Docker image, persistent data volume, environment template, health endpoint and CI                        |
| UI                | Charcoal and green palette, restrained spacing and typography, self-hosted fonts, responsive sidebar/drawer, accessible Radix interactions and safe Markdown rendering |

## Validation record

- TypeScript application and test/config checks pass.
- Original implementation: **25 unit/legacy-database tests passed**, including migration reapplication, RLS isolation, opt-in leaderboard visibility, terminal completion, durable deletion against stale offline uploads, progress calculations, legacy migration and request validation.
- Original implementation: **10 Chromium browser tests passed**: empty guest state, navigation, streaming lifecycle, saved draft/resume, exactly-once completion, minimum practice time, responsive layout, preferences, keyboard drawer, custom re-scoring, PDF/TXT exports, cross-tab clearing, legacy import, audio recording lifecycle and accessibility.
- Live Groq exchanges and saved evaluations succeeded for all nine modes. The simulation check also generated a Thinking View and a scenario event; the GD check produced a moderator close and contribution summary.
- Live provider failures were observed and handled without losing conversations or awarding duplicate XP. Invalid structured generations receive one bounded recovery attempt; service/usage failures leave a retry action.
- Production Node build and local production server were exercised. The browser suite runs against the production output.
- Lighthouse mobile run on the local production dashboard: **90 performance, 100 accessibility, 100 best practices, 100 SEO**. This is a local lab measurement, not a guarantee for a particular hosting network.
- Axe checks found no serious/critical violations on the dashboard, interview setup, settings and profile in both themes.
- The exported PDF was generated through the app, text extracted, and all three pages rendered and visually inspected.
- Desktop and mobile UI screenshots were inspected. No private Groq credential or server-only prompt text was found in the public build.
- ESLint passes with no errors. Existing component-export/React effect dependency warnings remain; formatting is consistent.
- Docker Engine was not running in this environment, so the container image was not built or launched. The equivalent standalone Node output was built and run successfully.
- The current account backend uses Better Auth and SQLite. Supabase migrations remain historical reference only; no live Supabase data was modified. Real Google token exchange and external SMTP delivery require the deployment's own credentials.

QA captures and live test outputs are stored locally under ignored `output/qa/`. They include fictional test conversations, not seeded product data.

## Account and sidebar follow-up

The follow-up replaces Supabase authentication and history access with Better Auth and the Node SQLite driver. Application code and dependencies no longer use Supabase. Ordinary signup/login requires no email code or SMTP service. Google uses a direct OAuth flow; existing email users connect it explicitly from their profile. Passwords are hashed, cookies are HttpOnly, provider tokens are encrypted and password resets revoke sessions.

**38 unit/database tests and 13 production Chromium tests pass.** TypeScript and the standalone production build pass. Thirteen account integration tests exercise real authentication, private persistence, safe account switching, tampered OAuth callbacks, email throttling and local SMTP recovery with single-use tokens. The browser suite adds email signup/login/profile/logout, Google configuration feedback, and independent sidebar scrolling. UI screenshots confirm the fixed logo/progress and restrained navigation thumb on desktop, plus readable mobile signup. A fresh Node-process restart preserved both an authenticated session and its private practice record. A live Groq conversation and structured review also passed after the authentication changes. The final mobile Lighthouse signup audit scored 79 performance and 100 for accessibility, best practices and SEO; this is separate from the earlier dashboard audit.

The previous chat model, llama-3.3-70b-versatile, is absent from the configured Groq account and was retired by Groq on August 16, 2026. Both AI roles continue to use openai/gpt-oss-120b, which is available on Groq's Free plan. MindForge's 60 visitor/hour and 600 server/hour AI caps remain; account operations use separate persistent limits.

Credential scans found no configured private values in publishable files, reachable Git history or public build assets. AUTH_SECRET and SESSION_SECRET were generated into the ignored local .env. SQLite data, WAL files, QA captures and environment files are excluded from Git and Docker build context. Google/SMTP fields are prepared but no external account was provisioned.

## Deployment handoff

Follow [README.md](README.md). Supply the Groq key, distinct AUTH_SECRET and SESSION_SECRET values, the public origin and a persistent private SQLite path. Email/password accounts work without an external service. Direct Google sign-in needs Google OAuth credentials; recovery needs SMTP. Use one server instance with a persistent disk. Optional Redis makes AI quota counters survive restarts.

No site has been published, no commits have been pushed, and no published Git history has been rewritten.

## Deliberately future capabilities

The briefs explicitly describe AI voice analysis as future work. Recordings remain local and written answers receive coaching; there is no claim to measure pronunciation or vocal delivery. Speech transcription, real-time human multiplayer, friend/college leagues and paid subscriptions are also not represented as working features. The public leaderboard measures self-recorded practice, not identity-verified competition.

Guest history belongs to a browser and is not silently merged into an account. Export it before clearing browser storage. AI evidence coaching does not retrieve or verify external sources; the prompts tell the model not to fabricate citations or research.
