import Link from "next/link";
import { BENCHMARK_CATEGORY_LABELS } from "../labels";
import type { ModelScore, PublicBenchmarkCategory } from "../types";

/** Elo ratings have no fixed scale; this range covers the arena's spread of serious models. */
const ELO_RANGE = { min: 1100, max: 1550 };

export function scoreBarWidth(score: ModelScore): number {
  const share =
    score.benchmark.unit === "percent"
      ? score.score / 100
      : (score.score - ELO_RANGE.min) / (ELO_RANGE.max - ELO_RANGE.min);
  return Math.round(Math.min(1, Math.max(0.02, share)) * 100);
}

export function formatScore(score: ModelScore): string {
  return score.benchmark.unit === "percent"
    ? `${score.score.toFixed(1)}%`
    : String(Math.round(score.score));
}

/** Benchmark results grouped by category, as horizontal bars. */
export function ModelScores({ scores }: { scores: ModelScore[] }) {
  if (scores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No benchmark results in the dataset for this model.
      </p>
    );
  }
  const byCategory = new Map<PublicBenchmarkCategory, ModelScore[]>();
  for (const score of scores) {
    byCategory.set(score.benchmark.category, [
      ...(byCategory.get(score.benchmark.category) ?? []),
      score,
    ]);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[...byCategory].map(([category, categoryScores]) => (
        <section key={category} className="space-y-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {BENCHMARK_CATEGORY_LABELS[category]}
          </h3>
          <ul className="space-y-3">
            {categoryScores.map((score) => (
              <li key={score.benchmark.slug} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <Link href={`/benchmarks/${score.benchmark.slug}`} className="hover:underline">
                    {score.benchmark.name}
                  </Link>
                  <span className="font-medium tabular-nums">
                    {formatScore(score)}
                    {score.benchmark.unit === "elo" ? (
                      <span className="ml-1 text-xs text-muted-foreground">Elo</span>
                    ) : null}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${scoreBarWidth(score)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
