import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ModelCardGrid,
  ModelTable,
  PROVIDER_KIND_LABELS,
  providerHref,
  type ModelSummary,
} from "@/modules/catalog";
import { CompareToggle } from "@/modules/compare";
import { LAB_KIND_LABELS } from "@/modules/labs";
import { getLab, listLabSlugs } from "@/modules/labs/server";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";

export async function generateStaticParams() {
  return listLabSlugs();
}

export async function generateMetadata({ params }: PageProps<"/labs/[slug]">): Promise<Metadata> {
  const lab = await getLab((await params).slug);
  return lab
    ? { title: `${lab.name} models`, description: lab.description ?? undefined }
    : { title: "Lab not found" };
}

export default async function LabPage({ params }: PageProps<"/labs/[slug]">) {
  const lab = await getLab((await params).slug);
  if (!lab) notFound();
  const compare = (model: ModelSummary) => <CompareToggle id={model.id} name={model.name} />;

  return (
    <PageContainer className="space-y-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/labs" className="hover:text-foreground">
          Labs
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground" aria-current="page">
          {lab.name}
        </span>
      </nav>
      <PageHeader
        title={lab.name}
        description={lab.description}
        actions={
          lab.website ? (
            <a
              href={lab.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Website <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary" className="font-normal">
          {LAB_KIND_LABELS[lab.kind]}
        </Badge>
        {lab.headquarters ? (
          <Badge variant="outline" className="font-normal">
            {lab.headquarters}
          </Badge>
        ) : null}
        {lab.foundedYear ? (
          <Badge variant="outline" className="font-normal">
            Founded {lab.foundedYear}
          </Badge>
        ) : null}
        <Badge variant="outline" className="font-normal">
          {lab.modelCount} active models
        </Badge>
        <Badge variant="outline" className="font-normal">
          {lab.openWeightsCount} open weights
        </Badge>
        {lab.firstPartyApi ? (
          <Link href={providerHref(lab.firstPartyApi.slug)}>
            <Badge variant="outline" className="font-normal hover:bg-accent">
              API: {lab.firstPartyApi.name}
            </Badge>
          </Link>
        ) : null}
      </div>

      <section aria-labelledby="models" className="space-y-3">
        <h2 id="models" className="text-xl font-semibold tracking-tight">
          Models
        </h2>
        <ModelTable
          className="hidden md:block"
          models={lab.models}
          showLab={false}
          rowAction={compare}
        />
        <ModelCardGrid className="md:hidden" models={lab.models} action={compare} />
      </section>

      {lab.providers.length > 0 ? (
        <section aria-labelledby="providers" className="space-y-3">
          <h2 id="providers" className="text-xl font-semibold tracking-tight">
            Where to run {lab.name} models
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lab.providers.map((provider) => (
              <li key={provider.slug}>
                <Link
                  href={providerHref(provider.slug)}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/30"
                >
                  <span>
                    <span className="font-medium">{provider.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {PROVIDER_KIND_LABELS[provider.kind]}
                    </span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {provider.modelCount} {provider.modelCount === 1 ? "model" : "models"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageContainer>
  );
}
