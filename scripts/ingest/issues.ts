import type { z } from "zod";

export type IssueLevel = "error" | "warning";

/** A problem found in the source data, pinned to the file and record it came from. */
export type Issue = {
  level: IssueLevel;
  file: string;
  /** Record locator, e.g. `[3] GPT-5`. */
  record: string;
  /** Field path inside the record, e.g. `offerings[1].pricePer1K.input`. */
  path: string;
  message: string;
};

export type Origin = { file: string; record: string };

/**
 * Collects every problem instead of stopping at the first one, so a bad data file
 * produces one complete report (docs §6).
 */
export class IssueCollector {
  readonly issues: Issue[] = [];

  error(origin: Origin, path: string, message: string) {
    this.issues.push({ level: "error", ...origin, path, message });
  }

  warn(origin: Origin, path: string, message: string) {
    this.issues.push({ level: "warning", ...origin, path, message });
  }

  fromZod(origin: Origin, error: z.ZodError) {
    for (const issue of error.issues) {
      this.error(origin, formatPath(issue.path), issue.message);
    }
  }

  get errors(): Issue[] {
    return this.issues.filter((issue) => issue.level === "error");
  }

  get warnings(): Issue[] {
    return this.issues.filter((issue) => issue.level === "warning");
  }
}

/** ["offerings", 1, "input"] → "offerings[1].input" */
export function formatPath(segments: readonly PropertyKey[]): string {
  return segments.reduce<string>((path, segment) => {
    if (typeof segment === "number") return `${path}[${segment}]`;
    const key = String(segment);
    return path ? `${path}.${key}` : key;
  }, "");
}

export function formatIssue(issue: Issue): string {
  const where = [issue.file, issue.record].filter(Boolean).join(" ");
  const field = issue.path ? ` › ${issue.path}` : "";
  return `${where}${field}: ${issue.message}`;
}
