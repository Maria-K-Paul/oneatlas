import { Prisma } from "@/generated/prisma/client";
import type { Database } from "@/platform/db/client";
import type { NormalizedDataset, TableStats, WriteStats } from "./types";

type Tx = Parameters<Parameters<Database["$transaction"]>[0]>[0];

// ───────────────────────── Diffing (pure, unit-tested) ─────────────────────────

/**
 * Compares a database value with a desired value. Prices come back from Prisma as Decimal and
 * are compared numerically ("0.1500" equals 0.15); dates by instant; arrays element by element.
 */
export function sameValue(current: unknown, desired: unknown): boolean {
  if (desired === null || desired === undefined) return current === null || current === undefined;
  if (current === null || current === undefined) return false;
  if (desired instanceof Date)
    return current instanceof Date && current.getTime() === desired.getTime();
  if (Array.isArray(desired)) {
    return (
      Array.isArray(current) &&
      current.length === desired.length &&
      desired.every((value, index) => sameValue(current[index], value))
    );
  }
  if (Prisma.Decimal.isDecimal(current)) {
    return (current as Prisma.Decimal).equals(new Prisma.Decimal(desired as string | number));
  }
  return current === desired;
}

export type SyncPlan<Input> = {
  create: Input[];
  update: { id: string; data: Input }[];
  remove: string[];
  unchanged: number;
};

/**
 * Works out the minimum set of writes that turns `existing` rows into `desired` records,
 * matching them by natural key. Unchanged rows are not written at all, so a re-run of the same
 * snapshot touches nothing and finishes in a handful of queries.
 */
export function planSync<Row extends { id: string }, Input extends object>(
  existing: Row[],
  desired: Input[],
  keyOfRow: (row: Row) => string,
  keyOfInput: (input: Input) => string,
): SyncPlan<Input> {
  const byKey = new Map(existing.map((row) => [keyOfRow(row), row]));
  const plan: SyncPlan<Input> = { create: [], update: [], remove: [], unchanged: 0 };
  const wanted = new Set<string>();

  for (const input of desired) {
    const key = keyOfInput(input);
    wanted.add(key);
    const row = byKey.get(key);
    if (!row) {
      plan.create.push(input);
    } else if (
      Object.entries(input).every(([field, value]) =>
        sameValue((row as Record<string, unknown>)[field], value),
      )
    ) {
      plan.unchanged++;
    } else {
      plan.update.push({ id: row.id, data: input });
    }
  }
  for (const [key, row] of byKey) {
    if (!wanted.has(key)) plan.remove.push(row.id);
  }
  return plan;
}

const statsOf = (plan: SyncPlan<unknown>): TableStats => ({
  created: plan.create.length,
  updated: plan.update.length,
  deleted: plan.remove.length,
  unchanged: plan.unchanged,
});

// ───────────────────────── Writing ─────────────────────────

/**
 * Writes a validated dataset in ONE transaction: either the whole snapshot lands or nothing
 * changes (docs §6). The dataset is the source of truth, so rows missing from it are removed.
 * Rows are matched on natural keys (slugs), which keeps IDs stable and makes re-runs idempotent.
 * Creates go out in bulk and only changed rows are updated, so the number of round trips stays
 * small even against a remote database.
 */
export async function writeDataset(db: Database, data: NormalizedDataset): Promise<WriteStats> {
  return db.$transaction(
    async (tx) => {
      // Labs
      const labs = planSync(
        await tx.lab.findMany(),
        data.labs.map(({ origin: _origin, ...lab }) => lab),
        (row) => row.slug,
        (input) => input.slug,
      );
      await apply(
        labs,
        (rows) => tx.lab.createMany({ data: rows }),
        (id, row) => tx.lab.update({ where: { id }, data: row }),
      );
      const labIds = await idMap(
        tx.lab.findMany({ select: { id: true, slug: true } }),
        (l) => l.slug,
      );

      // Providers
      const providers = planSync(
        await tx.provider.findMany(),
        data.providers.map(({ origin: _origin, labSlug, ...provider }) => ({
          ...provider,
          labId: labSlug ? labIds.get(labSlug)! : null,
        })),
        (row) => row.slug,
        (input) => input.slug,
      );
      await apply(
        providers,
        (rows) => tx.provider.createMany({ data: rows }),
        (id, row) => tx.provider.update({ where: { id }, data: row }),
      );
      const providerIds = await idMap(
        tx.provider.findMany({ select: { id: true, slug: true } }),
        (p) => p.slug,
      );

      // Benchmarks
      const benchmarks = planSync(
        await tx.benchmark.findMany(),
        data.benchmarks.map(({ origin: _origin, ...benchmark }) => benchmark),
        (row) => row.slug,
        (input) => input.slug,
      );
      await apply(
        benchmarks,
        (rows) => tx.benchmark.createMany({ data: rows }),
        (id, row) => tx.benchmark.update({ where: { id }, data: row }),
      );
      const benchmarkIds = await idMap(
        tx.benchmark.findMany({ select: { id: true, slug: true } }),
        (b) => b.slug,
      );

      // Models (derived price columns are excluded here; they're recomputed below)
      const modelKey = (labId: string, slug: string) => `${labId}/${slug}`;
      const models = planSync(
        await tx.model.findMany(),
        data.models.map(
          ({ origin: _origin, labSlug, offerings: _offerings, scores: _scores, ...model }) => ({
            ...model,
            labId: labIds.get(labSlug)!,
          }),
        ),
        (row) => modelKey(row.labId, row.slug),
        (input) => modelKey(input.labId, input.slug),
      );
      await apply(
        models,
        (rows) => tx.model.createMany({ data: rows }),
        (id, row) => tx.model.update({ where: { id }, data: row }),
      );
      const modelIds = await idMap(
        tx.model.findMany({ select: { id: true, slug: true, labId: true } }),
        (m) => modelKey(m.labId, m.slug),
      );
      const idOfModel = (labSlug: string, slug: string) =>
        modelIds.get(modelKey(labIds.get(labSlug)!, slug))!;

      // Offerings
      const offerings = planSync(
        await tx.modelOffering.findMany(),
        data.models.flatMap((model) =>
          model.offerings.map(({ path: _path, providerSlug, ...offering }) => ({
            ...offering,
            modelId: idOfModel(model.labSlug, model.slug),
            providerId: providerIds.get(providerSlug)!,
          })),
        ),
        (row) => `${row.modelId}/${row.providerId}`,
        (input) => `${input.modelId}/${input.providerId}`,
      );
      await apply(
        offerings,
        (rows) => tx.modelOffering.createMany({ data: rows }),
        (id, row) => tx.modelOffering.update({ where: { id }, data: row }),
      );
      await removeAll(offerings, (ids) =>
        tx.modelOffering.deleteMany({ where: { id: { in: ids } } }),
      );

      // Scores
      const scores = planSync(
        await tx.benchmarkScore.findMany(),
        data.models.flatMap((model) =>
          model.scores.map(({ benchmarkSlug, score }) => ({
            modelId: idOfModel(model.labSlug, model.slug),
            benchmarkId: benchmarkIds.get(benchmarkSlug)!,
            score,
          })),
        ),
        (row) => `${row.modelId}/${row.benchmarkId}`,
        (input) => `${input.modelId}/${input.benchmarkId}`,
      );
      await apply(
        scores,
        (rows) => tx.benchmarkScore.createMany({ data: rows }),
        (id, row) => tx.benchmarkScore.update({ where: { id }, data: row }),
      );
      await removeAll(scores, (ids) =>
        tx.benchmarkScore.deleteMany({ where: { id: { in: ids } } }),
      );

      // Parents that left the snapshot. Labs go last: they Restrict-delete while models remain.
      await removeAll(models, (ids) => tx.model.deleteMany({ where: { id: { in: ids } } }));
      await removeAll(providers, (ids) => tx.provider.deleteMany({ where: { id: { in: ids } } }));
      await removeAll(benchmarks, (ids) => tx.benchmark.deleteMany({ where: { id: { in: ids } } }));
      await removeAll(labs, (ids) => tx.lab.deleteMany({ where: { id: { in: ids } } }));

      await refreshDerivedColumns(tx);

      return {
        labs: statsOf(labs),
        providers: statsOf(providers),
        benchmarks: statsOf(benchmarks),
        models: statsOf(models),
        offerings: statsOf(offerings),
        scores: statsOf(scores),
      };
    },
    { timeout: 5 * 60_000, maxWait: 15_000 },
  );
}

async function apply<Input>(
  plan: SyncPlan<Input>,
  createMany: (rows: Input[]) => Promise<unknown>,
  update: (id: string, row: Input) => Promise<unknown>,
) {
  if (plan.create.length > 0) await createMany(plan.create);
  for (const { id, data } of plan.update) await update(id, data);
}

async function removeAll(plan: SyncPlan<unknown>, deleteMany: (ids: string[]) => Promise<unknown>) {
  if (plan.remove.length > 0) await deleteMany(plan.remove);
}

async function idMap<Row extends { id: string }>(rows: Promise<Row[]>, key: (row: Row) => string) {
  return new Map((await rows).map((row) => [key(row), row.id]));
}

/**
 * Recomputes the price and availability columns copied onto Model (docs D9, §5.6) in one
 * statement, inside the same transaction as the offerings it summarizes, so they can't drift.
 * Blended price weights input 3:1 over output; with no output price, it is the input price.
 */
export async function refreshDerivedColumns(tx: Tx): Promise<number> {
  return tx.$executeRaw`
    UPDATE "Model" AS m
    SET
      "pricingUnit"    = s.pricing_unit,
      "minInputPrice"  = s.min_input,
      "minOutputPrice" = s.min_output,
      "blendedPrice"   = s.blended,
      "providerCount"  = s.provider_count
    FROM (
      SELECT
        model.id,
        (array_agg(o."pricingUnit") FILTER (WHERE o.id IS NOT NULL))[1] AS pricing_unit,
        MIN(o."inputPrice")                                              AS min_input,
        MIN(o."outputPrice")                                             AS min_output,
        MIN((3 * o."inputPrice" + COALESCE(o."outputPrice", o."inputPrice")) / 4) AS blended,
        COUNT(o.id)::int                                                 AS provider_count
      FROM "Model" AS model
      LEFT JOIN "ModelOffering" AS o ON o."modelId" = model.id
      GROUP BY model.id
    ) AS s
    WHERE m.id = s.id
      AND (
        m."pricingUnit"    IS DISTINCT FROM s.pricing_unit OR
        m."minInputPrice"  IS DISTINCT FROM s.min_input OR
        m."minOutputPrice" IS DISTINCT FROM s.min_output OR
        m."blendedPrice"   IS DISTINCT FROM s.blended::numeric(10, 4) OR
        m."providerCount"  IS DISTINCT FROM s.provider_count
      )
  `;
}
