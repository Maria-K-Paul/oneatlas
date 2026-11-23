import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/platform/db/client";
import { CuratedJsonAdapter } from "./adapters/curated-json";
import type { SourceAdapter } from "./adapters/source-adapter";
import { runIngestion, type IngestionReport } from "./run";
import type { WriteStats } from "./types";

const db = createPrismaClient(process.env.TEST_DATABASE_URL!, { maxConnections: 2 });
const curated = new CuratedJsonAdapter(path.resolve(import.meta.dirname, "../../data"));

afterAll(async () => {
  await db.$disconnect();
});

function statsOf(report: IngestionReport): WriteStats {
  if (report.status !== "succeeded") {
    throw new Error(`Ingestion ${report.status}: ${JSON.stringify(report, null, 2)}`);
  }
  return report.stats;
}

const findModel = (lab: string, slug: string) =>
  db.model.findFirstOrThrow({ where: { slug, lab: { slug: lab } } });

describe("ingestion against Postgres", () => {
  it("writes the whole dataset", async () => {
    const report = await runIngestion({ adapter: curated, db });
    statsOf(report);

    expect(await db.lab.count()).toBe(report.counts.labs);
    expect(await db.provider.count()).toBe(report.counts.providers);
    expect(await db.benchmark.count()).toBe(report.counts.benchmarks);
    expect(await db.model.count()).toBe(report.counts.models);
    expect(await db.modelOffering.count()).toBe(report.counts.offerings);
    expect(await db.benchmarkScore.count()).toBe(report.counts.scores);
  });

  it("computes the derived price and availability columns", async () => {
    // GPT-4o mini: OpenAI $0.15/$0.60, Azure and OpenRouter the same → blended (3×0.15 + 0.6) / 4
    const mini = await findModel("openai", "gpt-4o-mini");
    expect(mini.providerCount).toBe(3);
    expect(mini.pricingUnit).toBe("PER_MILLION_TOKENS");
    expect(mini.minInputPrice?.toString()).toBe("0.15");
    expect(mini.minOutputPrice?.toString()).toBe("0.6");
    expect(mini.blendedPrice?.toString()).toBe("0.2625");

    // Veo 3 is published per second ($0.75) and stored per minute.
    const veo = await findModel("google", "veo-3");
    expect(veo.pricingUnit).toBe("PER_MINUTE");
    expect(veo.minInputPrice?.toString()).toBe("45");

    // A self-host-only model has no price at all, rather than a misleading zero.
    const olmo = await findModel("ai2", "olmo-2-32b-instruct");
    expect(olmo.providerCount).toBe(0);
    expect(olmo.pricingUnit).toBeNull();
    expect(olmo.blendedPrice).toBeNull();
  });

  it("is idempotent: a second run writes nothing at all", async () => {
    const stats = statsOf(await runIngestion({ adapter: curated, db }));
    for (const table of Object.values(stats)) {
      expect(table).toMatchObject({ created: 0, updated: 0, deleted: 0 });
    }
    expect(stats.models.unchanged).toBe(await db.model.count());
  });

  it("updates only what changed", async () => {
    const cheaper: SourceAdapter = {
      name: "test",
      load: async () => {
        const raw = await curated.load();
        const models = raw.models.map((record) => {
          const value = record.value as {
            name: string;
            offerings: { provider: string; input?: number }[];
          };
          if (value.name !== "GPT-4o mini") return record;
          const offerings = value.offerings.map((o) =>
            o.provider === "openai-api" ? { ...o, input: 0.1 } : o,
          );
          return { ...record, value: { ...value, offerings } };
        });
        return { ...raw, models };
      },
    };

    const stats = statsOf(await runIngestion({ adapter: cheaper, db }));
    expect(stats.offerings).toMatchObject({ created: 0, updated: 1, deleted: 0 });
    expect(stats.models.updated).toBe(0);
    expect((await findModel("openai", "gpt-4o-mini")).minInputPrice?.toString()).toBe("0.1");

    statsOf(await runIngestion({ adapter: curated, db })); // restore
    expect((await findModel("openai", "gpt-4o-mini")).minInputPrice?.toString()).toBe("0.15");
  });

  it("removes models that leave the dataset, with their offerings and scores", async () => {
    const withoutAnthropic: SourceAdapter = {
      name: "test",
      load: async () => {
        const raw = await curated.load();
        return { ...raw, models: raw.models.filter((m) => m.labSlug !== "anthropic") };
      },
    };

    const stats = statsOf(await runIngestion({ adapter: withoutAnthropic, db }));
    expect(stats.models.deleted).toBe(7);
    expect(stats.offerings.deleted).toBeGreaterThan(0);
    expect(await db.model.count({ where: { lab: { slug: "anthropic" } } })).toBe(0);

    // Restore the full dataset for the tests that follow.
    const restored = statsOf(await runIngestion({ adapter: curated, db }));
    expect(restored.models.created).toBe(7);
  });

  it("records every run in IngestionRun", async () => {
    const latest = await db.ingestionRun.findFirstOrThrow({ orderBy: { startedAt: "desc" } });
    expect(latest).toMatchObject({ status: "SUCCEEDED", source: "curated@2026-11-22" });
    expect(latest.finishedAt).not.toBeNull();
  });

  it("is backed by database CHECK constraints, not just application validation", async () => {
    const offering = await db.modelOffering.findFirstOrThrow();
    await expect(
      db.modelOffering.update({ where: { id: offering.id }, data: { inputPrice: -1 } }),
    ).rejects.toThrow(/ModelOffering_prices_non_negative/);

    const model = await db.model.findFirstOrThrow();
    await expect(
      db.model.update({ where: { id: model.id }, data: { slug: "Not A Slug" } }),
    ).rejects.toThrow(/Model_slug_format/);
  });
});
