import type { PracticeSession } from "./practice-types";
import { DIMENSION_LABELS, EVALUATION_DIMENSIONS } from "./evaluation-shared";
export function sessionReportText(s: PracticeSession) {
  const lines = [
    "ARGULAB",
    s.modeName,
    "",
    s.topic,
    `Date: ${new Date(s.completedAt ?? s.startedAt).toLocaleString()}`,
    `Duration: ${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s`,
    `Difficulty: ${s.difficulty}`,
  ];
  if (s.variant) lines.push(`Format: ${s.variant}`);
  if (s.userRole) lines.push(`Your role: ${s.userRole}`);
  if (s.evaluation) {
    lines.push(
      "",
      "PERFORMANCE",
      `Overall: ${s.overall ?? s.evaluation.scores.overallPerformance}/100`,
      `Scoring profile: ${s.profileId ?? "balanced"}`,
      "",
      s.evaluation.summary,
    );
    for (const key of EVALUATION_DIMENSIONS)
      lines.push(`${DIMENSION_LABELS[key]}: ${s.evaluation.scores[key]}/100`);
    for (const [title, values] of [
      ["STRENGTHS", s.evaluation.strengths],
      ["AREAS TO IMPROVE", s.evaluation.weaknesses],
      ["RECOMMENDED PRACTICE", s.evaluation.suggestions],
    ] as const)
      lines.push("", title, ...values.map((v) => "- " + v));
    lines.push(
      "",
      "LOGICAL FALLACIES",
      ...s.evaluation.fallacies.map((f) => `${f.name}: ${f.detail}`),
    );
    if (!s.evaluation.fallacies.length) lines.push("None identified in this review.");
    const d = s.evaluation.details;
    if (d)
      lines.push(
        "",
        "CONTRIBUTION REVIEW",
        "Key claims: " + d.keyClaims.join("; "),
        "Evidence: " + d.supportingEvidence.join("; "),
        "Strongest contribution: " + d.strongestContribution,
        "Contribution to strengthen: " + d.weakestContribution,
        "Best counterargument: " + d.bestCounterargument,
        "",
        "MISSED OPPORTUNITIES",
        ...d.missedOpportunities,
        "",
        "QUESTION BY QUESTION",
        ...d.answers.flatMap((a) => [a.question, a.assessment, "Try: " + a.improvement, ""]),
        "NEXT TOPIC",
        d.recommendedTopic,
      );
    lines.push(
      "",
      "Scores are coaching estimates based on the submitted text, not an assessment of audio delivery.",
    );
  } else lines.push("", "Review pending. No scores have been assigned.");
  lines.push("", "TRANSCRIPT", ...s.turns.flatMap((t) => [`${t.speaker}`, t.content, ""]));
  if (s.observerAnswers)
    lines.push(
      "",
      "OBSERVER ANALYSIS",
      ...s.observerAnswers.flatMap((a) => [a.question, a.answer || "(Unanswered)", ""]),
    );
  return lines.join("\n");
}
export function downloadText(text: string, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Browser typesetting preserves Unicode and produces real selectable PDF text. */
export function printReport(text: string, title: string) {
  const report = window.open("", "_blank");
  if (!report) {
    alert("Allow pop-ups to open the report, or download the TXT version.");
    return;
  }
  report.opener = null;
  const doc = report.document;
  doc.title = `Argulab | ${title}`;
  const style = doc.createElement("style");
  style.textContent =
    "@page { size: A4; margin: 20mm 18mm; } body { max-width: 760px; margin: 40px auto; padding: 0 24px; color: #20262b; font: 10.5pt/1.5 Arial, sans-serif; } h1 { font-size: 24pt; letter-spacing: -1px; color: #23654c; } h2 { margin-top: 26px; font-size: 12pt; break-after: avoid; } p { white-space: pre-wrap; overflow-wrap: anywhere; orphans: 3; widows: 3; margin: 0 0 7px; break-inside: avoid; } .report-score { display: inline-block; box-sizing: border-box; width: 49%; margin: 0 0 4px; padding-right: 10px; vertical-align: top; font-size: 10pt; } .report-meta { color: #555; font-size: 10pt; } button { padding: 10px 18px; font: inherit; cursor: pointer; } @media print { body { margin: 0; padding: 0; max-width: none; } button, .print-help { display: none; } }";
  doc.head.append(style);
  const button = doc.createElement("button");
  button.textContent = "Print / Save as PDF";
  button.onclick = () => report.print();
  doc.body.append(button);
  const help = doc.createElement("p");
  help.className = "print-help";
  help.textContent = "Choose Save as PDF in your browser's print dialog to download this report.";
  doc.body.append(help);
  text.split("\n").forEach((line, i) => {
    if (!line) return;
    const element = doc.createElement(i === 0 ? "h1" : /^[A-Z][A-Z &]+$/.test(line) ? "h2" : "p");
    if (/^[A-Za-z ]+: \d+\/100$/.test(line) && !line.startsWith("Overall:"))
      element.className = "report-score";
    element.textContent = line;
    doc.body.append(element);
  });
  report.focus();
}
