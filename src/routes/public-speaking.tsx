import { createFileRoute } from "@tanstack/react-router";
import { Mic, Timer, Users } from "lucide-react";

import { ModulePage } from "@/components/mindforge/ModulePage";

const title = "Public Speaking Coach — MindForge";
const description =
  "Deliver a full speech and get it dissected for structure, clarity, persuasion, vocabulary and audience engagement.";

export const Route = createFileRoute("/public-speaking")({
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
  component: PublicSpeakingPage,
});

const PANELS = [
  { icon: Mic, label: "Recording", body: "Voice capture is coming — deliver in text for now." },
  { icon: Timer, label: "Speech timer", body: "Runs alongside your delivery inside the session." },
  { icon: Users, label: "Audience simulation", body: "An AI audience reacts and asks after you." },
];

function PublicSpeakingPage() {
  return (
    <ModulePage
      modeId="public-speaking"
      title="Public Speaking Coach"
      subtitle="Take the stage, deliver in one go, then get a line-by-line breakdown."
      aside={
        <div className="grid gap-4 sm:grid-cols-3">
          {PANELS.map((p) => (
            <div key={p.label} className="glass rounded-2xl p-5">
              <p.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      }
    />
  );
}