/**
 * Ingestion CLI: loads the curated dataset, validates and normalizes it, and writes it to
 * Postgres in a single transaction.
 *
 *   npm run ingest                 # validate + write (uses DIRECT_URL, else DATABASE_URL)
 *   npm run ingest -- --dry-run    # validate only, no database needed
 *   npm run ingest -- --data path  # read a different data directory
 */
import "dotenv/config";
import path from "node:path";
import { parseArgs } from "node:util";
import { createPrismaClient } from "@/platform/db/client";
import { CuratedJsonAdapter } from "./adapters/curated-json";
import { SourceLoadError } from "./adapters/source-adapter";
import { formatReport } from "./report";
import { runIngestion } from "./run";

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      data: { type: "string", default: "data" },
    },
  });
  const dryRun = values["dry-run"];
  const adapter = new CuratedJsonAdapter(path.resolve(values.data));

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!dryRun && !url) {
    console.error("✗ Set DIRECT_URL or DATABASE_URL (see .env.example), or pass --dry-run.");
    return 1;
  }

  const db = dryRun ? undefined : createPrismaClient(url!, { maxConnections: 2 });
  try {
    const report = await runIngestion({ adapter, db, dryRun });
    console.log(formatReport(report));
    return report.status === "succeeded" || report.status === "dry-run" ? 0 : 1;
  } catch (error) {
    if (error instanceof SourceLoadError) {
      console.error(`✗ ${error.message}`);
      return 1;
    }
    throw error;
  } finally {
    await db?.$disconnect();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
