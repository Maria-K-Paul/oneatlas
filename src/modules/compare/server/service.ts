import "server-only";
import { z } from "zod";
import type { ModelDetail, ModelScore } from "@/modules/catalog";
import { getModelsByIds, modelIdParam } from "@/modules/catalog/server";
import { csvList } from "@/platform/validation";
import { MAX_COMPARE } from "../constants";

export const compareQuerySchema = z.object({
  models: csvList(modelIdParam, { max: MAX_COMPARE }).default([]),
});

export type Comparison = {
  models: ModelDetail[];
  /** Every benchmark any of the models has a score for, in a stable order. */
  benchmarks: ModelScore["benchmark"][];
  /** Requested ids that don't exist. */
  missing: string[];
};

/** 2–4 models aligned for side-by-side display (docs §7, /compare). */
export async function getComparison(
  ids: { id: string; lab: string; slug: string }[],
): Promise<Comparison> {
  const models = await getModelsByIds(ids.map(({ lab, slug }) => ({ lab, slug })));
  const found = new Set(models.map((m) => m.id));
  const benchmarks = new Map<string, ModelScore["benchmark"]>();
  for (const model of models)
    for (const s of model.scores) benchmarks.set(s.benchmark.slug, s.benchmark);

  return {
    models,
    benchmarks: [...benchmarks.values()].sort(
      (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    ),
    missing: ids.filter(({ id }) => !found.has(id)).map(({ id }) => id),
  };
}
