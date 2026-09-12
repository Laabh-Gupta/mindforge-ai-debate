import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/mindforge/AppShell";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Access | MindForge" }] }),
  component: () => (
    <AppShell title="Practice access" subtitle="All training modes are available in this release.">
      <section className="mf-panel max-w-xl p-7">
        <h2 className="text-xl font-medium">Start with the conversation</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Practice as a guest, receive a review, and track your progress in this browser. AI usage
          is subject to the hourly limits of this deployment. There are no paid plans or checkout in
          this release.
        </p>
        <Button asChild className="mt-6">
          <Link to="/train">Choose a training mode</Link>
        </Button>
      </section>
    </AppShell>
  ),
});
