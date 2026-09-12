import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/mindforge/AppShell";
import { useAuthUser } from "@/hooks/use-auth-user";
import { accountRequest } from "@/lib/account-api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard | MindForge" }] }),
  component: LeaderboardPage,
});
type Entry = { display_name: string; sessions: number; xp: number };
function LeaderboardPage() {
  const { user } = useAuthUser();
  const [period, setPeriod] = useState("week");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [listed, setListed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void accountRequest<Entry[]>("/api/community?period=" + period)
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setFailed(false);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, attempt]);
  useEffect(() => {
    let cancelled = false;
    setListed(false);
    if (user)
      void accountRequest<{ listed: number }>("/api/community?mine=1", "GET", undefined, user.id)
        .then((data) => {
          if (!cancelled) setListed(data.listed === 1);
        })
        .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  async function changeListed(value: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      await accountRequest("/api/community", "POST", { listed: value }, user.id);
      setListed(value);
      setAttempt((v) => v + 1);
      toast.success(value ? "You joined the public practice board" : "Your profile is now private");
    } catch {
      toast.error("Could not update leaderboard visibility. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <AppShell
      title="Leaderboard"
      subtitle="Consistency counts. A public practice board for members who choose to join."
      width="wide"
    >
      {user && (
        <div className="mf-panel mb-6 flex items-center justify-between gap-6 p-5">
          <div>
            <Label htmlFor="public-profile">List my practice publicly</Label>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your display name, session count and XP. Your conversations and reviews stay
              private.
            </p>
          </div>
          <Switch
            id="public-profile"
            checked={listed}
            disabled={saving}
            onCheckedChange={(v) => void changeListed(v)}
          />
        </div>
      )}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="week">Last 7 days</TabsTrigger>
          <TabsTrigger value="month">Last 30 days</TabsTrigger>
          <TabsTrigger value="all">All time</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? (
        <p className="mf-empty mt-5" role="status">
          Loading the practice board…
        </p>
      ) : failed ? (
        <div className="mf-empty mt-5">
          <p>The community board is not available on this deployment yet.</p>
          <Button className="mt-4" variant="outline" onClick={() => setAttempt((v) => v + 1)}>
            Try again
          </Button>
        </div>
      ) : !entries.length ? (
        <div className="mf-empty mt-5">No public practice activity in this period yet.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-4 font-normal">Rank</th>
                <th className="font-normal">Member</th>
                <th className="text-right font-normal">Sessions</th>
                <th className="text-right font-normal">XP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-5 text-muted-foreground">{i + 1}</td>
                  <td>{row.display_name}</td>
                  <td className="text-right">{row.sessions}</td>
                  <td className="text-right">{row.xp.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Rankings reflect self-recorded practice, not verified skill. Guest history remains private
        to your browser.
      </p>
    </AppShell>
  );
}
