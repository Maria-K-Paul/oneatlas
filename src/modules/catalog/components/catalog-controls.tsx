"use client";

import { LayoutGridIcon, ListIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Button } from "@/platform/ui/button";
import { cn } from "@/platform/ui/cn";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/platform/ui/sheet";
import { MODEL_SORTS, type ModelSort } from "../schemas";
import type { CatalogFacets, Facet } from "../types";

/**
 * Filters live in the URL (docs D4). Every control here edits the query string and lets the
 * server re-render the results; a shared transition keeps the old results visible (dimmed)
 * until the new ones arrive, instead of flashing a spinner.
 */

type Navigate = (
  update: (params: URLSearchParams) => void,
  options?: { keepPage?: boolean },
) => void;

const CatalogNavigationContext = createContext<{ navigate: Navigate; isPending: boolean } | null>(
  null,
);

function useCatalogNavigation() {
  const context = useContext(CatalogNavigationContext);
  if (!context) throw new Error("Catalog controls must be rendered inside <CatalogNavigation>");
  return context;
}

export function CatalogNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback<Navigate>(
    (update, { keepPage = false } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      update(params);
      if (!keepPage) params.delete("page");
      const search = params.toString();
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <CatalogNavigationContext.Provider value={{ navigate, isPending }}>
      {children}
    </CatalogNavigationContext.Provider>
  );
}

/** Wraps the results so they dim while a filter change is loading. */
export function CatalogResults({ children }: { children: ReactNode }) {
  const { isPending } = useCatalogNavigation();
  return (
    <div aria-busy={isPending} className={cn("transition-opacity", isPending && "opacity-50")}>
      {children}
    </div>
  );
}

function listValues(params: URLSearchParams, key: string): string[] {
  return (params.get(key) ?? "").split(",").filter(Boolean);
}

function toggleListValue(params: URLSearchParams, key: string, value: string) {
  const values = new Set(listValues(params, key));
  if (values.has(value)) values.delete(value);
  else values.add(value);
  if (values.size) params.set(key, [...values].join(","));
  else params.delete(key);
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
  else params.delete(key);
}

// ───────────────────────── Filters ─────────────────────────

function SearchBox() {
  const searchParams = useSearchParams();
  const { navigate } = useCatalogNavigation();
  const current = searchParams.get("q") ?? "";
  const [value, setValue] = useState(current);
  const [synced, setSynced] = useState(current);

  // Keep the box in sync when the URL changes elsewhere (back button, "Clear all").
  if (current !== synced) {
    setSynced(current);
    setValue(current);
  }

  useEffect(() => {
    if (value.trim() === current) return;
    const timer = setTimeout(() => navigate((p) => setOrDelete(p, "q", value.trim())), 300);
    return () => clearTimeout(timer);
  }, [value, current, navigate]);

  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search models"
        aria-label="Search models"
        maxLength={100}
        className="h-9 w-full rounded-md border bg-background pr-3 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function CheckboxGroup({
  title,
  param,
  facets,
  collapsedCount,
}: {
  title: string;
  param: string;
  facets: Facet[];
  collapsedCount?: number;
}) {
  const searchParams = useSearchParams();
  const { navigate } = useCatalogNavigation();
  const selected = new Set(listValues(searchParams, param));
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  const visible =
    collapsedCount && !expanded
      ? facets.filter((f, i) => i < collapsedCount || selected.has(f.value))
      : facets;

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {visible.map((facet) => {
        const inputId = `${id}-${facet.value}`;
        return (
          <div key={facet.value} className="flex items-center gap-2 text-sm">
            <input
              id={inputId}
              type="checkbox"
              checked={selected.has(facet.value)}
              onChange={() => navigate((p) => toggleListValue(p, param, facet.value))}
              disabled={facet.count === 0 && !selected.has(facet.value)}
              className="size-4 accent-primary"
            />
            <label
              htmlFor={inputId}
              className={cn("flex-1 cursor-pointer", facet.count === 0 && "text-muted-foreground")}
            >
              {facet.label}
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">{facet.count}</span>
          </div>
        );
      })}
      {collapsedCount && facets.length > collapsedCount ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show fewer" : `Show all ${facets.length}`}
        </button>
      ) : null}
    </fieldset>
  );
}

function SelectFilter({
  label,
  param,
  options,
}: {
  label: string;
  param: string;
  options: { value: string; label: string }[];
}) {
  const searchParams = useSearchParams();
  const { navigate } = useCatalogNavigation();
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </label>
      <select
        id={id}
        value={searchParams.get(param) ?? ""}
        onChange={(e) => navigate((p) => setOrDelete(p, param, e.target.value))}
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleFilter({ label, param }: { label: string; param: string }) {
  const searchParams = useSearchParams();
  const { navigate } = useCatalogNavigation();
  const id = useId();
  const checked = searchParams.get(param) === "true";
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={() => navigate((p) => setOrDelete(p, param, checked ? undefined : "true"))}
        className="size-4 accent-primary"
      />
      <label htmlFor={id} className="cursor-pointer">
        {label}
      </label>
    </div>
  );
}

const CONTEXT_OPTIONS = [
  { value: "", label: "Any length" },
  { value: "32000", label: "32K+ tokens" },
  { value: "128000", label: "128K+ tokens" },
  { value: "200000", label: "200K+ tokens" },
  { value: "1000000", label: "1M+ tokens" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "0", label: "Free" },
  { value: "0.5", label: "Up to $0.50 / 1M" },
  { value: "1", label: "Up to $1 / 1M" },
  { value: "5", label: "Up to $5 / 1M" },
  { value: "10", label: "Up to $10 / 1M" },
];

const FILTER_PARAMS = [
  "q",
  "type",
  "capability",
  "input",
  "lab",
  "provider",
  "openWeights",
  "minContext",
  "maxPrice",
  "includeDeprecated",
];

function FilterFields({ facets }: { facets: CatalogFacets }) {
  const searchParams = useSearchParams();
  const { navigate } = useCatalogNavigation();
  const active = FILTER_PARAMS.some((key) => searchParams.has(key));

  return (
    <div className="space-y-6">
      <SearchBox />
      <div className="space-y-2">
        <ToggleFilter label="Open weights only" param="openWeights" />
        <ToggleFilter label="Include deprecated" param="includeDeprecated" />
      </div>
      <CheckboxGroup title="Type" param="type" facets={facets.types} />
      <CheckboxGroup title="Capabilities" param="capability" facets={facets.capabilities} />
      <CheckboxGroup title="Accepts" param="input" facets={facets.inputModalities} />
      <SelectFilter label="Context window" param="minContext" options={CONTEXT_OPTIONS} />
      <SelectFilter label="Blended price" param="maxPrice" options={PRICE_OPTIONS} />
      <CheckboxGroup title="Lab" param="lab" facets={facets.labs} collapsedCount={8} />
      <CheckboxGroup
        title="Provider"
        param="provider"
        facets={facets.providers}
        collapsedCount={8}
      />
      {active ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate((p) => FILTER_PARAMS.forEach((key) => p.delete(key)))}
        >
          <XIcon aria-hidden /> Clear all filters
        </Button>
      ) : null}
    </div>
  );
}

/** Sidebar on large screens, a slide-over sheet on small ones. */
export function CatalogFilters({ facets }: { facets: CatalogFacets }) {
  return (
    <>
      <aside aria-label="Filters" className="hidden lg:block">
        <FilterFields facets={facets} />
      </aside>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontalIcon aria-hidden /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <FilterFields facets={facets} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ───────────────────────── Toolbar ─────────────────────────

export function SortSelect({ sort }: { sort: ModelSort }) {
  const { navigate } = useCatalogNavigation();
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted-foreground">
        Sort
      </label>
      <select
        id={id}
        value={sort}
        onChange={(e) =>
          navigate((p) => {
            p.delete("order");
            setOrDelete(p, "sort", e.target.value === "releaseDate" ? undefined : e.target.value);
          })
        }
        className="h-8 rounded-md border bg-background px-2 text-sm"
      >
        {Object.entries(MODEL_SORTS).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ViewToggle({ view }: { view: "table" | "cards" }) {
  const { navigate } = useCatalogNavigation();
  const option = (value: "table" | "cards", label: string, Icon: typeof ListIcon) => (
    <button
      type="button"
      aria-pressed={view === value}
      aria-label={label}
      title={label}
      onClick={() =>
        navigate((p) => setOrDelete(p, "view", value === "cards" ? "cards" : undefined), {
          keepPage: true,
        })
      }
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
        view === value && "bg-accent text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
  return (
    <div className="hidden items-center gap-0.5 rounded-lg border p-0.5 md:flex">
      {option("table", "Table view", ListIcon)}
      {option("cards", "Card view", LayoutGridIcon)}
    </div>
  );
}
