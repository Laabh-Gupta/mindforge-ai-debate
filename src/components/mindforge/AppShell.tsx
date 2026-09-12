import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, LogOut, LogIn, User, Settings, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";
import { NAV_SECTIONS } from "@/lib/app-nav";
import { useAuthUser } from "@/hooks/use-auth-user";
import { initialsFor } from "@/lib/profile-display";
import { signOut } from "@/services/auth";
import { usePractice, useProgress } from "./PracticeProvider";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide";
};
export function AppShell({ title, subtitle, actions, children, width = "default" }: Props) {
  return (
    <AppShellRaw>
      <main
        id="main-content"
        className={`mx-auto px-5 pt-9 pb-20 sm:px-8 lg:px-10 ${width === "wide" ? "max-w-7xl" : "max-w-6xl"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </AppShellRaw>
  );
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const p = useProgress();
  return (
    <div className="flex h-full min-h-0 flex-col py-6">
      <div className="shrink-0 px-6">
        <Logo />
      </div>
      <nav
        aria-label="Main navigation"
        className="mf-sidebar-scroll mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-2"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mf-label mb-2 px-3">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    activeOptions={{ exact: item.to === "/train" }}
                    activeProps={{
                      className: "bg-secondary text-foreground font-medium",
                      "aria-current": "page",
                    }}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 px-4 pt-4">
        <div className="border-t border-border px-3 pt-5">
          <div className="flex justify-between text-sm">
            <span>Level {p.level}</span>
            <span className="text-muted-foreground">{p.xp.toLocaleString()} XP</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-secondary">
            <div className="h-1 rounded-full bg-primary" style={{ width: `${p.levelProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{p.xpToNext} XP to the next level</p>
        </div>
      </div>
    </div>
  );
}
export function AppShellRaw({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user } = useAuthUser();
  const { preferences, syncError, retrySync } = usePractice();
  const name = user?.name ?? preferences.guestName;
  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main-content" className="mf-skip">
        Skip to content
      </a>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-hidden border-r border-border bg-sidebar lg:block">
        <Navigation />
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 overflow-hidden bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a training mode or view your progress.
          </SheetDescription>
          <Navigation onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-3 px-5 sm:px-8 lg:px-10">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="lg:hidden"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <Search className="size-4" />
              <span className="truncate">Find a practice room</span>
              <kbd className="ml-8 hidden rounded border border-border px-1.5 text-xs sm:inline">
                Ctrl K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-4">
              <span className="hidden text-xs text-muted-foreground sm:block">
                {user ? "Personal workspace" : "Guest workspace"}
              </span>
              {!user && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="grid size-8 place-items-center rounded-full border border-border bg-secondary text-xs font-semibold"
                  >
                    {initialsFor(name)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="size-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="size-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user ? (
                    <DropdownMenuItem
                      onClick={() => {
                        void signOut().catch(() =>
                          toast.error("Could not sign out. Please try again."),
                        );
                      }}
                    >
                      <LogOut className="size-4" /> Sign out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/login">
                        <LogIn className="size-4" /> Sign in
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        {syncError && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3 text-sm text-warning"
          >
            <CloudOff className="size-4" />
            {syncError}
            <button onClick={() => void retrySync()} className="underline">
              Retry sync
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
