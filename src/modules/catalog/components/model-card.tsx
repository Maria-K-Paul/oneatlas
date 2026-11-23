import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, formatTokens } from "@/platform/format";
import { cn } from "@/platform/ui/cn";
import { MODEL_TYPE_LABELS } from "../labels";
import type { ModelSummary } from "../types";
import { modelHref } from "../url";
import { CapabilityIcons, OpenWeightsBadge, StatusBadge } from "./badges";
import { PriceSummary } from "./price";

export function ModelCard({ model, action }: { model: ModelSummary; action?: ReactNode }) {
  return (
    <article className="relative flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">
            <Link
              href={modelHref(model.id)}
              className="after:absolute after:inset-0 hover:underline"
            >
              {model.name}
            </Link>
          </h3>
          <p className="text-xs text-muted-foreground">
            {model.lab.name} · {MODEL_TYPE_LABELS[model.type]}
          </p>
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={model.status} />
        <OpenWeightsBadge openWeights={model.openWeights} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Context</dt>
        <dd className="text-right tabular-nums">{formatTokens(model.contextWindow)}</dd>
        <dt className="text-muted-foreground">Price</dt>
        <dd className="text-right text-xs">
          <PriceSummary pricing={model.pricing} />
        </dd>
        <dt className="text-muted-foreground">Released</dt>
        <dd className="text-right tabular-nums">{formatDate(model.releaseDate)}</dd>
      </dl>
      <CapabilityIcons capabilities={model.capabilities} className="mt-auto" />
    </article>
  );
}

export function ModelCardGrid({
  models,
  action,
  className,
}: {
  models: ModelSummary[];
  action?: (model: ModelSummary) => ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {models.map((model) => (
        <ModelCard key={model.id} model={model} action={action?.(model)} />
      ))}
    </div>
  );
}
