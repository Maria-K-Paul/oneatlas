import path from "node:path";
import { describe, expect, it } from "vitest";
import { CuratedJsonAdapter } from "./adapters/curated-json";
import { formatIssue } from "./issues";
import { countDataset, prepareDataset } from "./run";

/**
 * Guards the committed dataset in CI without needing a database: any edit to data/*.json
 * that breaks a validation rule fails the build, with the exact file and field in the message.
 */
describe("committed dataset (data/)", async () => {
  const { dataset, issues } = await prepareDataset(
    new CuratedJsonAdapter(path.resolve(import.meta.dirname, "../../data")),
  );

  it("has no validation errors", () => {
    expect(issues.errors.map(formatIssue)).toEqual([]);
  });

  it("only has the known, intentional warnings", () => {
    // Scribe is published per hour; $0.40 / 60 min does not fit 4 decimal places.
    expect(issues.warnings.map((w) => `${w.record} ${w.path}`)).toEqual([
      "[2] Scribe v1 offerings[0].input",
    ]);
  });

  it("is large enough to exercise filters, pagination and rankings", () => {
    const counts = countDataset(dataset);
    expect(counts.models).toBeGreaterThanOrEqual(60);
    expect(counts.offerings).toBeGreaterThanOrEqual(150);
    expect(counts.scores).toBeGreaterThanOrEqual(300);
    expect(new Set(dataset.models.map((m) => m.type)).size).toBeGreaterThanOrEqual(6);
  });

  it("includes edge cases the UI must handle", () => {
    const statuses = new Set(dataset.models.map((m) => m.status));
    expect(statuses).toEqual(new Set(["ACTIVE", "PREVIEW", "DEPRECATED"]));
    expect(dataset.models.some((m) => m.offerings.length === 0)).toBe(true); // self-host only
    expect(dataset.models.some((m) => m.offerings.some((o) => o.inputPrice === "0.0000"))).toBe(
      true,
    ); // free
  });
});
