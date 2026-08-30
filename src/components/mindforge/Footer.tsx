import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Debate Room", to: "/debate" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Results", to: "/result" },
      { label: "Profile", to: "/profile" },
    ],
  },
  {
    title: "Practice",
    links: [
      { label: "MBA & GD", to: "/debate" },
      { label: "UPSC Interview", to: "/debate" },
      { label: "RBI Grade B", to: "/debate" },
      { label: "Daily Challenge", to: "/dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Sign up", to: "/signup" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border px-5 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="min-w-0">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Duolingo for critical thinking. Argue daily, get challenged, think sharper.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 MindForge. All rights reserved.</span>
        <span>Built for thinkers, not answer-seekers.</span>
      </div>
    </footer>
  );
}