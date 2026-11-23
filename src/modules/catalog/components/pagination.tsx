import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { PaginationMeta } from "@/platform/validation";
import { cn } from "@/platform/ui/cn";

/** 1 … 4 5 [6] 7 8 … 12 */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? (["gap", p] as const) : [p]));
}

export function Pagination({
  meta,
  href,
}: {
  meta: PaginationMeta;
  href: (page: number) => string;
}) {
  if (meta.totalPages <= 1) return null;
  const linkClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm hover:bg-accent";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Page {meta.page} of {meta.totalPages}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          {meta.page > 1 ? (
            <Link
              href={href(meta.page - 1)}
              className={linkClass}
              aria-label="Previous page"
              scroll={false}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Link>
          ) : null}
        </li>
        {pageWindow(meta.page, meta.totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                scroll={false}
                aria-current={p === meta.page ? "page" : undefined}
                className={cn(linkClass, p === meta.page && "bg-accent font-medium")}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        <li>
          {meta.page < meta.totalPages ? (
            <Link
              href={href(meta.page + 1)}
              className={linkClass}
              aria-label="Next page"
              scroll={false}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
