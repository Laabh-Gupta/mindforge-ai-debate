import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/mindforge/AppShell";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const title = "Settings — MindForge";
const description =
  "Control theme, notifications, language, evaluation preferences, difficulty and accessibility options.";

export const Route = createFileRoute("/settings")({
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
  component: SettingsPage,
});

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Picker({ options }: { options: string[] }) {
  return (
    <Select defaultValue={options[0] ?? ""}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Preferences apply across every training module.">
      <div className="glass rounded-3xl px-6 py-2">
        <Row label="Theme" hint="MindForge is dark-first. Light mode is coming.">
          <Picker options={["Dark", "System"]} />
        </Row>
        <Row label="Notifications" hint="Streak reminders and session summaries.">
          <Switch defaultChecked />
        </Row>
        <Row label="Language" hint="Interface and AI response language.">
          <Picker options={["English", "Hindi", "Bilingual"]} />
        </Row>
        <Row label="Evaluation preference" hint="Which weighting profile scores your sessions.">
          <Picker options={["Balanced", "Debate", "Interview", "Placement / MBA", "Custom"]} />
        </Row>
        <Row label="Difficulty" hint="How hard the AI pushes back by default.">
          <Picker options={["Balanced", "Gentle", "Tough", "Brutal"]} />
        </Row>
        <Row label="Reduced motion" hint="Minimise animations across the app.">
          <Switch />
        </Row>
        <Row label="Larger text" hint="Increase base font size for readability.">
          <Switch />
        </Row>
      </div>
    </AppShell>
  );
}