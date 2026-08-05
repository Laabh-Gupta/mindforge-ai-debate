import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye } from "lucide-react";

import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { observerMode, trainingModes } from "@/lib/training-modes";

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
    <div className="min-h-screen pb-20">
      <FloatingNav />

      <main className="mx-auto max-w-6xl px-5 pt-10">
        <header className="animate-rise">
          <p className="text-xs tracking-widest text-primary uppercase">Training Hub</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Choose how you want to be <span className="text-gradient">pushed</span> today
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Eight ways to train real communication — every session is contextual, in-domain, and
            ends with a fifteen-dimension evaluation of how you actually performed.
          </p>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {trainingModes.map((mode) => (
            <Link
              key={mode.id}
              to="/train/$mode"
              params={{ mode: mode.id }}
              className="glass hover-lift flex flex-col rounded-3xl p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary">
                <mode.icon className="h-5 w-5 text-primary" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{mode.name}</h2>
              <p className="mt-1 text-xs tracking-wide text-primary uppercase">{mode.tagline}</p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{mode.description}</p>
              <span className="mt-5 inline-flex items-center text-sm font-medium">
                {mode.ctaLabel} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          ))}

          <Link
            to="/observer"
            className="hover-lift flex flex-col rounded-3xl border border-primary/40 bg-gradient-brand/10 p-6"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{observerMode.name}</h2>
            <p className="mt-1 text-xs tracking-wide text-primary uppercase">
              {observerMode.tagline}
            </p>
            <p className="mt-3 flex-1 text-sm text-muted-foreground">{observerMode.description}</p>
            <span className="mt-5 inline-flex items-center text-sm font-medium">
              Watch and judge <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}