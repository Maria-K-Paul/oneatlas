import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  BENCHMARK_CATEGORY_LABELS,
  CAPABILITY_LABELS,
  MODALITY_LABELS,
  MODEL_STATUS_LABELS,
  MODEL_TYPE_LABELS,
  formatScore,
  formatUnitPrice,
  labHref,
  modelHref,
  type ModelDetail,
  type PublicCapability,
} from "@/modules/catalog";
import { CompareSync, CostCalculator, ModelPicker, compareHref } from "@/modules/compare";
import { compareQuerySchema, getComparison } from "@/modules/compare/server";
import { formatDate, formatPrice, formatTokens } from "@/platform/format";
import { PageContainer, PageHeader } from "@/platform/layout";
import { cn } from "@/platform/ui/cn";
import { Skeleton } from "@/platform/ui/skeleton";
import { searchParamsToRecord } from "@/platform/validation";

export const metadata: Metadata = {
  title: "Compare models",
  description:
    "Compare up to four AI models side by side: pricing, context, capabilities and benchmarks.",
};

const SUGGESTIONS = [
  {
    label: "GPT-5.1 vs Claude Opus 4.5 vs Gemini 3 Pro",
    ids: ["openai/gpt-5-1", "anthropic/claude-opus-4-5", "google/gemini-3-pro"],
  },
  {
    label: "Open weights: gpt-oss-120b vs DeepSeek-V3.1 vs Qwen3 235B",
    ids: ["openai/gpt-oss-120b", "deepseek/deepseek-v3-1", "alibaba/qwen3-235b-a22b-instruct-2507"],
  },
  {
    label: "Small and fast: GPT-5 mini vs Claude Haiku 4.5 vs Gemini 2.5 Flash",
    ids: ["openai/gpt-5-mini", "anthropic/claude-haiku-4-5", "google/gemini-2-5-flash"],
  },
];

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Compare models"
        description="Up to four models side by side. The best value in each row is highlighted."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

type Row = { label: string; cells: ReactNode[]; best?: number[] };

/** Indexes of the best value(s) in a row, for highlighting. Needs two or more real values. */
function bestOf(values: (number | null)[], direction: "max" | "min"): number[] {
  const real = values.filter((v): v is number => v !== null);
  if (real.length < 2) return [];
  const target = direction === "max" ? Math.max(...real) : Math.min(...real);
  if (real.every((v) => v === target)) return [];
  return values.flatMap((v, i) => (v === target ? [i] : []));
}

async function Comparison({
  searchParams,
}: {
  searchParams: PageProps<"/compare">["searchParams"];
}) {
  const parsed = compareQuerySchema.safeParse(searchParamsToRecord(await searchParams));
  const ids = parsed.success ? parsed.data.models : [];
  const { models, benchmarks, missing } = await getComparison(ids);
  const currentIds = models.map((m) => m.id);

  const syncItems = models.map((m) => ({ id: m.id, name: m.name }));
  if (models.length === 0) {
    return (
      <div className="space-y-6">
        <CompareSync items={syncItems} />
        <ModelPicker currentIds={currentIds} />
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Or start from a popular comparison</h2>
          <ul className="space-y-1.5">
            {SUGGESTIONS.map((s) => (
              <li key={s.label}>
                <Link href={compareHref(s.ids)} className="text-sm hover:underline">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {!parsed.success ? (
          <p className="text-sm text-destructive">
            That comparison link isn’t valid, so it was reset.
          </p>
        ) : null}
      </div>
    );
  }

  const tokenPrice = (m: ModelDetail, field: "input" | "output" | "blended") =>
    m.pricing?.unit === "per_million_tokens" ? m.pricing[field] : null;
  const yesNo = (value: boolean) =>
    value ? (
      <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Yes" />
    ) : (
      <MinusIcon className="size-4 text-muted-foreground" aria-label="No" />
    );

  const allCapabilities = Object.keys(CAPABILITY_LABELS) as PublicCapability[];
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Overview",
      rows: [
        {
          label: "Lab",
          cells: models.map((m) => (
            <Link key={m.id} href={labHref(m.lab.slug)} className="hover:underline">
              {m.lab.name}
            </Link>
          )),
        },
        { label: "Type", cells: models.map((m) => MODEL_TYPE_LABELS[m.type]) },
        { label: "Status", cells: models.map((m) => MODEL_STATUS_LABELS[m.status]) },
        { label: "Released", cells: models.map((m) => formatDate(m.releaseDate)) },
        { label: "Open weights", cells: models.map((m) => yesNo(m.openWeights)) },
        { label: "License", cells: models.map((m) => m.license ?? "—") },
      ],
    },
    {
      title: "Limits",
      rows: [
        {
          label: "Context window",
          cells: models.map((m) => formatTokens(m.contextWindow)),
          best: bestOf(
            models.map((m) => m.contextWindow),
            "max",
          ),
        },
        {
          label: "Max output",
          cells: models.map((m) => formatTokens(m.maxOutputTokens)),
          best: bestOf(
            models.map((m) => m.maxOutputTokens),
            "max",
          ),
        },
      ],
    },
    {
      title: "Pricing (cheapest provider)",
      rows: [
        {
          label: "Input / 1M",
          cells: models.map((m) =>
            m.pricing?.unit === "per_million_tokens"
              ? formatPrice(m.pricing.input)
              : formatUnitPrice(m.pricing?.input ?? null, m.pricing?.unit),
          ),
          best: bestOf(
            models.map((m) => tokenPrice(m, "input")),
            "min",
          ),
        },
        {
          label: "Output / 1M",
          cells: models.map((m) => formatPrice(tokenPrice(m, "output"))),
          best: bestOf(
            models.map((m) => tokenPrice(m, "output")),
            "min",
          ),
        },
        {
          label: "Blended / 1M",
          cells: models.map((m) => formatPrice(tokenPrice(m, "blended"))),
          best: bestOf(
            models.map((m) => tokenPrice(m, "blended")),
            "min",
          ),
        },
        {
          label: "Providers",
          cells: models.map((m) => m.providerCount || "—"),
          best: bestOf(
            models.map((m) => m.providerCount),
            "max",
          ),
        },
      ],
    },
    {
      title: "Capabilities",
      rows: [
        {
          label: "Input",
          cells: models.map((m) => m.modalities.input.map((x) => MODALITY_LABELS[x]).join(", ")),
        },
        {
          label: "Output",
          cells: models.map(
            (m) => m.modalities.output.map((x) => MODALITY_LABELS[x]).join(", ") || "Vectors",
          ),
        },
        ...allCapabilities.map((c) => ({
          label: CAPABILITY_LABELS[c],
          cells: models.map((m) => yesNo(m.capabilities.includes(c))),
        })),
      ],
    },
    {
      title: "Benchmarks",
      rows: benchmarks.map((b) => {
        const scores = models.map((m) => m.scores.find((s) => s.benchmark.slug === b.slug) ?? null);
        return {
          label: `${b.name} · ${BENCHMARK_CATEGORY_LABELS[b.category]}`,
          cells: scores.map((s) => (s ? formatScore(s) : "—")),
          best: bestOf(
            scores.map((s) => s?.score ?? null),
            "max",
          ),
        };
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <CompareSync items={syncItems} />
      <ModelPicker currentIds={currentIds} />
      {missing.length ? (
        <p className="text-sm text-muted-foreground">Not found and skipped: {missing.join(", ")}</p>
      ) : null}
      {models.length === 1 ? (
        <p className="text-sm text-muted-foreground">Add at least one more model to compare.</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b">
              <th
                scope="col"
                className="sticky left-0 z-10 w-44 bg-background px-4 py-3 text-left text-xs font-medium text-muted-foreground"
              >
                <span className="sr-only">Attribute</span>
              </th>
              {models.map((m) => (
                <th key={m.id} scope="col" className="px-4 py-3 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={modelHref(m.id)} className="font-semibold hover:underline">
                      {m.name}
                    </Link>
                    <Link
                      href={compareHref(currentIds.filter((id) => id !== m.id))}
                      scroll={false}
                      aria-label={`Remove ${m.name}`}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <XIcon className="size-4" aria-hidden />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {sections.map((section) =>
            section.rows.length ? (
              <tbody key={section.title} className="border-b last:border-0">
                <tr>
                  <th
                    colSpan={models.length + 1}
                    scope="colgroup"
                    className="bg-muted/40 px-4 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {section.title}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t first:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 bg-background px-4 py-2.5 text-left font-normal text-muted-foreground"
                    >
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={models[i]!.id}
                        className={cn(
                          "px-4 py-2.5 tabular-nums",
                          row.best?.includes(i) &&
                            "font-semibold text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : null,
          )}
        </table>
      </div>

      <CostCalculator
        models={models.map((m) => ({
          id: m.id,
          name: m.name,
          input: tokenPrice(m, "input"),
          output: tokenPrice(m, "output"),
        }))}
      />
    </div>
  );
}
