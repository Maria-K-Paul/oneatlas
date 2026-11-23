import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/platform/db";

/** When the catalog was last ingested, for the "Data updated …" note in the footer. */
export async function getDataFreshness(): Promise<{
  updatedAt: string | null;
  source: string | null;
}> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const run = await getDb().ingestionRun.findFirst({
    where: { status: "SUCCEEDED" },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true, source: true },
  });
  return { updatedAt: run?.finishedAt?.toISOString() ?? null, source: run?.source ?? null };
}

export type HealthReport = {
  status: "ok" | "degraded";
  database: { reachable: boolean; latencyMs: number | null };
  data: {
    lastIngestedAt: string | null;
    source: string | null;
    counts: {
      labs: number;
      providers: number;
      models: number;
      offerings: number;
      benchmarks: number;
      scores: number;
    };
  } | null;
};

/** Liveness + data check for /api/v1/health, Docker HEALTHCHECK and uptime monitors. */
export async function checkHealth(): Promise<HealthReport> {
  const db = getDb();
  const started = performance.now();

  try {
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - started);

    const [lastRun, labs, providers, models, offerings, benchmarks, scores] = await Promise.all([
      db.ingestionRun.findFirst({
        where: { status: "SUCCEEDED" },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true, source: true },
      }),
      db.lab.count(),
      db.provider.count(),
      db.model.count(),
      db.modelOffering.count(),
      db.benchmark.count(),
      db.benchmarkScore.count(),
    ]);

    return {
      status: models > 0 ? "ok" : "degraded",
      database: { reachable: true, latencyMs },
      data: {
        lastIngestedAt: lastRun?.finishedAt?.toISOString() ?? null,
        source: lastRun?.source ?? null,
        counts: { labs, providers, models, offerings, benchmarks, scores },
      },
    };
  } catch (error) {
    console.error("[health] database check failed", error);
    return { status: "degraded", database: { reachable: false, latencyMs: null }, data: null };
  }
}
