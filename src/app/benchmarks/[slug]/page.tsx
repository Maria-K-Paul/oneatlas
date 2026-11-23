import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BENCHMARK_CATEGORY_LABELS, PriceSummary, labHref, modelHref } from "@/modules/catalog";
import { CompareToggle } from "@/modules/compare";
import { getBenchmark, listBenchmarkSlugs } from "@/modules/rankings/server";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";
import { cn } from "@/platform/ui/cn";

export async function generateStaticParams() {
  return listBenchmarkSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/benchmarks/[slug]">): Promise<Metadata> {
  const benchmark = await getBenchmark((await params).slug);
  return benchmark
    ? { title: `${benchmark.name} leaderboard`, description: benchmark.description ?? undefined }
    : { title: "Benchmark not found" };
}

export default async function BenchmarkPage({ params }: PageProps<"/benchmarks/[slug]">) {
  const benchmark = await getBenchmark((await params).slug);
  if (!benchmark) notFound();
  const isPercent = benchmark.unit === "percent";
  const best = benchmark.results[0]?.score ?? 0;
  const worst = benchmark.results.at(-1)?.score ?? 0;
  const width = (score: number) =>
    isPercent ? score : worst === best ? 100 : 10 + ((score - worst) / (best - worst)) * 90;

  return (
    <PageContainer className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/benchmarks" className="hover:text-foreground">
          Benchmarks
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground" aria-current="page">
          {benchmark.name}
        </span>
      </nav>
      <PageHeader
        title={benchmark.name}
        description={benchmark.description}
        actions={
          benchmark.sourceUrl ? (
            <a
              href={benchmark.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Source <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary" className="font-normal">
          {BENCHMARK_CATEGORY_LABELS[benchmark.category]}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {isPercent ? "Score, %" : "Elo rating"}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {benchmark.higherIsBetter ? "Higher is better" : "Lower is better"}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {benchmark.scoreCount} models
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-12 px-4 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Model
              </th>
              <th scope="col" className="w-2/5 px-3 py-2.5 font-medium">
                {isPercent ? "Score" : "Elo"}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                Price
              </th>
              <th scope="col" className="w-10 px-3">
                <span className="sr-only">Compare</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {benchmark.results.map((result) => (
              <tr key={result.model.id} className="hover:bg-muted/30">
                <td
                  className={cn(
                    "px-4 py-3 font-semibold tabular-nums",
                    result.rank === 1 && "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {result.rank}
                </td>
                <td className="px-3 py-3">
                  <Link href={modelHref(result.model.id)} className="font-medium hover:underline">
                    {result.model.name}
                  </Link>
                  <Link
                    href={labHref(result.model.lab.slug)}
                    className="block text-xs text-muted-foreground hover:text-foreground"
                  >
                    {result.model.lab.name}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${Math.max(2, width(result.score))}%` }}
                      />
                    </div>
                    <span className="w-14 text-right font-medium tabular-nums">
                      {isPercent ? `${result.score.toFixed(1)}%` : Math.round(result.score)}
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-right text-xs md:table-cell">
                  <PriceSummary pricing={result.model.pricing} />
                </td>
                <td className="px-3 py-3">
                  <CompareToggle id={result.model.id} name={result.model.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
