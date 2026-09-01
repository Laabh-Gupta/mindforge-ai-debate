import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Menu, Search, X, Zap, LogOut, User, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";
import { NAV_SECTIONS } from "@/lib/app-nav";
import { useAuthUser } from "@/hooks/use-auth-user";
import { initialsFor } from "@/lib/profile-display";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Wider container for chat-style module pages. */
  width?: "default" | "wide";
};

/**
 * The single application layout: sidebar + top bar + command palette.
 * Every signed-in page renders through this — never duplicate the chrome.
 */
export function AppShell({ title, subtitle, actions, children, width = "default" }: Props) {
  return (
    <AppShellRaw>
      <main
        className={`mx-auto px-4 pt-8 pb-20 sm:px-6 ${
          width === "wide" ? "max-w-6xl" : "max-w-5xl"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </AppShellRaw>
  );
}

/** Chrome only — for pages that own their whole content area. */
export function AppShellRaw({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user } = useAuthUser();
  const displayName = user?.name ?? "Guest";

  return (
    <div className="min-h-screen lg:flex">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-border bg-card/60 px-4 py-5 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                {section.label}
              </p>
              <ul className="mt-2 space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setNavOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-secondary text-foreground" }}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="glass mt-8 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> 4,820 XP · Analyst III
          </p>
          <p className="mt-2 text-xs text-muted-foreground">12-day streak. Keep it alive.</p>
          <Button asChild size="sm" className="mt-3 w-full bg-gradient-brand text-primary-foreground">
            <Link to="/train">Start training</Link>
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary sm:max-w-sm"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search or jump to…</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Notifications"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand font-display text-xs font-bold text-primary-foreground"
                  >
                    {initialsFor(user?.name)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/login">
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}