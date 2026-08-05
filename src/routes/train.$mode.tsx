import { createFileRoute, Link, useParams } from "@tanstack/react-router";

import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { ModeSession } from "@/components/mindforge/ModeSession";
import { getMode } from "@/lib/training-modes";

export const Route = createFileRoute("/train/$mode")({
  head: ({ params }) => {
    const mode = getMode(params.mode);
    const title = mode ? `${mode.name} — MindForge` : "Training — MindForge";
    const description =
      mode?.description ?? "Train real communication skills with an AI coach on MindForge.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ModePage,
});

function ModePage() {
  const { mode: modeId } = useParams({ from: "/train/$mode" });
  const mode = getMode(modeId);

  return (
    <div className="min-h-screen pb-10">
      <FloatingNav />
      <main className="mx-auto max-w-4xl px-5 pt-8">
        {mode ? (
          <ModeSession key={mode.id} mode={mode} />
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <h1 className="font-display text-xl font-bold">That training mode doesn't exist</h1>
            <Link to="/train" className="mt-3 inline-block text-sm text-primary">
              Back to the Training Hub
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}