import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const appLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/train", label: "Training Hub" },
  { to: "/group-discussion", label: "Group Discussion" },
  { to: "/result", label: "Results" },
  { to: "/profile", label: "Profile" },
] as const;

export function FloatingNav({ variant = "app" }: { variant?: "app" | "marketing" }) {
  const [open, setOpen] = useState(false);
  const links = variant === "app" ? appLinks : [];

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <nav className="glass mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-6">
          <Logo />
          {links.length > 0 && (
            <div className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {variant === "marketing" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground">
              <Link to="/train">Training Hub</Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border sm:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {open && (
          <div className="col-span-2 flex flex-col gap-1 border-t border-border pt-3 sm:hidden">
            {appLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to={variant === "marketing" ? "/signup" : "/train"}
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-gradient-brand px-3 py-2 text-center text-sm font-medium text-primary-foreground"
            >
              {variant === "marketing" ? "Get started" : "Training Hub"}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}