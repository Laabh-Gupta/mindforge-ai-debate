import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Brain, Gauge, MessagesSquare, Sparkle, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { Footer } from "@/components/mindforge/Footer";
import { trainingModes } from "@/lib/training-modes";

const title = "MindForge — Train Communication & Critical Thinking";
const description =
  "Practice debate, group discussion, interviews, public speaking, extempore, negotiation, case discussion and real-world simulations with an AI coach that challenges your reasoning.";

const FEATURES = [
  {
    icon: Brain,
    title: "An AI that argues back",
    body: "Every reply restates your claim, then attacks its weakest joint — no generic chatbot filler.",
  },
  {
    icon: MessagesSquare,
    title: "Rooms, not chatbots",
    body: "Moderators, panels and stakeholders with their own agendas, interruptions and pressure.",
  },
  {
    icon: Gauge,
    title: "Fifteen-dimension scoring",
    body: "Reasoning, evidence, clarity, leadership, listening and more — reweighted by your goal.",
  },
  {
    icon: Target,
    title: "Built for real stakes",
    body: "Placements, MBA interviews, UPSC boards, investor rooms and boardroom crises.",
  },
];

const STEPS = [
  { n: "01", title: "Pick a room", body: "Debate, GD, interview, negotiation or a full simulation." },
  { n: "02", title: "Hold your ground", body: "The AI probes, follows up and refuses easy answers." },
  { n: "03", title: "Read the verdict", body: "Scores, fallacies, strengths and the exact next drill." },
];

const TESTIMONIALS = [
  {
    quote: "The GD room interrupts you. That alone prepared me more than ten mock sessions.",
    name: "Ishita R.",
    detail: "MBA aspirant",
  },
  {
    quote: "It caught a circular argument I'd been making for months without noticing.",
    name: "Kabir S.",
    detail: "Law student",
  },
  {
    quote: "The UPSC board simulation felt uncomfortably close to the real panel.",
    name: "Meera P.",
    detail: "Civil services aspirant",
  },
];

const FAQS = [
  {
    q: "Is MindForge only for debate?",
    a: "No. It covers debate, group discussion, interviews, public speaking, extempore, negotiation, case discussion and real-world simulations.",
  },
  {
    q: "Do I need a microphone?",
    a: "Not yet. Sessions run in text today; voice delivery and recording are on the roadmap.",
  },
  {
    q: "How is my performance scored?",
    a: "Every session is scored on fifteen dimensions, then reweighted by the evaluation profile you choose — debate, interview, UPSC, leadership and more.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. You can train for free while MindForge is in early access.",
  },
];

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },

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
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <FloatingNav variant="marketing" />

      <main>
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-10 text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkle className="h-3.5 w-3.5 text-primary" />
            AI communication & critical thinking platform
          </span>
          <h1 className="animate-rise mt-6 font-display text-4xl font-bold sm:text-5xl lg:text-6xl">
            Think sharper by being <span className="text-gradient">challenged</span>, not answered
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:text-base">
            MindForge puts you in real rooms — debates, group discussions, interviews, boardrooms
            and summits — with an AI that understands your argument first, then tests it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 bg-gradient-brand px-7 text-primary-foreground">
              <Link to="/train">
                Start training <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7">
              <Link to="/signup">Sign up free</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 px-7">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Why it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="glass hover-lift rounded-3xl p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Eight training rooms</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trainingModes.map((mode) => (
              <div key={mode.id} className="glass rounded-2xl p-5">
                <mode.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{mode.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{mode.tagline}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <article key={s.n} className="glass rounded-3xl p-6">
                <p className="font-display text-3xl font-bold text-gradient">{s.n}</p>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="testimonials" className="mx-auto max-w-6xl px-5 py-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">What trainees say</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="glass rounded-3xl p-6">
                <p className="text-sm leading-relaxed">“{t.quote}”</p>
                <footer className="mt-5 text-xs text-muted-foreground">
                  <span className="text-foreground">{t.name}</span> · {t.detail}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">FAQ</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20">
          <div className="glass glow rounded-3xl px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Your first argument won't survive. That's the point.
            </h2>
            <Button
              asChild
              size="lg"
              className="mt-7 h-12 bg-gradient-brand px-8 text-primary-foreground"
            >
              <Link to="/train">
                Start training <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
