import Link from "next/link";
import type { ReactNode } from "react";
import {
  PriceSummary,
  StatusBadge,
  labHref,
  modelHref,
  type ModelSummary,
} from "@/modules/catalog";
import { cn } from "@/platform/ui/cn";
import type { BoardKind } from "../boards";
import type { RankingRow } from "../types";

const RANK_STYLES = [
  "text-amber-600 dark:text-amber-400",
  "text-zinc-500 dark:text-zinc-300",
  "text-orange-700 dark:text-orange-400",
];

/** A ranked table. Index boards get a bar (indexes are 0–100); others show the value as text. */
export function Leaderboard({
  rows,
  metric,
  kind,
  rowAction,
  compact = false,
}: {
  rows: RankingRow[];
  metric: string;
  kind: BoardKind;
  rowAction?: (model: ModelSummary) => ReactNode;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No models qualify for this board yet.
      </p>
    );
  }
  const showBar = kind === "overall" || kind === "category";

  return (
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
            <th
              scope="col"
              className={cn("px-3 py-2.5 font-medium", showBar ? "w-2/5" : "text-right")}
            >
              {metric}
            </th>
            {!compact ? (
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                Price
              </th>
            ) : null}
            {rowAction ? (
              <th scope="col" className="w-10 px-3">
                <span className="sr-only">Compare</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.model.id} className="hover:bg-muted/30">
              <td className={cn("px-4 py-3 font-semibold tabular-nums", RANK_STYLES[row.rank - 1])}>
                {row.rank}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Link href={modelHref(row.model.id)} className="font-medium hover:underline">
                    {row.model.name}
                  </Link>
                  <StatusBadge status={row.model.status} />
                </div>
                <Link
                  href={labHref(row.model.lab.slug)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {row.model.lab.name}
                </Link>
              </td>
              <td className={cn("px-3 py-3", !showBar && "text-right")}>
                {showBar ? (
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${Math.max(2, Math.min(100, row.value))}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-medium tabular-nums">{row.display}</span>
                  </div>
                ) : (
                  <span className="font-medium tabular-nums">{row.display}</span>
                )}
                {row.note && !compact ? (
                  <p className={cn("text-xs text-muted-foreground", showBar && "mt-0.5")}>
                    {row.note}
                  </p>
                ) : null}
              </td>
              {!compact ? (
                <td className="hidden px-3 py-3 text-right text-xs md:table-cell">
                  <PriceSummary pricing={row.model.pricing} />
                </td>
              ) : null}
              {rowAction ? <td className="px-3 py-3">{rowAction(row.model)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
