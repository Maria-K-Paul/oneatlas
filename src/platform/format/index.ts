/**
 * Display formatting shared by every page. Pure functions, safe on server and client.
 * Prices are stored in USD per unit (docs D7); token counts are integers.
 */

export type PublicPricingUnit =
  | "per_million_tokens"
  | "per_image"
  | "per_minute"
  | "per_million_characters"
  | "per_thousand_searches";

const UNIT_SUFFIX: Record<PublicPricingUnit, string> = {
  per_million_tokens: "/ 1M tokens",
  per_image: "/ image",
  per_minute: "/ min",
  per_million_characters: "/ 1M chars",
  per_thousand_searches: "/ 1K searches",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** 0 → "Free", 0.075 → "$0.075", 2.5 → "$2.50", null → "—". */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Free";
  return usd.format(value);
}

/** "$2.50 / 1M tokens" */
export function formatPriceWithUnit(
  value: number | null | undefined,
  unit: PublicPricingUnit | null | undefined,
): string {
  const price = formatPrice(value);
  if (!unit || price === "—" || price === "Free") return price;
  return `${price} ${UNIT_SUFFIX[unit]}`;
}

export function pricingUnitSuffix(unit: PublicPricingUnit): string {
  return UNIT_SUFFIX[unit];
}

/**
 * Token counts the way model cards print them: 128000 → "128K", 131072 → "128K",
 * 1048576 → "1M", 1050000 → "1.05M". Round decimal values win; binary K/M (1024-based)
 * is used only when the decimal form isn't whole, as with 131,072 or 1,048,576.
 */
export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const KI = 1024;
  const MI = KI * KI;
  if (value >= 1_000_000 && value % 1_000_000 === 0) return `${value / 1_000_000}M`;
  if (value >= 1_000 && value % 1_000 === 0 && value < 1_000_000) return `${value / 1_000}K`;
  if (value >= MI && value % MI === 0) return `${value / MI}M`;
  if (value >= KI && value % KI === 0 && value < MI) return `${value / KI}K`;
  if (value >= 1_000_000) return `${trimNumber(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimNumber(value / 1_000)}K`;
  return String(value);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC", // dates are calendar dates; never shift them by the viewer's timezone
});

/** "2026-11-22" → "Nov 22, 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

const integer = new Intl.NumberFormat("en-US");

/** 8274 → "8,274" */
export function formatCount(value: number): string {
  return integer.format(value);
}

/** 405 → "405B", 0.5 → "500M" (parameter counts are stored in billions). */
export function formatParameters(billions: number | null | undefined): string {
  if (billions === null || billions === undefined) return "—";
  if (billions >= 1000) return `${trimNumber(billions / 1000)}T`;
  if (billions >= 1) return `${trimNumber(billions)}B`;
  return `${trimNumber(billions * 1000)}M`;
}

function trimNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}
