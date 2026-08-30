import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/mindforge/AppShell";
import { MODULE_NAV } from "@/lib/app-nav";

const title = "Training Hub — MindForge";
const description =
  "Train debate, group discussions, interviews, public speaking, extempore, case discussions, negotiation and analysis with an AI communication coach.";

export const Route = createFileRoute("/train/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingHub,
});

function TrainingHub() {
  return (
    <AppShell
      width="wide"
      title="Training Hub"
      subtitle="Every room is contextual, in-domain, and ends with a fifteen-dimension evaluation."
    >
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULE_NAV.map((item) => (
          <Link key={item.to} to={item.to} className="glass hover-lift flex flex-col rounded-3xl p-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand">
              <item.icon className="h-6 w-6 text-primary-foreground" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">{item.label}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.hint}</p>
            <span className="mt-5 inline-flex items-center text-sm font-medium">
              Open <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}