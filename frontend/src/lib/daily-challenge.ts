import { calendarDay } from "./gamification";
const challenges = [
  {
    topic: "Should universities allow students to use AI in assessed coursework?",
    task: "Make a claim, acknowledge the strongest objection, then defend your position.",
    mode: "debate",
  },
  {
    topic: "Explain a difficult decision you made and what you learned from its outcome.",
    task: "Use one specific example. Make your own contribution and the result clear.",
    mode: "interview",
  },
  {
    topic: "Make the case for one change that would improve your local community.",
    task: "Open with your main idea, support it with a concrete example, and close with a request.",
    mode: "public-speaking",
  },
  {
    topic: "Negotiate a flexible work arrangement while keeping your team's needs in view.",
    task: "Find the other side's main constraint before proposing a trade.",
    mode: "negotiation",
  },
  {
    topic: "A growing café is attracting more customers but profits are falling.",
    task: "Identify two possible causes and explain what evidence you would collect first.",
    mode: "case-discussion",
  },
  {
    topic: "Should early-career employees work primarily from the office?",
    task: "Build on another participant's point before introducing your own.",
    mode: "group-discussion",
  },
  {
    topic: "Your product launch is delayed by a supplier. Lead a stakeholder meeting.",
    task: "State a decision, explain the trade-off, and invite a challenge from the room.",
    mode: "real-world-simulation",
  },
];
export function dailyChallenge(now = Date.now()) {
  return challenges[calendarDay(now) % challenges.length]!;
}
