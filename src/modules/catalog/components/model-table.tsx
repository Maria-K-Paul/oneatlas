import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, formatTokens } from "@/platform/format";
import { cn } from "@/platform/ui/cn";
import type { ModelSort } from "../schemas";
import type { ModelSummary } from "../types";
import { labHref, modelHref } from "../url";
import { CapabilityIcons, OpenWeightsBadge, StatusBadge } from "./badges";
import { formatUnitPrice } from "./price";

export type SortState = {
  sort: ModelSort;
  order: "asc" | "desc";
  href: (sort: ModelSort) => string;
};

type Column = {
  key: string;
  label: string;
  sort?: ModelSort;
  align?: "right";
  className?: string;
  cell: (model: ModelSummary) => ReactNode;
};

const COLUMNS: Column[] = [
  {
    key: "context",
    label: "Context",
    sort: "contextWindow",
    align: "right",
    cell: (m) => formatTokens(m.contextWindow),
  },
  {
    key: "output",
    label: "Max output",
    align: "right",
    className: "hidden xl:table-cell",
    cell: (m) => formatTokens(m.maxOutputTokens),
  },
  {
    key: "input-price",
    label: "Input $/1M",
    sort: "inputPrice",
    align: "right",
    cell: (m) => formatUnitPrice(m.pricing?.input ?? null, m.pricing?.unit),
  },
  {
    key: "output-price",
    label: "Output $/1M",
    sort: "outputPrice",
    align: "right",
    cell: (m) =>
      m.pricing?.unit === "per_million_tokens"
        ? formatUnitPrice(m.pricing.output, m.pricing.unit)
        : "—",
  },
  {
    key: "providers",
    label: "Providers",
    sort: "providerCount",
    align: "right",
    className: "hidden lg:table-cell",
    cell: (m) => m.providerCount || "—",
  },
  {
    key: "capabilities",
    label: "Capabilities",
    className: "hidden lg:table-cell",
    cell: (m) => <CapabilityIcons capabilities={m.capabilities} />,
  },
  {
    key: "released",
    label: "Released",
    sort: "releaseDate",
    align: "right",
    className: "hidden sm:table-cell",
    cell: (m) => formatDate(m.releaseDate),
  },
];

function SortHeader({ column, sort }: { column: Column; sort?: SortState }) {
  if (!column.sort || !sort) return <>{column.label}</>;
  const active = sort.sort === column.sort;
  const Icon = !active ? ArrowUpDownIcon : sort.order === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Link
      href={sort.href(column.sort)}
      scroll={false}
      className={cn(
        "inline-flex items-center gap-1 rounded hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {column.label}
      <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
    </Link>
  );
}

/**
 * The catalog table. Sorting is plain links (no client JavaScript); `rowAction` is a slot so the
 * page can add a compare toggle without this module depending on the compare module.
 */
export function ModelTable({
  models,
  sort,
  rowAction,
  showLab = true,
  className,
}: {
  models: ModelSummary[];
  sort?: SortState;
  rowAction?: (model: ModelSummary) => ReactNode;
  showLab?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border", className)}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium" aria-sort={ariaSort("name", sort)}>
              <SortHeader
                column={{ key: "name", label: "Model", sort: "name", cell: () => null }}
                sort={sort}
              />
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.sort ? ariaSort(column.sort, sort) : undefined}
                className={cn(
                  "px-3 py-2.5 font-medium whitespace-nowrap",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                <SortHeader column={column} sort={sort} />
              </th>
            ))}
            {rowAction ? (
              <th scope="col" className="w-10 px-3">
                <span className="sr-only">Compare</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {models.map((model) => (
            <tr key={model.id} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={modelHref(model.id)} className="font-medium hover:underline">
                    {model.name}
                  </Link>
                  <StatusBadge status={model.status} />
                  <OpenWeightsBadge openWeights={model.openWeights} />
                </div>
                {showLab ? (
                  <Link
                    href={labHref(model.lab.slug)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {model.lab.name}
                  </Link>
                ) : null}
              </td>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-3 py-3 whitespace-nowrap tabular-nums",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.cell(model)}
                </td>
              ))}
              {rowAction ? <td className="px-3 py-3">{rowAction(model)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ariaSort(
  column: ModelSort,
  sort?: SortState,
): "ascending" | "descending" | "none" | undefined {
  if (!sort) return undefined;
  if (sort.sort !== column) return "none";
  return sort.order === "asc" ? "ascending" : "descending";
}
