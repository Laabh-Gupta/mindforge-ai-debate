import {
  Brain,
  Scale,
  TrendingUp,
  Target,
  MessagesSquare,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    icon: Brain,
    title: "AI Debate Coach",
    description:
      "An opponent that never lets you win easily. It probes assumptions and adapts to your level.",
  },
  {
    icon: Scale,
    title: "Logical Fallacy Detection",
    description:
      "Straw man, false dilemma, appeal to authority — flagged the moment they appear in your argument.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description:
      "Track logic, clarity, evidence and bias over time with charts that actually mean something.",
  },
  {
    icon: Target,
    title: "Interview Practice",
    description:
      "Rehearse MBA, UPSC and RBI Grade B panels with follow-up questions that escalate in difficulty.",
  },
  {
    icon: MessagesSquare,
    title: "Group Discussion Training",
    description:
      "Simulated multi-voice GD rooms that teach you to enter, hold and close a point under pressure.",
  },
  {
    icon: Trophy,
    title: "Daily Challenges",
    description:
      "A fresh motion every morning. Build a streak, earn XP and climb the reasoning ranks.",
  },
];

export const steps = [
  { step: "Step 1", title: "Choose a topic", description: "Pick a motion or bring your own." },
  {
    step: "Step 2",
    title: "Share your opinion",
    description: "State your stance and the reasoning behind it.",
  },
  {
    step: "Step 3",
    title: "AI challenges your reasoning",
    description: "Counter-evidence, contradictions and relentless follow-ups.",
  },
  {
    step: "Step 4",
    title: "Receive feedback and improve",
    description: "A scored breakdown with fallacies and concrete next steps.",
  },
];

export const testimonials = [
  {
    quote:
      "I stopped rehearsing answers and started building arguments. My GD performance changed in three weeks.",
    name: "Ananya R.",
    role: "MBA Aspirant, CAT 99.4%ile",
  },
  {
    quote:
      "The fallacy detection is brutal in the best way. It caught the hand-waving I never noticed in my essays.",
    name: "Vikram S.",
    role: "UPSC Mains Candidate",
  },
  {
    quote:
      "It argues back with real counter-evidence. Investor Q&A stopped feeling like an ambush.",
    name: "Meera D.",
    role: "Founder, Seed Stage",
  },
];

export const suggestedTopics = [
  "Should AI-generated content be labelled by law?",
  "Is remote work reducing long-term career growth?",
  "Should India move to a two-year UPSC attempt cap?",
  "Are index funds making markets less efficient?",
  "Should social media have a minimum age of 16?",
  "Is universal basic income economically sustainable?",
];

export const recentDebates = [
  { topic: "Should AI-generated content be labelled by law?", score: 84, date: "Today", turns: 12 },
  { topic: "Is remote work reducing career growth?", score: 71, date: "Yesterday", turns: 9 },
  { topic: "Should crypto be regulated as a security?", score: 78, date: "2 days ago", turns: 14 },
  { topic: "Is nuclear energy the fastest path to net zero?", score: 66, date: "4 days ago", turns: 8 },
];

export const scoreBreakdown = [
  { label: "Logic", value: 84 },
  { label: "Evidence", value: 72 },
  { label: "Clarity", value: 91 },
  { label: "Confidence", value: 78 },
  { label: "Bias", value: 63 },
  { label: "Communication", value: 88 },
];

export const resultInsights = {
  strengths: [
    "Clear thesis stated within the first two sentences.",
    "Strong use of a real-world counter-example to pre-empt objections.",
    "Tone stayed measured under aggressive cross-examination.",
  ],
  weaknesses: [
    "Two key claims were asserted without any supporting data.",
    "Conceded the economic point too quickly instead of reframing it.",
    "Closing statement repeated the opening rather than advancing it.",
  ],
  fallacies: [
    { name: "Hasty Generalisation", detail: "One company's outcome used to describe an entire sector." },
    { name: "False Dilemma", detail: "Framed the choice as regulation or innovation, never both." },
    { name: "Appeal to Authority", detail: "Cited a name without citing the underlying evidence." },
  ],
  suggestions: [
    "Attach one number or source to every causal claim you make.",
    "When conceding, trade the point for a stronger frame instead of dropping it.",
    "End with a consequence, not a summary — leave the judge with a cost.",
  ],
};

export const badges = [
  { name: "First Blood", detail: "Completed your first debate" },
  { name: "Fallacy Hunter", detail: "Spotted 25 fallacies" },
  { name: "Iron Streak", detail: "12-day practice streak" },
  { name: "Steel Logic", detail: "Logic score above 90" },
  { name: "Cross-Examiner", detail: "50 rebuttals delivered" },
  { name: "Night Owl", detail: "10 debates after midnight" },
];

export const achievements = [
  { name: "Reached Rank: Analyst", date: "Aug 2026", progress: 100 },
  { name: "100 debates completed", date: "In progress", progress: 62 },
  { name: "Average logic score 85+", date: "In progress", progress: 78 },
];

export const profileUser = {
  name: "Arjun Mehta",
  handle: "@arjunthinks",
  rank: "Analyst III",
  xp: 4820,
  nextRankXp: 6000,
  streak: 12,
  level: 8,
};