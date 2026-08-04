import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Quote, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { Footer } from "@/components/mindforge/Footer";
import { features, steps, testimonials } from "@/lib/mindforge-data";
import heroImage from "@/assets/hero-mind.jpg";

const title = "MindForge — Debate an AI That Won't Let You Win Easily";
const description =
  "Sharpen critical thinking, reasoning and interview performance by debating an AI that challenges your logic, flags fallacies and scores every argument.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <FloatingNav variant="marketing" />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-10 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-rise">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
              <Sparkle className="h-3.5 w-3.5 text-primary" />
              Duolingo for critical thinking
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Sharpen Your Mind.
              <br />
              <span className="text-gradient">Challenge Every Idea.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Debate with AI, discover logical fallacies, improve reasoning, and become a better
              thinker.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-gradient-brand px-7 text-primary-foreground glow"
              >
                <Link to="/debate">
                  Start Debating <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7">
                <a href="#how-it-works">Learn More</a>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
              {[
                ["18k+", "Debates run"],
                ["47", "Fallacies detected"],
                ["6", "Skill dimensions"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-bold">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-float">
            <div className="glass overflow-hidden rounded-3xl p-2">
              <img
                src={heroImage}
                alt="Illustration of a glowing neural network shaped like a brain"
                width={1280}
                height={1024}
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Built to argue back, not agree
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Most chatbots answer questions. MindForge tests whether your reasoning survives contact
            with the other side.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title: t, description: d }) => (
              <article key={t} className="glass hover-lift rounded-2xl p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.step} className="glass hover-lift relative rounded-2xl p-6">
                <span className="font-display text-5xl font-bold text-gradient opacity-70">
                  {i + 1}
                </span>
                <p className="mt-3 text-xs tracking-widest text-muted-foreground uppercase">
                  {s.step}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Thinkers in training</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="glass hover-lift rounded-2xl p-6">
                <Quote className="h-6 w-6 text-primary" />
                <blockquote className="mt-4 text-sm leading-relaxed">{t.quote}</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-4">
          <div className="glass glow rounded-3xl px-6 py-14 text-center sm:px-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to be proven wrong?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Pick a motion, state your case, and see how long your reasoning holds.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 bg-gradient-brand px-8 text-primary-foreground"
            >
              <Link to="/signup">Start Debating</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
