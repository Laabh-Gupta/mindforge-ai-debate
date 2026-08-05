import {
  Swords,
  Users,
  Briefcase,
  Mic2,
  Timer,
  FileSearch,
  Handshake,
  Eye,
  type LucideIcon,
} from "lucide-react";

export type ModeId =
  | "debate"
  | "group-discussion"
  | "interview"
  | "public-speaking"
  | "extempore"
  | "case-discussion"
  | "negotiation";

/** How the session UI behaves for a mode. */
export type ModeKind = "duel" | "panel" | "interview" | "speech";

export type TrainingMode = {
  id: ModeId;
  kind: ModeKind;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Label for the setup field, e.g. "Motion" or "Role". */
  setupLabel: string;
  placeholder: string;
  presets: string[];
  /** Optional second dimension, e.g. interview type. */
  variantLabel?: string;
  variants?: string[];
  /** Extempore only. */
  prepSeconds?: number;
  speakSeconds?: number;
  ctaLabel: string;
};

export const trainingModes: TrainingMode[] = [
  {
    id: "debate",
    kind: "duel",
    name: "Debate Arena",
    tagline: "One-on-one Socratic duel",
    description:
      "The AI first understands your argument, then challenges it with the single strongest objection from the subject itself.",
    icon: Swords,
    setupLabel: "Motion",
    placeholder: "e.g. Should India cap UPSC attempts at two?",
    presets: [
      "Should AI-generated content be labelled by law?",
      "Was Karna a tragic hero or a willing accomplice?",
      "Is universal basic income economically sustainable?",
      "Should social media have a minimum age of 16?",
    ],
    ctaLabel: "Enter the arena",
  },
  {
    id: "group-discussion",
    kind: "panel",
    name: "Group Discussion Simulator",
    tagline: "Moderator + 5 AI participants",
    description:
      "A full MBA-style GD room. Participants argue with each other, interrupt, build on points — and you must cut in to be heard.",
    icon: Users,
    setupLabel: "GD topic",
    placeholder: "e.g. Should India privatise its public sector banks?",
    presets: [
      "Should India privatise its public sector banks?",
      "Is work-from-home hurting early-career learning?",
      "Should electric vehicle subsidies continue?",
      "Does gig work exploit or empower young Indians?",
    ],
    ctaLabel: "Join the discussion",
  },
  {
    id: "interview",
    kind: "interview",
    name: "Interview Simulator",
    tagline: "HR, MBA, consulting, UPSC and more",
    description:
      "A panel that listens. Every question follows from what you actually just said, and pressure rises as you go.",
    icon: Briefcase,
    setupLabel: "Your background or target role",
    placeholder: "e.g. Final-year engineer applying to IIM-A",
    presets: [
      "Final-year engineer applying to IIM-A",
      "Two years in analytics, targeting consulting",
      "Commerce graduate preparing for RBI Grade B",
      "PM aspirant moving from software engineering",
    ],
    variantLabel: "Interview type",
    variants: [
      "HR",
      "MBA Admissions",
      "Consulting Case",
      "Banking",
      "RBI Grade B",
      "UPSC Board",
      "Product Management",
      "Startup",
    ],
    ctaLabel: "Start the interview",
  },
  {
    id: "public-speaking",
    kind: "speech",
    name: "Public Speaking Coach",
    tagline: "Deliver, then get dissected",
    description:
      "Deliver a full speech in one go. Your coach evaluates structure, clarity, persuasion, vocabulary and engagement line by line.",
    icon: Mic2,
    setupLabel: "Speech topic",
    placeholder: "e.g. Why curiosity beats talent",
    presets: [
      "Why curiosity beats talent",
      "The case for slowing down in a fast economy",
      "What my biggest failure taught me",
      "Technology should serve attention, not steal it",
    ],
    ctaLabel: "Take the stage",
  },
  {
    id: "extempore",
    kind: "speech",
    name: "Extempore Practice",
    tagline: "Surprise topic, 60s prep, 120s speech",
    description:
      "You do not choose the topic. Think on your feet against a live clock, then receive a detailed breakdown.",
    icon: Timer,
    setupLabel: "Theme (optional)",
    placeholder: "e.g. Society, technology, ethics — or leave blank",
    presets: ["Surprise me", "Society", "Technology", "Ethics", "Business", "Indian polity"],
    prepSeconds: 60,
    speakSeconds: 120,
    ctaLabel: "Get my topic",
  },
  {
    id: "case-discussion",
    kind: "panel",
    name: "Case Discussion",
    tagline: "Business, economic and policy cases",
    description:
      "A realistic scenario with numbers, constraints and stakeholders. Argue a recommendation against sharp AI colleagues.",
    icon: FileSearch,
    setupLabel: "Case area",
    placeholder: "e.g. A D2C brand losing money on delivery",
    presets: [
      "A D2C brand losing money on delivery",
      "A state deciding whether to subsidise solar rooftops",
      "A bank facing rising unsecured-loan defaults",
      "A SaaS firm choosing between growth and profitability",
    ],
    ctaLabel: "Open the case",
  },
  {
    id: "negotiation",
    kind: "duel",
    name: "Negotiation Simulator",
    tagline: "Salary, investors, vendors, customers",
    description:
      "A counterpart with real interests, a walk-away point and no obligation to be nice. Anchor, trade and close.",
    icon: Handshake,
    setupLabel: "Scenario",
    placeholder: "e.g. Negotiating a 30% raise after a strong year",
    presets: [
      "Negotiating a 30% raise after a strong year",
      "Raising a seed round from a sceptical investor",
      "Handling an angry enterprise customer threatening to churn",
      "Renegotiating vendor pricing after a cost shock",
    ],
    variantLabel: "Counterpart stance",
    variants: ["Tough", "Fair", "Evasive", "Aggressive"],
    ctaLabel: "Begin negotiation",
  },
];

export const observerMode = {
  id: "observer" as const,
  name: "Observer Mode",
  tagline: "Watch six minds argue, then judge them",
  description:
    "You do not speak. You watch a realistic discussion — with strong points, fallacies, poor listening and real leadership — then answer analysis questions.",
  icon: Eye,
  presets: [
    "Should India privatise its public sector banks?",
    "Is remote work reducing long-term career growth?",
    "Should AI-generated content be labelled by law?",
    "Do EV subsidies help or distort the market?",
  ],
};

export function getMode(id: string): TrainingMode | undefined {
  return trainingModes.find((m) => m.id === id);
}