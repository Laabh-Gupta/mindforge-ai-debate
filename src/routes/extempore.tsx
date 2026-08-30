import { createFileRoute } from "@tanstack/react-router";

import { ChipRow, ModulePage } from "@/components/mindforge/ModulePage";

const title = "Extempore Practice — MindForge";
const description =
  "A surprise topic, 60 seconds of prep, 120 seconds of speech, then a detailed evaluation of how you thought on your feet.";

export const Route = createFileRoute("/extempore")({
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
  component: ExtemporePage,
});

function ExtemporePage() {
  return (
    <ModulePage
      modeId="extempore"
      title="Extempore Practice"
      subtitle="You don't choose the topic. Prep for 60 seconds, speak for 120, then get judged."
      aside={
        <ChipRow
          label="Flow"
          items={["Random topic", "60s preparation timer", "120s speech timer", "Evaluation"]}
        />
      }
    />
  );
}