import { createFileRoute } from "@tanstack/react-router";

import { ChipRow, ModulePage } from "@/components/mindforge/ModulePage";

const title = "Negotiation Simulator — MindForge";
const description =
  "Negotiate salary, investor terms, vendor pricing, client conflicts and disputes against an AI counterpart with a real walk-away point.";

export const Route = createFileRoute("/negotiation")({
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
  component: NegotiationPage,
});

function NegotiationPage() {
  return (
    <ModulePage
      modeId="negotiation"
      title="Negotiation Simulator"
      subtitle="Anchor, trade and close against a counterpart with real interests and no obligation to be nice."
      aside={
        <ChipRow
          label="Scenarios"
          items={["Salary", "Investor", "Vendor", "Client", "Conflict resolution"]}
        />
      }
    />
  );
}