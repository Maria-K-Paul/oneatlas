import type { Database } from "@/platform/db/client";
import type { SourceAdapter } from "./adapters/source-adapter";
import { IssueCollector, type Issue } from "./issues";
import { normalizeDataset } from "./normalize";
import type { NormalizedDataset, WriteStats } from "./types";
import { validateDataset } from "./validate";
import { writeDataset } from "./write";

export type DatasetCounts = {
  labs: number;
  providers: number;
  benchmarks: number;
  models: number;
  offerings: number;
  scores: number;
};

export type IngestionReport =
  | { status: "invalid"; source: string; issues: Issue[]; counts: DatasetCounts }
  | { status: "dry-run"; source: string; issues: Issue[]; counts: DatasetCounts }
  | {
      status: "succeeded";
      source: string;
      issues: Issue[];
      counts: DatasetCounts;
      stats: WriteStats;
      durationMs: number;
    }
  | { status: "failed"; source: string; issues: Issue[]; counts: DatasetCounts; error: string };

export function countDataset(data: NormalizedDataset): DatasetCounts {
  return {
    labs: data.labs.length,
    providers: data.providers.length,
    benchmarks: data.benchmarks.length,
    models: data.models.length,
    offerings: data.models.reduce((sum, m) => sum + m.offerings.length, 0),
    scores: data.models.reduce((sum, m) => sum + m.scores.length, 0),
  };
}

/** Load → normalize → validate, with no database access. Used by the CLI, dry runs and tests. */
export async function prepareDataset(adapter: SourceAdapter) {
  const raw = await adapter.load();
  const issues = new IssueCollector();
  const dataset = normalizeDataset(raw, issues);
  validateDataset(dataset, issues);
  return { dataset, issues };
}

/**
 * The whole pipeline (docs §6). Any validation error aborts before the database is touched.
 * Every attempt that reaches the database is recorded in IngestionRun, success or failure.
 */
export async function runIngestion({
  adapter,
  db,
  dryRun = false,
}: {
  adapter: SourceAdapter;
  db?: Database;
  dryRun?: boolean;
}): Promise<IngestionReport> {
  const { dataset, issues } = await prepareDataset(adapter);
  const base = { source: dataset.source, issues: issues.issues, counts: countDataset(dataset) };

  if (issues.errors.length > 0) return { status: "invalid", ...base };
  if (dryRun) return { status: "dry-run", ...base };
  if (!db) throw new Error("A database client is required unless dryRun is set");

  const startedAt = new Date();
  try {
    const stats = await writeDataset(db, dataset);
    const finishedAt = new Date();
    await db.ingestionRun.create({
      data: { source: dataset.source, status: "SUCCEEDED", startedAt, finishedAt, stats },
    });
    return {
      status: "succeeded",
      ...base,
      stats,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.ingestionRun
      .create({
        data: {
          source: dataset.source,
          status: "FAILED",
          startedAt,
          finishedAt: new Date(),
          error: message,
        },
      })
      .catch(() => undefined); // if the database itself is down, the original error matters more
    return { status: "failed", ...base, error: message };
  }
}
