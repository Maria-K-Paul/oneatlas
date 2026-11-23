"use client";

import { ColumnsIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/platform/ui/button";
import { useCompareStore } from "../store";
import { compareHref, MAX_COMPARE } from "../constants";

/** Floating bar showing the current selection on every page except /compare itself. */
export function CompareTray() {
  const pathname = usePathname();
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  useEffect(() => {
    void useCompareStore.persist.rehydrate();
  }, []);

  if (items.length === 0 || pathname.startsWith("/compare")) return null;

  return (
    <div
      role="region"
      aria-label="Models selected for comparison"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2.5 shadow-lg backdrop-blur sm:inset-x-6"
    >
      <span className="px-1 text-sm font-medium">
        Compare{" "}
        <span className="text-muted-foreground">
          {items.length}/{MAX_COMPARE}
        </span>
      </span>
      <ul className="flex flex-1 flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
          >
            {item.name}
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.name}`}
              className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <XIcon className="size-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button asChild size="sm" disabled={items.length < 2}>
          <Link href={compareHref(items.map((i) => i.id))} aria-disabled={items.length < 2}>
            <ColumnsIcon aria-hidden /> {items.length < 2 ? "Add one more" : "Compare"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
