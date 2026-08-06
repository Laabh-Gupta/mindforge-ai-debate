import { useServerFn } from "@tanstack/react-start";
import { Brain, ChevronDown, Compass, Ear, Lightbulb, Route } from "lucide-react";
import { useEffect, useState } from "react";

import type { ThinkingSteps } from "@/lib/evaluation-shared";
import { explainTurn } from "@/lib/session.functions";

export type ThinkingPair = {
  id: string;
  userTurn: string;
  aiTurn: string;
};

type Context = {
  modeId: string;
  modeName: string;
  topic: string;
  variant?: string | undefined;
};

/** Educational breakdowns are stable for a given turn, so they are fetched once. */
const cache = new Map<string, ThinkingSteps>();

const STEP_ICONS = [Ear, Compass, Lightbulb, Route] as const;

function StepRows({ steps }: { steps: ThinkingSteps }) {
  const rows = [
    { label: "What the AI heard", value: steps.heard },
    { label: "The move it made", value: `${steps.move} — ${steps.moveWhy}` },
    { label: "Why it matters", value: steps.principle },
    { label: "Your best next move", value: steps.nextMove },
  ];
  return (
    <ol className="mt-3 space-y-3">
      {rows.map((row, i) => {
        const Icon = STEP_ICONS[i] ?? Lightbulb;
        return (
          <li key={row.label} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{row.label}</p>
              <p className="mt-1 text-sm leading-relaxed">{row.value}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function useThinkingSteps(pair: ThinkingPair, context: Context, enabled: boolean) {
  const run = useServerFn(explainTurn);
  const [steps, setSteps] = useState<ThinkingSteps | null>(() => cache.get(pair.id) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !pair.aiTurn.trim()) return;
    const cached = cache.get(pair.id);
    if (cached) {
      setSteps(cached);
      return;
    }
    let cancelled = false;
    void run({
      data: {
        modeId: context.modeId,
        modeName: context.modeName,
        topic: context.topic,
        ...(context.variant ? { variant: context.variant } : {}),
        userTurn: pair.userTurn,
        aiTurn: pair.aiTurn,
      },
    })
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setFailed(true);
          return;
        }
        cache.set(pair.id, result);
        setSteps(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pair.id, pair.aiTurn]);

  return { steps, failed };
}

function Loading() {
  return (
    <div className="mt-3 space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded-full bg-secondary"
          style={{ width: `${90 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

/** One breakdown, rendered as a collapsible card under an AI message (mobile). */
export function ThinkingCard({
  pair,
  context,
  index,
}: {
  pair: ThinkingPair;
  context: Context;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const { steps, failed } = useThinkingSteps(pair, context, open);

  return (
    <div className="glass rounded-2xl px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <Brain className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-medium">Thinking View · turn {index + 1}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        (steps ? (
          <StepRows steps={steps} />
        ) : failed ? (
          <p className="mt-3 text-sm text-muted-foreground">
            The breakdown for this turn could not be generated.
          </p>
        ) : (
          <Loading />
        ))}
    </div>
  );
}

function PanelEntry({
  pair,
  context,
  index,
}: {
  pair: ThinkingPair;
  context: Context;
  index: number;
}) {
  const { steps, failed } = useThinkingSteps(pair, context, true);
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs tracking-widest text-primary uppercase">Turn {index + 1}</p>
      {steps ? (
        <StepRows steps={steps} />
      ) : failed ? (
        <p className="mt-3 text-sm text-muted-foreground">
          The breakdown for this turn could not be generated.
        </p>
      ) : (
        <Loading />
      )}
    </div>
  );
}

/** The docked desktop column: one entry per completed AI turn, newest first. */
export function ThinkingPanel({
  pairs,
  context,
}: {
  pairs: ThinkingPair[];
  context: Context;
}) {
  return (
    <aside className="sticky top-24 max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto pb-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-4 w-4 text-primary" /> Thinking View
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How each reply was reasoned — and how to answer it well.
        </p>
      </div>
      {pairs.length === 0 && (
        <p className="glass rounded-2xl p-4 text-sm text-muted-foreground">
          The breakdown of each reply will appear here as the session unfolds.
        </p>
      )}
      {[...pairs].reverse().map((pair) => (
        <PanelEntry
          key={pair.id}
          pair={pair}
          context={context}
          index={pairs.findIndex((p) => p.id === pair.id)}
        />
      ))}
    </aside>
  );
}