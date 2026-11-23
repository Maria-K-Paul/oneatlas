"use client";

import {
  BarChart3Icon,
  Building2Icon,
  ColumnsIcon,
  FlaskConicalIcon,
  LayersIcon,
  Loader2Icon,
  SearchIcon,
  ServerIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MODEL_TYPE_LABELS,
  PROVIDER_KIND_LABELS,
  labHref,
  modelHref,
  providerHref,
} from "@/modules/catalog";
import { Button } from "@/platform/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/platform/ui/command";
import { useSearch } from "./use-search";

const PAGES = [
  { href: "/models", label: "Browse all models", icon: LayersIcon },
  { href: "/rankings", label: "Rankings", icon: BarChart3Icon },
  { href: "/benchmarks", label: "Benchmarks", icon: FlaskConicalIcon },
  { href: "/compare", label: "Compare models", icon: ColumnsIcon },
  { href: "/labs", label: "AI labs", icon: Building2Icon },
  { href: "/providers", label: "Providers", icon: ServerIcon },
];

/** Global search: ⌘K / Ctrl+K (or "/") from anywhere. Keyboard navigation comes from cmdk. */
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, error } = useSearch(query);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (
        (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results && (results.models.length || results.labs.length || results.providers.length);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 gap-2 text-muted-foreground sm:w-56 sm:justify-start"
        aria-label="Search models, labs and providers"
      >
        <SearchIcon aria-hidden />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search OneAtlas"
        description="Search models, labs and providers"
      >
        {/* Results are already ranked by the server, so cmdk's own filtering is turned off. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search models, labs, providers…"
          />
          <CommandList className="max-h-[60vh]">
            {loading && !results ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" aria-hidden /> Searching…
              </div>
            ) : null}
            {error ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Search is unavailable right now.
              </p>
            ) : null}
            {query.trim() && results && !hasResults && !loading ? (
              <CommandEmpty>No matches for “{query.trim()}”.</CommandEmpty>
            ) : null}

            {!query.trim() ? (
              <CommandGroup heading="Go to">
                {PAGES.map(({ href, label, icon: Icon }) => (
                  <CommandItem key={href} value={href} onSelect={() => go(href)}>
                    <Icon aria-hidden /> {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {results?.models.length ? (
              <CommandGroup heading="Models">
                {results.models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`model:${model.id}`}
                    onSelect={() => go(modelHref(model.id))}
                  >
                    <LayersIcon aria-hidden />
                    <span className="flex-1 truncate">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.lab.name} · {MODEL_TYPE_LABELS[model.type]}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results?.labs.length ? (
              <CommandGroup heading="Labs">
                {results.labs.map((lab) => (
                  <CommandItem
                    key={lab.slug}
                    value={`lab:${lab.slug}`}
                    onSelect={() => go(labHref(lab.slug))}
                  >
                    <Building2Icon aria-hidden />
                    <span className="flex-1">{lab.name}</span>
                    <span className="text-xs text-muted-foreground">{lab.modelCount} models</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results?.providers.length ? (
              <CommandGroup heading="Providers">
                {results.providers.map((provider) => (
                  <CommandItem
                    key={provider.slug}
                    value={`provider:${provider.slug}`}
                    onSelect={() => go(providerHref(provider.slug))}
                  >
                    <ServerIcon aria-hidden />
                    <span className="flex-1">{provider.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {PROVIDER_KIND_LABELS[provider.kind]}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
