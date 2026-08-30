# MindForge AI

Build a modern AI-powered web application called "MindForge."

MindForge is a platform that helps people improve critical thinking, reasoning, public speaking, interview performance, and decision-making by debating with an AI.

The target audience includes MBA students, UPSC aspirants, RBI Grade B aspirants, law students, founders, college students, professionals, and anyone who wants to strengthen logical thinking.

The design should be clean, premium, and minimal, inspired by Duolingo, Notion, and Linear. Use a dark theme with deep navy (#0B1220), blue gradients, purple highlights, rounded cards, subtle glassmorphism, smooth animations, modern typography, and generous spacing.

The application should be fully responsive for desktop, tablet, and mobile.

--------------------------------------------------

PAGES

--------------------------------------------------

1. Landing Page

Create a beautiful landing page with:

Hero section:

Headline:

"Sharpen Your Mind. Challenge Every Idea."

Subheadline:

"Debate with AI, discover logical fallacies, improve reasoning, and become a better thinker."

Primary button:

Start Debating

Secondary button:

Learn More

Below the hero, add feature cards:

🧠 AI Debate Coach

⚖ Logical Fallacy Detection

📈 Progress Tracking

🎯 Interview Practice

💬 Group Discussion Training

🏆 Daily Challenges

Add a "How It Works" section:

Step 1

Choose a topic.

Step 2

Share your opinion.

Step 3

AI challenges your reasoning.

Step 4

Receive feedback and improve.

Add testimonials with placeholder content.

Create a modern footer with links.

--------------------------------------------------

2. Authentication

Create Sign Up and Login pages.

Allow login with:

Email

Google

Show modern authentication screens.

--------------------------------------------------

3. Dashboard

After login, display:

Welcome message

Daily streak

Current level

XP earned

Recent debates

Continue Debate button

Start New Debate button

Today's Challenge

Statistics cards:

Total Debates

Average Logic Score

Current Streak

Hours Practiced

--------------------------------------------------

4. Debate Screen

The main feature.

Layout:

Topic input

Suggested topics

Chat interface

User message

AI message

Large text input

Send button

Voice input placeholder

When user sends an opinion:

Display the opinion inside the chat.

Generate a placeholder AI response.

Display buttons:

Continue Debate

Finish Debate

--------------------------------------------------

5. Debate Result Page

Show:

Overall Score

Logic

Evidence

Clarity

Confidence

Bias

Communication

Display beautiful circular progress indicators.

Below them show:

Strengths

Weaknesses

Logical Fallacies Found

Suggestions for Improvement

Next Challenge button

--------------------------------------------------

6. Profile

Display:

Avatar

Username

Current Rank

XP

Badges

Achievements

Debate History

Settings button

--------------------------------------------------

UI REQUIREMENTS

Use rounded cards.

Modern gradients.

Floating navigation.

Smooth hover animations.

Professional icons.

Beautiful loading animations.

Minimalist charts.

Clean dashboard layout.

Consistent spacing.

Use Lucide icons.

Use reusable React components.

--------------------------------------------------

TECHNICAL

Use React.

Use TypeScript.

Use TailwindCSS.

Organize components cleanly.

Prepare the project for future Supabase integration.

Prepare reusable services for future AI integration.

Keep all AI responses as placeholder text for now.

Do not implement backend logic yet.

Focus on creating a production-quality frontend with excellent UX.

--------------------------------------------------

GOAL

This should feel like a premium SaaS product that could realistically become "Duolingo for Critical Thinking." Most AI chatbots simply answer questions. MindForge should refuse to let users "win" easily. It should actively test their reasoning by asking follow-up questions, pointing out contradictions, introducing evidence from opposing viewpoints, and adapting its strategy based on the user's skill level. That creates a learning experience rather than just another chat interface.

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `GROQ_API_KEY` — from [console.groq.com/keys](https://console.groq.com/keys)
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from your Supabase project's **Settings → API**
2. In the Supabase SQL editor, run `supabase/schema.sql` once to create the `skill_records` table and its row-level-security policies.
3. To enable "Continue with Google", turn on the Google provider under **Authentication → Providers** in Supabase and add your OAuth client ID/secret there.

## Development

You need Node.js and Bun (this project uses Bun as its package manager).

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

