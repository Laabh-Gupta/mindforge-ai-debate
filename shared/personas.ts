export const OPENING_TRIGGER = "__mindforge_open__";

export type PanelPersona = {
  name: string;
  role: string;
  style: string;
};

export const PANEL_PERSONAS: PanelPersona[] = [
  {
    name: "Meera Iyer",
    role: "Moderator",
    style:
      "calm, structured, keeps time, invites quieter voices, never argues a side, summarises fairly",
  },
  {
    name: "Dr. Anand Rao",
    role: "Economist",
    style: "data-minded, thinks in incentives and trade-offs, sceptical of sentiment",
  },
  {
    name: "Kavya Nair",
    role: "Entrepreneur",
    style: "fast, practical, speaks from operating experience, impatient with theory",
  },
  {
    name: "Rajat Sharma",
    role: "HR Manager",
    style: "people-first, cares about culture and fairness, uses workplace anecdotes",
  },
  {
    name: "Advocate Sneha Pillai",
    role: "Lawyer",
    style: "precise, distinguishes principle from practice, tests definitions and rights",
  },
  {
    name: "Prof. Iqbal Khan",
    role: "Professor",
    style: "historical and conceptual framing, names the reasoning move being made",
  },
  {
    name: "Dr. Tara Menon",
    role: "Psychologist",
    style: "behavioural lens, questions motives and biases, gentle but probing",
  },
  {
    name: "Arjun Desai",
    role: "MBA Student",
    style: "eager, sometimes over-claims, occasionally interrupts, learns mid-discussion",
  },
];

/** Fixed cast for the Group Discussion module: one moderator + five participants. */
export const GD_MODERATOR: PanelPersona = PANEL_PERSONAS[0]!;

export const GD_PARTICIPANTS: PanelPersona[] = [
  PANEL_PERSONAS[1]!,
  PANEL_PERSONAS[2]!,
  PANEL_PERSONAS[3]!,
  PANEL_PERSONAS[4]!,
  PANEL_PERSONAS[5]!,
];

export const GD_CAST: PanelPersona[] = [GD_MODERATOR, ...GD_PARTICIPANTS];
