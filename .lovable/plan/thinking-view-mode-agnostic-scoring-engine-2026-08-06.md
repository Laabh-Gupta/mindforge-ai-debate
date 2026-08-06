# Thinking View + Mode-Agnostic Scoring Engine

Two additions that work the same way across Debate, Group Discussion, Case Discussion, Interview and Negotiation.

## 1. Thinking View panel

A toggleable panel next to the conversation that teaches the reasoning behind each AI turn. It never reveals system prompts — it shows a short educational breakdown generated for that specific exchange.

For each AI turn it shows:
- **What the AI heard** — a one-line restatement of your claim
- **The move it made** — the named technique (e.g. counterexample, burden-of-proof shift, anchoring, probing follow-up) with one sentence on why that move fits here
- **Why it matters** — the reasoning principle behind the move, in plain language
- **Your best next move** — a concrete suggestion for how to answer well

Behaviour:
- Off by default; a "Thinking View" toggle sits in the session header. The choice is remembered between sessions.
- Steps load lazily per turn after the reply finishes, so the conversation never waits on them.
- On desktop it docks as a right-hand column; on mobile it becomes a collapsible card under each AI message.
- Mode-aware vocabulary: debate talks about objections and fallacies, interview about competency signals, negotiation about anchors and concessions, case/GD about structuring and building on others.
- Public Speaking and Extempore keep their current single-delivery flow (no per-turn exchange to explain).

## 2. Mode-agnostic scoring engine with evaluation profiles

Today the AI returns 15 raw scores and "overall" is whatever the model felt. The new engine separates measurement from judgement:

- The AI still returns the 15 raw dimension scores once per session.
- An **evaluation profile** — a set of weights over those 15 dimensions — produces the overall score, the ranked strengths and the headline meters.
- Changing the profile recomputes everything **instantly in the browser**, with no new AI call and no re-running of the session.

Profiles shipped:
- One default profile per mode (e.g. Debate weights logical reasoning, evidence and persuasion; Interview weights confidence, relevance and communication; GD weights leadership, teamwork and listening; Negotiation weights persuasion, initiative and critical thinking; Case weights structure-oriented dimensions).
- Cross-cutting presets: Balanced, Placement / MBA, UPSC & Civil Services, Public Speaking, Leadership.
- **Custom profile**: sliders for each of the 15 dimensions, saved locally, usable in any mode.

On the evaluation page:
- A profile selector at the top; the overall score, dimension ordering and the strongest/weakest callouts update live as you switch or drag sliders.
- Each dimension row shows its weight under the current profile, so it is clear why the overall moved.
- A "Compare profiles" strip shows the same session scored under two or three profiles side by side.
- The dashboard's long-term meters use the same weighting, so history stays consistent with the selected profile.

## Technical notes

- `src/lib/evaluation-profiles.ts` (new): weight maps, per-mode defaults, preset profiles, `applyProfile(scores, profile)` returning weighted overall + ranked dimensions, plus local-storage load/save for the custom profile. Pure functions, no AI.
- `src/lib/evaluation-shared.ts`: add `EvaluationProfile`, `ProfileId`, storage key; `StoredSession` gains an optional `profileId`.
- `src/lib/evaluation.server.ts`: prompt updated so `overallPerformance` is reported as a raw holistic dimension; weighted overall is computed client-side. Adds `ThinkingStepsSchema` and `buildThinkingPrompt(modeId, topic, variant, userTurn, aiTurn)`.
- `src/lib/session.functions.ts`: new `explainTurn` server function returning the structured thinking steps (Lovable AI, structured output, same model as evaluation).
- `src/components/mindforge/ThinkingView.tsx` (new): panel/card rendering, per-turn lazy fetch with in-memory cache keyed by message id.
- `src/components/mindforge/ModeSession.tsx`: header toggle, layout split for the panel, wiring of turn pairs; unchanged for `speech` modes.
- `src/routes/evaluation.tsx`: profile selector, weight sliders, live recompute, comparison strip.
- `src/lib/skills-store.ts`: store raw scores (already does) and apply the active profile when aggregating dashboard meters.
