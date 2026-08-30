import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand glow">
        <Flame className="h-5 w-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">MindForge</span>
      )}
    </Link>
  );
}