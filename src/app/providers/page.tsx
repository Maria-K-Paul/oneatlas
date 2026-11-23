import type { Metadata } from "next";
import Link from "next/link";
import { PROVIDER_KIND_LABELS, type PublicProviderKind } from "@/modules/catalog";
import type { ProviderSummary } from "@/modules/providers";
import { listProviders } from "@/modules/providers/server";
import { PageContainer, PageHeader } from "@/platform/layout";

export const metadata: Metadata = {
  title: "Providers",
  description:
    "Where you can run each model: first-party APIs, cloud platforms, inference hosts and aggregators.",
};

const KIND_ORDER: PublicProviderKind[] = [
  "first_party",
  "cloud",
  "inference_platform",
  "aggregator",
];
const KIND_DESCRIPTIONS: Record<PublicProviderKind, string> = {
  first_party: "A lab's own API for its own models.",
  cloud: "Hyperscaler platforms that host models from many labs.",
  inference_platform: "Specialist hosts, mostly for open-weights models, often faster or cheaper.",
  aggregator: "One API in front of many providers.",
};

export default async function ProvidersPage() {
  const providers = await listProviders();
  const byKind = new Map<PublicProviderKind, ProviderSummary[]>();
  for (const p of providers) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p]);

  return (
    <PageContainer className="space-y-10">
      <PageHeader
        title="Providers"
        description="Where you can run each model, and what it costs there."
      />
      {KIND_ORDER.filter((kind) => byKind.has(kind)).map((kind) => (
        <section key={kind} aria-labelledby={`kind-${kind}`} className="space-y-3">
          <div>
            <h2 id={`kind-${kind}`} className="text-lg font-semibold tracking-tight">
              {PROVIDER_KIND_LABELS[kind]}s
            </h2>
            <p className="text-sm text-muted-foreground">{KIND_DESCRIPTIONS[kind]}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byKind.get(kind)!.map((provider) => (
              <Link
                key={provider.slug}
                href={`/providers/${provider.slug}`}
                className="flex flex-col rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <span className="font-medium">{provider.name}</span>
                {provider.description ? (
                  <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {provider.description}
                  </span>
                ) : null}
                <span className="mt-3 text-xs text-muted-foreground tabular-nums">
                  {provider.modelCount} models · {provider.labCount}{" "}
                  {provider.labCount === 1 ? "lab" : "labs"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </PageContainer>
  );
}
