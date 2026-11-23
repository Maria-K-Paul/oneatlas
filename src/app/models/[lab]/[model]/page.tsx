import { ChevronRightIcon, CodeIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CapabilityList,
  ModalityList,
  ModelCardGrid,
  ModelScores,
  ModelTypeBadge,
  OpenWeightsBadge,
  PROVIDER_KIND_LABELS,
  StatusBadge,
  formatUnitPrice,
  labHref,
  providerHref,
} from "@/modules/catalog";
import { getModel, getRelatedModels, listModelIds } from "@/modules/catalog/server";
import { CompareToggle } from "@/modules/compare";
import { formatDate, formatParameters, formatPrice, formatTokens } from "@/platform/format";
import { PageContainer } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";

/** Every model page is prerendered at build time; new models render on first visit. */
export async function generateStaticParams() {
  return listModelIds();
}

export async function generateMetadata({
  params,
}: PageProps<"/models/[lab]/[model]">): Promise<Metadata> {
  const { lab, model } = await params;
  const detail = await getModel(lab, model);
  if (!detail) return { title: "Model not found" };
  return {
    title: `${detail.name} · ${detail.lab.name}`,
    description:
      detail.description ??
      `${detail.name} by ${detail.lab.name}: specs, pricing across providers, capabilities and benchmarks.`,
  };
}

export default async function ModelPage({ params }: PageProps<"/models/[lab]/[model]">) {
  const { lab, model } = await params;
  const detail = await getModel(lab, model);
  if (!detail) notFound();
  const related = await getRelatedModels(lab, model);
  const isTokenPriced = detail.pricing?.unit === "per_million_tokens";

  const specs: { label: string; value: string; hint?: string }[] = [
    { label: "Context window", value: formatTokens(detail.contextWindow), hint: "tokens" },
    { label: "Max output", value: formatTokens(detail.maxOutputTokens), hint: "tokens" },
    isTokenPriced
      ? {
          label: "Input price",
          value: formatPrice(detail.pricing!.input),
          hint: "from, per 1M tokens",
        }
      : {
          label: "Price",
          value: formatUnitPrice(detail.pricing?.input ?? null, detail.pricing?.unit),
          hint: "from",
        },
    ...(isTokenPriced
      ? [
          {
            label: "Output price",
            value: formatPrice(detail.pricing!.output),
            hint: "from, per 1M tokens",
          },
          {
            label: "Blended price",
            value: formatPrice(detail.pricing!.blended),
            hint: "3:1 input:output",
          },
        ]
      : []),
    { label: "Providers", value: String(detail.providerCount || "—") },
    { label: "Released", value: formatDate(detail.releaseDate) },
    { label: "Knowledge cutoff", value: formatDate(detail.knowledgeCutoff) },
    { label: "Parameters", value: formatParameters(detail.parametersB) },
    { label: "License", value: detail.license ?? "—" },
  ];

  return (
    <PageContainer className="space-y-10">
      <div className="space-y-5">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Link href="/models" className="hover:text-foreground">
            Models
          </Link>
          <ChevronRightIcon className="size-3.5" aria-hidden />
          <Link href={labHref(detail.lab.slug)} className="hover:text-foreground">
            {detail.lab.name}
          </Link>
          <ChevronRightIcon className="size-3.5" aria-hidden />
          <span className="text-foreground" aria-current="page">
            {detail.name}
          </span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{detail.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={labHref(detail.lab.slug)}
                className="text-muted-foreground hover:text-foreground"
              >
                by {detail.lab.name}
              </Link>
              <ModelTypeBadge type={detail.type} />
              <StatusBadge status={detail.status} />
              <OpenWeightsBadge openWeights={detail.openWeights} />
              {detail.family ? (
                <Badge variant="secondary" className="font-normal">
                  {detail.family}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <CompareToggle id={detail.id} name={detail.name} variant="button" />
            <Button asChild variant="ghost">
              <a href={`/api/v1/models/${detail.id}`} target="_blank" rel="noreferrer">
                <CodeIcon aria-hidden /> JSON
              </a>
            </Button>
          </div>
        </div>
        {detail.description ? (
          <p className="max-w-3xl text-muted-foreground">{detail.description}</p>
        ) : null}
      </div>

      <section aria-labelledby="specs">
        <h2 id="specs" className="sr-only">
          Specifications
        </h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-5">
          {specs.map((spec) => (
            <div key={spec.label} className="bg-background p-4">
              <dt className="text-xs text-muted-foreground">{spec.label}</dt>
              <dd className="mt-1 text-lg font-medium tabular-nums">{spec.value}</dd>
              {spec.hint && spec.value !== "—" ? (
                <dd className="text-xs text-muted-foreground">{spec.hint}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Input</h2>
          <ModalityList modalities={detail.modalities.input} />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Output</h2>
          <ModalityList modalities={detail.modalities.output} />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Capabilities</h2>
          <CapabilityList capabilities={detail.capabilities} />
        </div>
      </section>

      <section aria-labelledby="providers" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="providers" className="text-xl font-semibold tracking-tight">
            Providers and pricing
          </h2>
          {detail.pricing ? (
            <p className="text-sm text-muted-foreground">
              {isTokenPriced ? "USD per 1M tokens" : "USD per unit shown"}
            </p>
          ) : null}
        </div>
        {detail.offerings.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No hosted provider offers this model in the dataset. The weights are available to run
            yourself.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Provider
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">
                    Model id
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    {isTokenPriced ? "Input" : "Price"}
                  </th>
                  {isTokenPriced ? (
                    <>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Output
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right font-medium sm:table-cell"
                      >
                        Cached input
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right font-medium lg:table-cell"
                      >
                        Context
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right font-medium lg:table-cell"
                      >
                        Speed
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {detail.offerings.map((offering, index) => (
                  <tr key={offering.provider.slug}>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={providerHref(offering.provider.slug)}
                          className="font-medium hover:underline"
                        >
                          {offering.provider.name}
                        </Link>
                        {index === 0 && detail.offerings.length > 1 ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 font-normal text-emerald-700 dark:text-emerald-300"
                          >
                            Lowest input price
                          </Badge>
                        ) : null}
                        {offering.quantization ? (
                          <Badge variant="outline" className="font-normal uppercase">
                            {offering.quantization}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {PROVIDER_KIND_LABELS[offering.provider.kind]}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                      {offering.providerModelId}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatUnitPrice(offering.pricing.input, offering.pricing.unit)}
                    </td>
                    {isTokenPriced ? (
                      <>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {formatPrice(offering.pricing.output)}
                        </td>
                        <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                          {formatPrice(offering.pricing.cachedInput)}
                        </td>
                        <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                          {formatTokens(offering.contextWindow ?? detail.contextWindow)}
                        </td>
                        <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                          {offering.throughputTps
                            ? `${Math.round(offering.throughputTps)} tok/s`
                            : "—"}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="benchmarks" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="benchmarks" className="text-xl font-semibold tracking-tight">
            Benchmarks
          </h2>
          <Link href="/benchmarks" className="text-sm text-muted-foreground hover:text-foreground">
            About the benchmarks
          </Link>
        </div>
        <ModelScores scores={detail.scores} />
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="related" className="text-xl font-semibold tracking-tight">
              More from {detail.lab.name}
            </h2>
            <Link
              href={labHref(detail.lab.slug)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              All {detail.lab.name} models
            </Link>
          </div>
          <ModelCardGrid models={related} />
        </section>
      ) : null}

      {detail.lab.website ? (
        <p className="text-sm text-muted-foreground">
          <a
            href={detail.lab.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            {detail.lab.name} website <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
        </p>
      ) : null}
    </PageContainer>
  );
}
