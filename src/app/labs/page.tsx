import type { Metadata } from "next";
import Link from "next/link";
import { modelHref } from "@/modules/catalog";
import { LAB_KIND_LABELS } from "@/modules/labs";
import { listLabs } from "@/modules/labs/server";
import { formatDate } from "@/platform/format";
import { PageContainer, PageHeader } from "@/platform/layout";
import { Badge } from "@/platform/ui/badge";

export const metadata: Metadata = {
  title: "AI labs",
  description: "The companies and research groups behind every model in the catalog.",
};

export default async function LabsPage() {
  const labs = await listLabs();
  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Labs"
        description="The companies, institutes and communities that build the models in the catalog."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((lab) => (
          <article
            key={lab.slug}
            className="relative flex flex-col rounded-xl border p-5 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">
                <Link
                  href={`/labs/${lab.slug}`}
                  className="after:absolute after:inset-0 hover:underline"
                >
                  {lab.name}
                </Link>
              </h2>
              <Badge variant="outline" className="font-normal">
                {LAB_KIND_LABELS[lab.kind]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {[lab.headquarters, lab.foundedYear ? `founded ${lab.foundedYear}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {lab.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lab.description}</p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Models</dt>
                <dd className="font-medium tabular-nums">{lab.modelCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Open weights</dt>
                <dd className="font-medium tabular-nums">{lab.openWeightsCount}</dd>
              </div>
            </dl>
            {lab.latestRelease ? (
              <p className="relative z-10 mt-3 text-xs text-muted-foreground">
                Latest:{" "}
                <Link
                  href={modelHref(lab.latestRelease.id)}
                  className="text-foreground hover:underline"
                >
                  {lab.latestRelease.name}
                </Link>
                {lab.latestRelease.releaseDate
                  ? ` · ${formatDate(lab.latestRelease.releaseDate)}`
                  : null}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
