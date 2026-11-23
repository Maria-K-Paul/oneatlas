import { z } from "zod";

/**
 * Shared building blocks for parsing query strings. Feature modules compose these into their
 * own schemas, which both the pages and the API use, so both validate input identically (docs D3).
 */

export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

/**
 * Turns `URLSearchParams` or Next's `searchParams` object into one string per key.
 * Repeated keys are joined with commas, so `?lab=a&lab=b` and `?lab=a,b` mean the same thing.
 */
export function searchParamsToRecord(input: SearchParamsInput): Record<string, string> {
  const pairs: [string, string][] =
    input instanceof URLSearchParams
      ? [...input.entries()]
      : Object.entries(input).flatMap(([key, value]): [string, string][] => {
          if (value === undefined) return [];
          return Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]];
        });

  const record: Record<string, string> = {};
  for (const [key, value] of pairs) {
    record[key] = key in record ? `${record[key]},${value}` : value;
  }
  return record;
}

/** "a, b,,c" → ["a", "b", "c"]; empty → undefined. */
export function splitCsv(value: string): string[] | undefined {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? [...new Set(items)] : undefined;
}

/** A comma-separated list, each item validated by `item`. Capped so one request can't ask for unbounded work. */
export function csvList<T extends z.ZodType>(item: T, { max = 20 }: { max?: number } = {}) {
  return z.preprocess(
    (value) => (typeof value === "string" ? splitCsv(value) : value),
    z.array(item).max(max, `At most ${max} values are allowed`).optional(),
  );
}

/** `true`/`false`/`1`/`0` → boolean. */
export const booleanParam = z
  .enum(["true", "false", "1", "0"], { error: "Expected true or false" })
  .transform((value) => value === "true" || value === "1")
  .optional();

/** Free-text search: trimmed, capped at 100 characters, empty → undefined. */
export const searchTextParam = z
  .string()
  .trim()
  .max(100, "Search text can be at most 100 characters")
  .optional()
  .transform((value) => (value ? value : undefined));

/** An optional integer within bounds, e.g. `minContext=200000`. */
export function intParam({ min, max }: { min: number; max: number }) {
  return z.coerce.number().int().min(min).max(max).optional();
}

/** An optional non-negative number, e.g. `maxPrice=2.5`. */
export function numberParam({ min = 0, max }: { min?: number; max: number }) {
  return z.coerce.number().min(min).max(max).optional();
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 24;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type Pagination = z.infer<typeof paginationSchema>;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginationMeta({ page, pageSize }: Pagination, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function paginationToSkipTake({ page, pageSize }: Pagination) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export { publicEnum, toPublicEnum, type PublicEnum } from "./enums";
