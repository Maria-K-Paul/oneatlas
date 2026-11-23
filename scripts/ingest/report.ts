import { formatIssue, type Issue } from "./issues";
import type { IngestionReport } from "./run";

const MAX_ISSUES_SHOWN = 50;

function issueLines(title: string, issues: Issue[]): string[] {
  if (issues.length === 0) return [];
  const shown = issues.slice(0, MAX_ISSUES_SHOWN).map((issue) => `  • ${formatIssue(issue)}`);
  const hidden = issues.length - shown.length;
  return [
    ``,
    `${title} (${issues.length}):`,
    ...shown,
    ...(hidden > 0 ? [`  … and ${hidden} more`] : []),
  ];
}

/** Human-readable summary for the terminal and CI logs. */
export function formatReport(report: IngestionReport): string {
  const errors = report.issues.filter((i) => i.level === "error");
  const warnings = report.issues.filter((i) => i.level === "warning");
  const c = report.counts;
  const lines = [
    `Source: ${report.source}`,
    `Records: ${c.labs} labs, ${c.providers} providers, ${c.benchmarks} benchmarks, ${c.models} models, ${c.offerings} offerings, ${c.scores} scores`,
  ];

  switch (report.status) {
    case "invalid":
      lines.push(...issueLines("Errors", errors), ...issueLines("Warnings", warnings));
      lines.push("", "✗ Dataset is invalid. Nothing was written to the database.");
      break;
    case "dry-run":
      lines.push(...issueLines("Warnings", warnings));
      lines.push("", "✓ Dataset is valid (dry run, nothing written).");
      break;
    case "failed":
      lines.push(...issueLines("Warnings", warnings));
      lines.push("", `✗ Write failed and was rolled back: ${report.error}`);
      break;
    case "succeeded": {
      const columns = ["created", "updated", "deleted", "unchanged"] as const;
      lines.push(
        ...issueLines("Warnings", warnings),
        "",
        `${"table".padEnd(12)}${columns.map((c) => c.padStart(11)).join("")}`,
      );
      for (const [table, s] of Object.entries(report.stats)) {
        lines.push(`${table.padEnd(12)}${columns.map((c) => String(s[c]).padStart(11)).join("")}`);
      }
      lines.push("", `✓ Ingested in ${(report.durationMs / 1000).toFixed(1)}s.`);
      break;
    }
  }
  return lines.join("\n");
}
