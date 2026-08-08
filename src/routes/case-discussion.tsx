import { createFileRoute } from "@tanstack/react-router";

import { ChipRow, ModulePage } from "@/components/mindforge/ModulePage";

const title = "Case Discussion — MindForge";
const description =
  "Argue business, policy, economic and strategy cases against sharp AI colleagues, with numbers, constraints and stakeholders.";

export const Route = createFileRoute("/case-discussion")({
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
  component: CaseDiscussionPage,
});

function CaseDiscussionPage() {
  return (
    <ModulePage
      modeId="case-discussion"
      title="Case Discussion"
      subtitle="A realistic scenario with numbers and trade-offs. Defend a recommendation under fire."
      aside={
        <ChipRow
          label="Case types"
          items={["Business cases", "Policy cases", "Economic cases", "Strategy cases"]}
        />
      }
    />
  );
}