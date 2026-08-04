# Real Socratic debate engine for MindForge

Replace the static placeholder debate service with a genuine AI opponent powered by Lovable AI, driven by a strict Socratic reasoning protocol so every reply stays inside the user's actual topic (mythology, history, philosophy, economics, law, science, politics, literature).

## What changes for the user

- The AI first restates the user's argument ("If I'm understanding correctly, you're arguing that...") before challenging it.
- One acknowledgement, one strongest counterargument, one specific follow-up question per reply — no lists of objections, no generic prompts.
- Full conversation memory: no repeated questions, no repeated counterarguments, natural build-up across turns.
- Clarification requests ("what do you mean?") get a plain-language explanation of the previous point, never a repeat.
- No invented statistics, fake studies, or "pilot programme" filler. Uncertainty is stated honestly.
- Replies stream in live instead of waiting on a fixed delay, with a typing indicator while the AI reasons.
- The result page scores the real transcript (logic, evidence, clarity, confidence, bias, communication) plus real strengths, weaknesses, fallacies and suggestions from that debate — no more fixed demo numbers.

## Technical approach

**1. Chat server route — `src/routes/api/chat.ts`**
- TanStack server route using the AI SDK (`streamText`, `convertToModelMessages`) against a Lovable AI Gateway provider helper in a new `src/lib/ai-gateway.server.ts` (`@ai-sdk/openai-compatible`, `LOVABLE_API_KEY` read inside the handler).
- Model: a current Gemini Flash generation on the gateway — fast, strong reasoning, long context for full transcripts.
- Accepts `{ messages, topic }`; the motion is injected into the system prompt.
- Returns `result.toUIMessageStreamResponse(...)`; surfaces 429 / 402 as explicit errors.

**2. System prompt — `src/lib/debate-prompt.ts`**
- Encodes the 11-step protocol: understand → acknowledge → single strongest counterargument → one high-quality question → clarification handling → memory → domain adaptation → natural voice → challenge ideas not people → teach reasoning concepts → no placeholders or fabrication.
- Includes the internal reasoning checklist as a private planning step, explicitly marked as never shown in output.
- Domain rule: infer the subject from the motion plus transcript and reason only with evidence native to that domain.
- Output shape rule: 3–6 short conversational paragraphs, varied openings, exactly one question at the end.

**3. Debate room — `src/routes/debate.tsx`**
- Switch from the local `messages`/`thinking` state machine to `useChat` with `DefaultChatTransport({ api: "/api/chat" })`, keyed by the chosen motion.
- Opening challenge comes from the model (seeded first turn on the motion) rather than a hard-coded template.
- Render `message.parts` text; keep the existing bubble styling, turn counter, sticky composer, typing dots, and Finish Debate flow.
- Toast on gateway errors (rate limit, credits, network).

**4. Scoring — `src/lib/debate-score.functions.ts` + `src/routes/result.tsx`**
- `createServerFn` that takes the transcript and returns structured scores and insights via `Output.object` with a small unconstrained schema, wrapped in a `NoObjectGeneratedError` fallback.
- Transcript passed from the debate room to `/result` via router state; existing demo data used only when someone opens `/result` directly.

**5. Cleanup**
- `src/services/ai-debate.ts` reduced to shared types; all canned rebuttal, probe and evidence arrays deleted.