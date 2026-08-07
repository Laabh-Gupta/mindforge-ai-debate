import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { Footer } from "@/components/mindforge/Footer";
import { trainingModes } from "@/lib/training-modes";

const title = "MindForge — Train Communication & Critical Thinking";
const description =
  "Practice debate, group discussion, interviews, public speaking, extempore, negotiation, case discussion and real-world simulations with an AI coach.";

export const Route = createFileRoute("/")({
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
  component: TrainingHubHome,
});

function TrainingHubHome() {
  return (
    <div className="min-h-screen">
      <FloatingNav variant="app" />

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-4">
        <header className="animate-rise">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                <Sparkle className="h-3.5 w-3.5 text-primary" />
                Training Hub
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                What will you train <span className="text-gradient">today?</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Eight ways to sharpen communication, reasoning and presence — each session ends
                with a detailed, multi-dimensional evaluation.
              </p>
            </div>
            <div className="glass flex shrink-0 items-center gap-3 rounded-2xl px-5 py-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-none">4,820 XP</p>
                <p className="text-xs text-muted-foreground">Analyst III · 12-day streak</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Choose your training room</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trainingModes.map((mode) => (
              <article
                key={mode.id}
                className="glass hover-lift flex flex-col rounded-3xl p-6 transition-colors"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand">
                  <mode.icon className="h-6 w-6 text-primary-foreground" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{mode.name}</h3>
                <p className="mt-1 text-xs tracking-wide text-primary uppercase">{mode.tagline}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {mode.description}
                </p>
                <Button
                  asChild
                  className="mt-6 h-11 w-full bg-gradient-brand text-primary-foreground"
                >
                  <Link to="/train/$mode" params={{ mode: mode.id }}>
                    Start <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="glass glow rounded-3xl px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Not sure where to begin?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
              Start with a classic debate — the AI will challenge your reasoning, flag fallacies,
              and show you exactly where your argument holds.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 h-12 bg-gradient-brand px-8 text-primary-foreground"
            >
              <Link to="/train/$mode" params={{ mode: "debate" }}>
                Start with Debate Arena <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
