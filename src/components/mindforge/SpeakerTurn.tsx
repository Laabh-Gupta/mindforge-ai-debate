const PALETTE = [
  "text-primary",
  "text-accent",
  "text-success",
  "text-warning",
  "text-destructive",
  "text-foreground",
];

export type ParsedTurn = { speaker: string | null; content: string };

/** Split a panel reply like "Name (Role): text" into individual speaker turns. */
export function parseSpeakerTurns(text: string): ParsedTurn[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns: ParsedTurn[] = [];
  for (const line of lines) {
    const match = /^\*{0,2}([A-Za-z][A-Za-z.'’\- ]{1,40}(?:\([^)]{2,30}\))?)\*{0,2}\s*:\s*(.+)$/.exec(
      line,
    );
    if (match && match[1] && match[2]) {
      turns.push({ speaker: match[1].replace(/\*/g, "").trim(), content: match[2].trim() });
    } else if (turns.length > 0) {
      turns[turns.length - 1]!.content += ` ${line}`;
    } else {
      turns.push({ speaker: null, content: line });
    }
  }
  return turns.length ? turns : [{ speaker: null, content: text }];
}

export function speakerColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return PALETTE[hash % PALETTE.length];
}

export function SpeakerBubble({ speaker, content }: ParsedTurn) {
  const initials = (speaker ?? "AI")
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold">
        {initials}
      </span>
      <div className="min-w-0">
        {speaker && (
          <p
            className={`text-xs font-semibold tracking-wide uppercase ${speakerColor(speaker)}`}
          >
            {speaker}
          </p>
        )}
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground">
          {content}
        </p>
      </div>
    </div>
  );
}