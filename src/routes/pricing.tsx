import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/mindforge/FloatingNav";
import { Footer } from "@/components/mindforge/Footer";

const title = "Pricing — MindForge";
const description =
  "MindForge pricing: start free, upgrade for unlimited simulations, deeper evaluations and team plans.";

export const Route = createFileRoute("/pricing")({
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
  component: PricingPage,
});

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    note: "Forever",
    features: ["3 sessions a week", "Debate & extempore", "Basic evaluation"],
  },
  {
    name: "Pro",
    price: "₹499",
    note: "per month",
    features: [
      "Unlimited sessions",
      "All eight modules",
      "15-dimension evaluation",
      "Thinking View & profiles",
    ],
    featured: true,
  },
  {
    name: "Campus",
    price: "Custom",
    note: "for colleges",
    features: ["Cohort leaderboards", "Faculty dashboard", "Placement-ready reports"],
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen">
      <FloatingNav variant="marketing" />
      <main className="mx-auto max-w-5xl px-5 pt-14 pb-20">
        <header className="text-center">
          <p className="text-xs tracking-widest text-primary uppercase">Pricing</p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Train free. Upgrade when you're serious.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Plans are indicative while MindForge is in early access — everything is currently
            available to try.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`glass flex flex-col rounded-3xl p-7 ${
                plan.featured ? "border border-primary/50 glow" : ""
              }`}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-3 font-display text-3xl font-bold">{plan.price}</p>
              <p className="text-xs text-muted-foreground">{plan.note}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-7 h-11 w-full bg-gradient-brand text-primary-foreground"
              >
                <Link to="/signup">Get started</Link>
              </Button>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}