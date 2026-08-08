import { createFileRoute } from "@tanstack/react-router";

import { ChipRow, ModulePage } from "@/components/mindforge/ModulePage";

const title = "Interview Simulator — MindForge";
const description =
  "Practice HR, MBA, UPSC, RBI, consulting, finance, product, startup and technical interviews with an AI panel that asks real follow-ups.";

const TYPES = [
  "HR",
  "MBA Admissions",
  "RBI Grade B",
  "UPSC Board",
  "Consulting Case",
  "Finance",
  "Product Management",
  "Startup",
  "Technical",
] as const;

export const Route = createFileRoute("/interview")({
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
  component: InterviewPage,
});

function InterviewPage() {
  return (
    <ModulePage
      modeId="interview"
      title="Interview Simulator"
      subtitle="A panel that listens. Every question follows from what you actually just said."
      aside={<ChipRow label="Interview types" items={TYPES} />}
    />
  );
}