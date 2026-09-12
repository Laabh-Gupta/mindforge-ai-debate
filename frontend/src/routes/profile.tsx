import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/mindforge/AppShell";
import { SessionHistory } from "@/components/mindforge/ProgressViews";
import { usePractice, useProgress } from "@/components/mindforge/PracticeProvider";
import { useAuthUser } from "@/hooks/use-auth-user";
import { initialsFor } from "@/lib/profile-display";
import { updateProfileName, describeAuthError, signInWithGoogle } from "@/services/auth";
import { trainingModes } from "@/lib/training-modes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile | Argulab" }] }),
  component: ProfilePage,
});
function ProfilePage() {
  const { user } = useAuthUser();
  const { preferences, setPreferences } = usePractice();
  const p = useProgress();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("all");
  const displayName = user?.name ?? preferences.guestName;
  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (user) await updateProfileName(name.trim());
      else setPreferences({ guestName: name.trim() });
      setOpen(false);
      toast.success("Name updated");
    } catch (error) {
      toast.error(describeAuthError(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <AppShell title="Profile" subtitle="Your practice, in one place." width="wide">
      <section className="mf-panel flex flex-wrap items-center gap-5 p-6">
        <span className="grid size-16 place-items-center rounded-full border border-border bg-secondary text-xl font-medium">
          {initialsFor(displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-medium">{displayName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.email ?? "Guest practice saved in this browser"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setName(displayName);
            setOpen(true);
          }}
        >
          <Pencil className="size-4" />
          Edit name
        </Button>
      </section>
      {user && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Use the same Google email to connect another sign-in method.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void signInWithGoogle(true).catch((error) => toast.error(describeAuthError(error)))
            }
          >
            Connect Google
          </Button>
        </div>
      )}
      {!user && (
        <p className="mt-4 text-sm text-muted-foreground">
          Your guest history belongs to this browser.{" "}
          <Link to="/signup" className="text-primary underline underline-offset-4">
            Create an account
          </Link>{" "}
          for a separate account workspace.
        </p>
      )}
      <div className="my-8 grid grid-cols-2 gap-6 border-y border-border py-6 sm:grid-cols-4">
        {[
          ["Sessions", p.total],
          ["XP", p.xp],
          ["Level", p.level],
          ["Streak", `${p.streak} days`],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mf-number mt-3 text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Practice history</h2>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-56" aria-label="Filter practice history">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              {[...trainingModes, { id: "observer", name: "Observer Mode" }].map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SessionHistory mode={mode} />
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Edit your name</DialogTitle>
          <DialogDescription>
            {user ? "This name appears in your account." : "This name is stored on this device."}
          </DialogDescription>
          <form onSubmit={rename} className="space-y-4">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              maxLength={60}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save name"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
