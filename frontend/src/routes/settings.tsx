import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/mindforge/AppShell";
import { usePractice } from "@/components/mindforge/PracticeProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { downloadText } from "@/lib/session-export";
import {
  PRESET_PROFILES,
  loadSelectedProfileId,
  saveSelectedProfileId,
} from "@/lib/evaluation-profiles";
function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-6 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }));
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings | Argulab" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const { preferences: p, setPreferences: set, sessions, clear, owner } = usePractice();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profile, setProfile] = useState(() => loadSelectedProfileId("balanced"));
  return (
    <AppShell title="Settings" subtitle="Make practice work for you.">
      <div className="mf-panel px-6">
        <Row label="Appearance" hint="Choose a theme or match your device.">
          <Picker
            label="Theme"
            value={p.theme}
            options={options(["dark", "light", "system"])}
            onChange={(theme) => set({ theme: theme as typeof p.theme })}
          />
        </Row>
        <Row label="Daily goal" hint="How many completed sessions you aim for each day.">
          <Picker
            label="Daily goal"
            value={String(p.dailyGoal)}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
              value: String(n),
              label: `${n} session${n > 1 ? "s" : ""}`,
            }))}
            onChange={(v) => set({ dailyGoal: Number(v) })}
          />
        </Row>
        <Row
          label="AI response language"
          hint="Applies to new conversation turns. Interface labels remain in English."
        >
          <Picker
            label="AI response language"
            value={p.language}
            options={options(["English", "Hindi", "Bilingual"])}
            onChange={(v) => set({ language: v as typeof p.language })}
          />
        </Row>
        <Row label="Difficulty" hint="Adaptive difficulty uses your recent reviews in each mode.">
          <Picker
            label="Default difficulty"
            value={p.difficulty}
            options={options(["adaptive", "beginner", "intermediate", "advanced"])}
            onChange={(v) => set({ difficulty: v as typeof p.difficulty })}
          />
        </Row>
        <Row
          label="Evaluation profile"
          hint="Default weighting for new sessions. Each review can be re-scored."
        >
          <Picker
            label="Default evaluation profile"
            value={profile}
            options={PRESET_PROFILES.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => {
              setProfile(v);
              saveSelectedProfileId(v);
            }}
          />
        </Row>
        <Row label="Reduced motion" hint="Minimise animation throughout Argulab.">
          <Label className="sr-only" htmlFor="reduced-motion">
            Reduced motion
          </Label>
          <Switch
            id="reduced-motion"
            checked={p.reducedMotion}
            onCheckedChange={(v) => set({ reducedMotion: v })}
          />
        </Row>
        <Row label="Larger text" hint="Increase text and controls for easier reading.">
          <Label className="sr-only" htmlFor="large-text">
            Larger text
          </Label>
          <Switch
            id="large-text"
            checked={p.largerText}
            onCheckedChange={(v) => set({ largerText: v })}
          />
        </Row>
      </div>
      <section className="mt-9">
        <h2 className="text-lg font-medium">Your data</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {owner === "guest"
            ? "Guest sessions stay in this browser. Clearing browser storage removes them."
            : "Signed-in sessions are saved to your account, with a separate device cache."}{" "}
          AI responses and reviews send your submitted text to the configured AI provider.
          Recordings stay in your tab until you download them.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!sessions.length}
            onClick={() =>
              downloadText(
                JSON.stringify(
                  { version: 2, exportedAt: new Date().toISOString(), sessions },
                  null,
                  2,
                ),
                "argulab-practice.json",
                "application/json",
              )
            }
          >
            Export all practice data
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive" disabled={!sessions.length}>
                Clear practice history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Clear your practice history?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes sessions, transcripts and reviews from{" "}
                {owner === "guest" ? "this browser" : "your account and this device"}. XP, streaks
                and achievements reset. Download a copy first if you want to keep your work.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await clear();
                      setConfirmOpen(false);
                      toast.success("Practice history cleared");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not clear history.");
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "Clearing…" : "Delete history"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </AppShell>
  );
}
