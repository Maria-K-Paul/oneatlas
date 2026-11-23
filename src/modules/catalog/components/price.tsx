import { formatPrice, pricingUnitSuffix } from "@/platform/format";
import { cn } from "@/platform/ui/cn";
import type { ModelPricing, PublicPricingUnit } from "../types";

/** "$2.50" for token prices (the column says per 1M), "$0.04 / image" for anything else. */
export function formatUnitPrice(value: number | null, unit: PublicPricingUnit | undefined): string {
  if (value === null || !unit) return "—";
  const price = formatPrice(value);
  if (unit === "per_million_tokens" || price === "Free") return price;
  return `${price} ${pricingUnitSuffix(unit)}`;
}

/** Headline price for a model: blended per 1M tokens, or the unit price for non-token models. */
export function PriceSummary({
  pricing,
  className,
}: {
  pricing: ModelPricing | null;
  className?: string;
}) {
  if (!pricing)
    return <span className={cn("text-muted-foreground", className)}>Self-host only</span>;
  if (pricing.unit !== "per_million_tokens") {
    return <span className={className}>{formatUnitPrice(pricing.input, pricing.unit)}</span>;
  }
  return (
    <span className={cn("tabular-nums", className)}>
      {formatPrice(pricing.input)}
      <span className="text-muted-foreground"> in</span>
      {pricing.output !== null ? (
        <>
          <span className="text-muted-foreground"> · </span>
          {formatPrice(pricing.output)}
          <span className="text-muted-foreground"> out</span>
        </>
      ) : null}
    </span>
  );
}
