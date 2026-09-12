import { practiceSearch } from "@/lib/practice-types";
import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/mindforge/ModulePage";
export const Route = createFileRoute("/debate")({
  validateSearch: practiceSearch,
  head: () => ({ meta: [{ title: "Debate Arena | MindForge" }] }),
  component: () => (
    <ModulePage
      modeId="debate"
      title="Debate Arena"
      subtitle="Understand the argument. Test the reasoning. Make a stronger case."
    />
  ),
});
