import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/mindforge/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthUser } from "@/hooks/use-auth-user";

const title = "Leaderboard — MindForge";
const description =
  "See how you rank against friends, your college and the global MindForge community, weekly and monthly.";

export const Route = createFileRoute("/leaderboard")({
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
  component: LeaderboardPage,
});

const ROWS = [
  { name: "Ishita R.", detail: "IIM Bangalore", xp: 8120 },
  { name: "", detail: "You", xp: 4820 },
  { name: "Kabir S.", detail: "NLSIU", xp: 4610 },
  { name: "Meera P.", detail: "SRCC", xp: 4380 },
  { name: "Rohan T.", detail: "IIT Madras", xp: 3990 },
];

function Board({ scope, youName }: { scope: string; youName: string }) {
  const rows = ROWS.map((r) => (r.detail === "You" ? { ...r, name: youName } : r));

  return (
    <ul className="mt-4 space-y-2">
      {rows.map((r, i) => (
        <li
          key={r.detail === "You" ? "you" : r.name}
          className={`glass flex items-center gap-4 rounded-2xl px-5 py-4 ${
            r.detail === "You" ? "border border-primary/40" : ""
          }`}
        >
          <span className="font-display w-6 text-lg font-bold text-muted-foreground">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.detail} · {scope}
            </p>
          </div>
          <span className="font-display text-sm font-bold">{r.xp.toLocaleString()} XP</span>
        </li>
      ))}
    </ul>
  );
}

function LeaderboardPage() {
  const { user } = useAuthUser();
  const youName = user?.name ?? "Guest";

  return (
    <AppShell title="Leaderboard" subtitle="Rankings refresh every hour." width="wide">
      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="college">College</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        {["friends", "college", "global", "weekly", "monthly"].map((scope) => (
          <TabsContent key={scope} value={scope}>
            <Board scope={scope} youName={youName} />
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}