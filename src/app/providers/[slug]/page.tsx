import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDER_KIND_LABELS, formatUnitPrice, labHref, modelHref } from "@/modules/catalog";
import { CompareToggle } from "@/modules/compare";
import { getProvider, listProviderSlugs } from "@/modules/providers/server";
import { formatPrice, formatTokens } from "@/platform/format";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";

export async function generateStaticParams() {
  return listProviderSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/providers/[slug]">): Promise<Metadata> {
  const provider = await getProvider((await params).slug);
  return provider
    ? {
        title: `${provider.name} models and pricing`,
        description: provider.description ?? undefined,
      }
    : { title: "Provider not found" };
}

export default async function ProviderPage({ params }: PageProps<"/providers/[slug]">) {
  const provider = await getProvider((await params).slug);
  if (!provider) notFound();

  return (
    <PageContainer className="space-y-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/providers" className="hover:text-foreground">
          Providers
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground" aria-current="page">
          {provider.name}
        </span>
      </nav>
      <PageHeader
        title={provider.name}
        description={provider.description}
        actions={
          <div className="flex gap-3 text-sm">
            {provider.docsUrl ? (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Docs <ExternalLinkIcon className="size-3.5" aria-hidden />
              </a>
            ) : null}
            {provider.website ? (
              <a
                href={provider.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                Website <ExternalLinkIcon className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary" className="font-normal">
          {PROVIDER_KIND_LABELS[provider.kind]}
        </Badge>
        {provider.lab ? (
          <Link href={labHref(provider.lab.slug)}>
            <Badge variant="outline" className="font-normal hover:bg-accent">
              Run by {provider.lab.name}
            </Badge>
          </Link>
        ) : null}
        <Badge variant="outline" className="font-normal">
          {provider.modelCount} models
        </Badge>
        <Badge variant="outline" className="font-normal">
          {provider.labCount} labs
        </Badge>
      </div>

      {provider.offerings.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          This provider has no models in the dataset.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Model
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
                  Model id
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Input
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Output
                </th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                  Context
                </th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                  Speed
                </th>
                <th scope="col" className="w-10 px-3">
                  <span className="sr-only">Compare</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {provider.offerings.map((o) => (
                <tr key={o.model.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={modelHref(o.model.id)} className="font-medium hover:underline">
                        {o.model.name}
                      </Link>
                      {o.cheapest ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 font-normal text-emerald-700 dark:text-emerald-300"
                        >
                          Lowest price
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{o.model.lab.name}</span>
                  </td>
                  <td className="hidden px-3 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                    {o.providerModelId}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatUnitPrice(o.pricing.input, o.pricing.unit)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {o.pricing.unit === "per_million_tokens" ? formatPrice(o.pricing.output) : "—"}
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                    {formatTokens(o.contextWindow)}
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
                    {o.throughputTps ? `${Math.round(o.throughputTps)} tok/s` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <CompareToggle id={o.model.id} name={o.model.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Token prices in USD per 1M tokens. Illustrative sample data.
      </p>
    </PageContainer>
  );
}
