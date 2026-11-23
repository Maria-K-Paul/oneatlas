import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { CAPABILITY_ICONS, ModelCardGrid } from "@/modules/catalog";
import { getCatalogStats } from "@/modules/catalog/server";
import { Leaderboard, boardHref } from "@/modules/rankings";
import { getBoard } from "@/modules/rankings/server";
import { formatCount } from "@/platform/format";
import { PageContainer } from "@/platform/layout";
import { Button } from "@/platform/ui/button";

export default async function HomePage() {
  const [stats, overall, value] = await Promise.all([
    getCatalogStats(),
    getBoard("overall", 5),
    getBoard("value", 5),
  ]);

  const figures = [
    { label: "Models", value: stats.models, href: "/models" },
    { label: "Labs", value: stats.labs, href: "/labs" },
    { label: "Providers", value: stats.providers, href: "/providers" },
    { label: "Provider listings", value: stats.offerings, href: "/providers" },
    { label: "Open weights", value: stats.openWeights, href: "/models?openWeights=true" },
  ];

  return (
    <PageContainer className="space-y-16 py-12 sm:py-16">
      <section className="max-w-3xl space-y-6">
        <p className="text-sm font-medium text-muted-foreground">AI model discovery</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Find the right AI model, faster.
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          Compare specs, pricing, capabilities and benchmark results across labs and providers, all
          in one place.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/models">
              Browse models <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/rankings">See rankings</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/compare">Compare models</Link>
          </Button>
        </div>
      </section>

      <section aria-label="Catalog at a glance">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-5">
          {figures.map((f) => (
            <Link
              key={f.label}
              href={f.href}
              className="bg-background p-5 transition-colors hover:bg-muted/40"
            >
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatCount(f.value)}
              </dd>
            </Link>
          ))}
        </dl>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        {[overall, value].map((result) =>
          result ? (
            <div key={result.board.slug} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold tracking-tight">
                  {result.board.slug === "overall" ? "Top models" : "Best value"}
                </h2>
                <Link
                  href={boardHref(result.board.slug)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Full ranking
                </Link>
              </div>
              <Leaderboard
                rows={result.rows}
                metric={result.board.metric}
                kind={result.board.kind}
                compact
              />
            </div>
          ) : null,
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Newest releases</h2>
          <Link
            href="/rankings/newest"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            All releases
          </Link>
        </div>
        <ModelCardGrid models={stats.newest} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Capability coverage</h2>
          <p className="text-sm text-muted-foreground">
            Share of active text models that support each capability.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.capabilityCoverage.map((c) => {
            const Icon = CAPABILITY_ICONS[c.capability];
            return (
              <li key={c.capability}>
                <Link
                  href={`/models?capability=${c.capability}`}
                  className="group block space-y-1.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 group-hover:underline">
                      <Icon className="size-4 text-muted-foreground" aria-hidden /> {c.label}
                    </span>
                    <span className="font-medium tabular-nums">{Math.round(c.share * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${Math.round(c.share * 100)}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </PageContainer>
  );
}
