import type { ReactNode } from "react";

import { AppShell } from "./AppShell";
import { ModeSession } from "./ModeSession";
import { getMode, type ModeId } from "@/lib/training-modes";

/**
 * Shared body for every dedicated training-module page.
 * Pages supply their own copy and optional side panel; the session engine,
 * layout and chrome are never duplicated.
 */
export function ModulePage({
  modeId,
  title,
  subtitle,
  aside,
}: {
  modeId: ModeId;
  title: string;
  subtitle: string;
  aside?: ReactNode;
}) {
  const mode = getMode(modeId);

  return (
    <AppShell title={title} subtitle={subtitle} width="wide">
      {aside && <div className="mb-8">{aside}</div>}
      {mode ? (
        <ModeSession key={mode.id} mode={mode} />
      ) : (
        <p className="text-sm text-muted-foreground">This module isn't available yet.</p>
      )}
    </AppShell>
  );
}

/** Small reusable strip of chips used by module pages to show their variants. */
export function ChipRow({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}