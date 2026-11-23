"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { MODEL_TYPE_LABELS } from "@/modules/catalog";
import { useSearch } from "@/modules/search";
import { formatPrice } from "@/platform/format";
import { cn } from "@/platform/ui/cn";
import { useCompareStore, type CompareItem } from "../store";
import { compareHref, MAX_COMPARE } from "../constants";

/** Keeps the floating tray in step with what this page is comparing. */
export function CompareSync({ items }: { items: CompareItem[] }) {
  const replace = useCompareStore((s) => s.replace);
  const key = items.map((i) => i.id).join(",");
  useEffect(() => {
    void useCompareStore.persist.rehydrate();
    replace(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the item list
  }, [key, replace]);
  return null;
}

/** Search box that adds a model to the comparison URL. */
export function ModelPicker({ currentIds }: { currentIds: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, loading } = useSearch(query);
  const id = useId();
  const full = currentIds.length >= MAX_COMPARE;
  const options = (results?.models ?? []).filter((m) => !currentIds.includes(m.id)).slice(0, 6);

  if (full) {
    return (
      <p className="text-sm text-muted-foreground">
        Comparing the maximum of {MAX_COMPARE} models. Remove one to add another.
      </p>
    );
  }

  return (
    <div className="relative max-w-md">
      <label htmlFor={id} className="sr-only">
        Add a model to compare
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Add a model, e.g. “claude” or “llama”"
        autoComplete="off"
        className="h-10 w-full rounded-md border bg-background pr-3 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {query.trim() ? (
        <ul
          role="listbox"
          aria-label="Matching models"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {loading ? "Searching…" : "No matching models"}
            </li>
          ) : (
            options.map((model) => (
              <li key={model.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    router.push(compareHref([...currentIds, model.id]), { scroll: false });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <PlusIcon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1 truncate">{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.lab.name} · {MODEL_TYPE_LABELS[model.type]}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

type CalculatorModel = { id: string; name: string; input: number | null; output: number | null };

/**
 * "What would this workload cost?" Monthly tokens in and out, priced at each model's cheapest
 * provider. Only token-priced models can be estimated.
 */
export function CostCalculator({ models }: { models: CalculatorModel[] }) {
  const [inputM, setInputM] = useState(10);
  const [outputM, setOutputM] = useState(2);
  const ids = useId();
  const costs = models.map((m) => ({
    ...m,
    cost: m.input === null ? null : m.input * inputM + (m.output ?? 0) * outputM,
  }));
  const priced = costs.filter((c) => c.cost !== null).map((c) => c.cost!);
  const cheapest = priced.length ? Math.min(...priced) : null;

  return (
    <section aria-labelledby={`${ids}-title`} className="space-y-4 rounded-xl border p-5">
      <div>
        <h2 id={`${ids}-title`} className="text-lg font-semibold tracking-tight">
          Cost calculator
        </h2>
        <p className="text-sm text-muted-foreground">
          Monthly cost at each model&apos;s cheapest provider.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: "in", label: "Input tokens per month (millions)", value: inputM, set: setInputM },
          {
            key: "out",
            label: "Output tokens per month (millions)",
            value: outputM,
            set: setOutputM,
          },
        ].map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={`${ids}-${field.key}`} className="text-sm font-medium">
              {field.label}
            </label>
            <input
              id={`${ids}-${field.key}`}
              type="number"
              min={0}
              step={0.5}
              value={field.value}
              onChange={(e) => field.set(Math.max(0, Number(e.target.value) || 0))}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm tabular-nums"
            />
          </div>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        {costs.map((c) => (
          <li
            key={c.id}
            className={cn(
              "rounded-lg border p-3",
              c.cost !== null &&
                c.cost === cheapest &&
                priced.length > 1 &&
                "border-emerald-500/50 bg-emerald-500/5",
            )}
          >
            <p className="truncate text-sm text-muted-foreground">{c.name}</p>
            <p className="text-xl font-semibold tabular-nums">
              {c.cost === null
                ? "—"
                : c.cost === 0
                  ? "Free"
                  : formatPrice(Number(c.cost.toFixed(2)))}
            </p>
            {c.cost !== null && c.cost === cheapest && priced.length > 1 ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Lowest cost</p>
            ) : c.cost === null ? (
              <p className="text-xs text-muted-foreground">Not token-priced</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
