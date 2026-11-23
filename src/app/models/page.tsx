import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CatalogFilters,
  CatalogNavigation,
  CatalogResults,
  MODEL_SORTS,
  ModelCardGrid,
  ModelTable,
  Pagination,
  SortSelect,
  ViewToggle,
  catalogHref,
  sortHref,
  type ModelSummary,
} from "@/modules/catalog";
import { getFacets, listModels, parseModelListQuery } from "@/modules/catalog/server";
import { CompareToggle } from "@/modules/compare";
import { formatCount } from "@/platform/format";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Button } from "@/platform/ui/button";
import { Skeleton } from "@/platform/ui/skeleton";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Browse and filter AI models by lab, provider, capability, context window and price.",
};

export default function ModelsPage({ searchParams }: PageProps<"/models">) {
  return (
    <PageContainer>
      <PageHeader
        title="Models"
        description="Every model in the catalog. Filter to what you need, sort any column, and open a model for its full record."
      />
      {/* Filters come from the URL, which is only known at request time: stream the results. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/models">["searchParams"] }) {
  const raw = await searchParams;
  const parsed = parseModelListQuery(raw);
  if (!parsed.success) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium">Some filters in this link aren’t valid</p>
        <ul className="mt-2 text-sm text-muted-foreground">
          {parsed.error.issues.map((issue) => (
            <li key={issue.path.join(".")}>
              <code>{issue.path.join(".")}</code>: {issue.message}
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/models">Reset filters</Link>
        </Button>
      </div>
    );
  }

  const query = parsed.data;
  const view = raw.view === "cards" ? "cards" : "table";
  const withView = (href: string) =>
    view === "cards" ? `${href}${href.includes("?") ? "&" : "?"}view=cards` : href;
  const [{ data, meta }, facets] = await Promise.all([listModels(query), getFacets()]);
  const compare = (model: ModelSummary) => <CompareToggle id={model.id} name={model.name} />;

  return (
    <CatalogNavigation>
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <CatalogFilters facets={facets} />
        <CatalogResults>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground">{formatCount(meta.total)}</span>{" "}
              {meta.total === 1 ? "model" : "models"}
            </p>
            <div className="flex items-center gap-2">
              <SortSelect sort={query.sort} />
              <ViewToggle view={view} />
            </div>
          </div>

          {data.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No models match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try removing a filter or widening the price range.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/models">Clear all filters</Link>
              </Button>
            </div>
          ) : view === "cards" ? (
            <ModelCardGrid models={data} action={compare} />
          ) : (
            <>
              <ModelTable
                className="hidden md:block"
                models={data}
                rowAction={compare}
                sort={{
                  sort: query.sort,
                  order: query.order ?? MODEL_SORTS[query.sort].defaultOrder,
                  href: (sort) => withView(sortHref(query, sort)),
                }}
              />
              <ModelCardGrid className="md:hidden" models={data} action={compare} />
            </>
          )}

          <Pagination meta={meta} href={(page) => withView(catalogHref(query, { page }))} />
        </CatalogResults>
      </div>
    </CatalogNavigation>
  );
}

function CatalogSkeleton() {
  return (
    <div
      className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]"
      aria-busy
      aria-label="Loading models"
    >
      <div className="hidden space-y-4 lg:block">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
