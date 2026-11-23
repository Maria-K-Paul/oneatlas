"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/platform/ui/button";
import { cn } from "@/platform/ui/cn";
import { useCompareStore } from "../store";
import { MAX_COMPARE } from "../constants";

/** Adds a model to (or removes it from) the compare tray. */
export function CompareToggle({
  id,
  name,
  variant = "icon",
}: {
  id: string;
  name: string;
  variant?: "icon" | "button";
}) {
  const selected = useCompareStore((s) => s.items.some((i) => i.id === id));
  const full = useCompareStore((s) => s.items.length >= MAX_COMPARE);
  const toggle = useCompareStore((s) => s.toggle);
  const disabled = full && !selected;
  const label = selected
    ? `Remove ${name} from comparison`
    : disabled
      ? `Comparison is full (${MAX_COMPARE} models)`
      : `Add ${name} to comparison`;

  if (variant === "button") {
    return (
      <Button
        variant={selected ? "secondary" : "outline"}
        onClick={() => toggle({ id, name })}
        disabled={disabled}
        aria-pressed={selected}
        title={label}
      >
        {selected ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
        {selected ? "Added to compare" : "Compare"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle({ id, name })}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        selected &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
      )}
    >
      {selected ? (
        <CheckIcon className="size-3.5" aria-hidden />
      ) : (
        <PlusIcon className="size-3.5" aria-hidden />
      )}
    </button>
  );
}
