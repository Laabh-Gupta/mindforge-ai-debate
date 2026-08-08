import {
  LayoutDashboard,
  Compass,
  Swords,
  Users,
  Briefcase,
  Mic2,
  Timer,
  Handshake,
  FileSearch,
  Drama,
  Eye,
  User,
  BarChart3,
  Trophy,
  Medal,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
};

/** Every training module gets its own dedicated page. */
export const MODULE_NAV = [
  { to: "/debate", label: "Debate Arena", icon: Swords, hint: "One-on-one Socratic duel" },
  {
    to: "/group-discussion",
    label: "Group Discussion",
    icon: Users,
    hint: "Moderator + AI panel",
  },
  {
    to: "/interview",
    label: "Interview Simulator",
    icon: Briefcase,
    hint: "HR, MBA, UPSC, consulting",
  },
  { to: "/public-speaking", label: "Public Speaking", icon: Mic2, hint: "Deliver and get dissected" },
  { to: "/extempore", label: "Extempore", icon: Timer, hint: "Surprise topic, live clock" },
  { to: "/negotiation", label: "Negotiation", icon: Handshake, hint: "Salary, investors, vendors" },
  { to: "/case-discussion", label: "Case Discussion", icon: FileSearch, hint: "Business & policy cases" },
  { to: "/simulation", label: "Real-World Simulation", icon: Drama, hint: "Shark Tank, UN, boardroom" },
  { to: "/observer", label: "Observer Mode", icon: Eye, hint: "Watch, then judge" },
] as const satisfies readonly NavItem[];

export const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/train", label: "Training Hub", icon: Compass },
] as const satisfies readonly NavItem[];

export const INSIGHT_NAV = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/leaderboard", label: "Leaderboard", icon: Medal },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const satisfies readonly NavItem[];

export const NAV_SECTIONS = [
  { label: "Overview", items: PRIMARY_NAV },
  { label: "Training modules", items: MODULE_NAV },
  { label: "Progress", items: INSIGHT_NAV },
] as const;