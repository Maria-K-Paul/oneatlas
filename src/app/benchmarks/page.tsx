import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BENCHMARK_CATEGORY_LABELS,
  modelHref,
  type PublicBenchmarkCategory,
} from "@/modules/catalog";
import type { BenchmarkSummary } from "@/modules/rankings";
import { listBenchmarks } from "@/modules/rankings/server";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";

export const metadata: Metadata = {
  title: "Benchmarks",
  description:
    "The benchmarks behind OneAtlas rankings: what each one measures and which models lead it.",
};

function formatResult(benchmark: BenchmarkSummary, score: number) {
  return benchmark.unit === "percent" ? `${score.toFixed(1)}%` : String(Math.round(score));
}

export default async function BenchmarksPage() {
  const benchmarks = await listBenchmarks();
  const byCategory = new Map<PublicBenchmarkCategory, BenchmarkSummary[]>();
  for (const b of benchmarks)
    byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b]);

  return (
    <PageContainer className="space-y-10">
      <PageHeader
        title="Benchmarks"
        description="What each benchmark measures, and the models that lead it. Open one for its full leaderboard."
      />
      {[...byCategory].map(([category, items]) => (
        <section key={category} aria-labelledby={`cat-${category}`} className="space-y-3">
          <h2 id={`cat-${category}`} className="text-lg font-semibold tracking-tight">
            {BENCHMARK_CATEGORY_LABELS[category]}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((benchmark) => (
              <article key={benchmark.slug} className="flex flex-col rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">
                    <Link href={`/benchmarks/${benchmark.slug}`} className="hover:underline">
                      {benchmark.name}
                    </Link>
                  </h3>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {benchmark.scoreCount} results
                  </Badge>
                </div>
                {benchmark.description ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">{benchmark.description}</p>
                ) : null}
                <ol className="mt-4 space-y-1.5 text-sm">
                  {benchmark.top.map((entry, index) => (
                    <li key={entry.model.id} className="flex items-center gap-2">
                      <span className="w-4 text-muted-foreground tabular-nums">{index + 1}</span>
                      <Link
                        href={modelHref(entry.model.id)}
                        className="flex-1 truncate hover:underline"
                      >
                        {entry.model.name}
                      </Link>
                      <span className="font-medium tabular-nums">
                        {formatResult(benchmark, entry.score)}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                  <Link
                    href={`/benchmarks/${benchmark.slug}`}
                    className="font-medium hover:underline"
                  >
                    Full leaderboard
                  </Link>
                  {benchmark.sourceUrl ? (
                    <a
                      href={benchmark.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      Source <ExternalLinkIcon className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </PageContainer>
  );
}
