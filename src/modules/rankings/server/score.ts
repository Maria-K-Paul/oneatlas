/**
 * Ranking math (docs §9). Pure functions with no database access, so the formula is easy to
 * read, test and explain.
 *
 * 1. Normalize every score to 0–100 on its benchmark's scale (percent as-is; Elo and other
 *    scales by min–max across the scored models), inverting when lower is better.
 * 2. Category index = mean of a model's normalized scores in that category, if it has results
 *    for at least half of the category's benchmarks (so one lucky result can't top a board).
 * 3. Overall index = mean of the model's category indexes, if it has at least `minCategories`.
 */

export type BenchmarkInput = {
  slug: string;
  category: string;
  higherIsBetter: boolean;
  minScore: number | null;
  maxScore: number | null;
};

export type ScoreInput = { modelId: string; benchmarkSlug: string; score: number };

export type CategoryIndex = { value: number; covered: number; total: number };

export function normalizeScores(
  benchmarks: BenchmarkInput[],
  scores: ScoreInput[],
): Map<string, Map<string, number>> {
  const byBenchmark = new Map<string, ScoreInput[]>();
  for (const s of scores)
    byBenchmark.set(s.benchmarkSlug, [...(byBenchmark.get(s.benchmarkSlug) ?? []), s]);

  const normalized = new Map<string, Map<string, number>>();
  for (const benchmark of benchmarks) {
    const results = byBenchmark.get(benchmark.slug) ?? [];
    if (results.length === 0) continue;
    const observed = results.map((r) => r.score);
    const min = benchmark.minScore ?? Math.min(...observed);
    const max = benchmark.maxScore ?? Math.max(...observed);

    for (const { modelId, score } of results) {
      let value = max === min ? 50 : ((score - min) / (max - min)) * 100;
      value = Math.min(100, Math.max(0, value));
      if (!benchmark.higherIsBetter) value = 100 - value;
      const forModel = normalized.get(modelId) ?? new Map<string, number>();
      forModel.set(benchmark.slug, value);
      normalized.set(modelId, forModel);
    }
  }
  return normalized;
}

export function categoryIndexes(
  benchmarks: BenchmarkInput[],
  normalized: Map<string, Map<string, number>>,
): Map<string, Map<string, CategoryIndex>> {
  // Only benchmarks that at least one model has results for count toward coverage.
  const scored = new Set([...normalized.values()].flatMap((m) => [...m.keys()]));
  const byCategory = new Map<string, string[]>();
  for (const b of benchmarks) {
    if (scored.has(b.slug))
      byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b.slug]);
  }

  const result = new Map<string, Map<string, CategoryIndex>>();
  for (const [modelId, scores] of normalized) {
    const indexes = new Map<string, CategoryIndex>();
    for (const [category, slugs] of byCategory) {
      const values = slugs.flatMap((slug) => (scores.has(slug) ? [scores.get(slug)!] : []));
      const required = Math.ceil(slugs.length / 2);
      if (values.length > 0 && values.length >= required) {
        indexes.set(category, {
          value: values.reduce((a, b) => a + b, 0) / values.length,
          covered: values.length,
          total: slugs.length,
        });
      }
    }
    result.set(modelId, indexes);
  }
  return result;
}

export function overallIndexes(
  indexes: Map<string, Map<string, CategoryIndex>>,
  minCategories = 3,
): Map<string, { value: number; categories: number }> {
  const result = new Map<string, { value: number; categories: number }>();
  for (const [modelId, categories] of indexes) {
    if (categories.size < minCategories) continue;
    const values = [...categories.values()].map((c) => c.value);
    result.set(modelId, {
      value: values.reduce((a, b) => a + b, 0) / values.length,
      categories: categories.size,
    });
  }
  return result;
}

/** Index points per dollar of blended price. Free (0) or unknown prices are excluded. */
export function valueScore(index: number, blendedPrice: number | null): number | null {
  if (blendedPrice === null || blendedPrice <= 0) return null;
  return index / blendedPrice;
}
