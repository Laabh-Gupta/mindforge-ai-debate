import { createFileRoute } from "@tanstack/react-router";

import { ChipRow, ModulePage } from "@/components/mindforge/ModulePage";

const title = "Real-World Simulation — MindForge";
const description =
  "Step into Shark Tank, a UN summit, an RBI MPC, a boardroom crisis, a courtroom or a press conference with a moderator and live AI participants.";

const SCENARIOS = [
  "MBA GD",
  "Board Meeting",
  "UN Summit",
  "Shark Tank",
  "RBI MPC",
  "Parliament",
  "News Debate",
  "Press Conference",
  "Investor Meeting",
  "Hospital Ethics Committee",
  "Courtroom",
] as const;

export const Route = createFileRoute("/simulation")({
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
  component: SimulationPage,
});

function SimulationPage() {
  return (
    <ModulePage
      modeId="real-world-simulation"
      title="Real-World Simulation"
      subtitle="Moderator, multiple AI participants, dynamic events and adaptive pressure — then a full post-simulation review."
      aside={<ChipRow label="Simulations" items={SCENARIOS} />}
    />
  );
}