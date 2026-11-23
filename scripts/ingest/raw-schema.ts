import { z } from "zod";

/**
 * Shape of the source records, before normalization. Strict objects reject unknown keys,
 * so a typo such as `"contxt"` is reported instead of silently ignored.
 * Enum-like fields stay plain strings here; normalize.ts maps their aliases and lists the
 * allowed values when one is unknown.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z.string().regex(SLUG_PATTERN, "Must be lowercase letters, digits and single hyphens");
const nonEmpty = z.string().trim().min(1, "Must not be empty");
const url = z.url({ protocol: /^https$/, error: "Must be an https:// URL" });

/** 131072, "128K" (= 128,000) or "1M" (= 1,000,000). */
const tokenCount = z.union([
  z.number().int().positive(),
  z
    .string()
    .regex(/^\d+(\.\d+)?\s*[kKmM]?$/, 'Expected a token count such as 131072, "128K" or "1M"'),
]);

/** YYYY-MM-DD, or YYYY-MM for month precision. */
const calendarDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Expected YYYY-MM-DD or YYYY-MM");

const usd = z.number().nonnegative("Prices cannot be negative").finite();

/** Per-token prices are published as decimal strings (e.g. "0.00000125") to avoid float rounding. */
const usdPerToken = z.union([
  z.string().regex(/^\d+(\.\d+)?$/, 'Expected a decimal string such as "0.00000125"'),
  usd,
]);

export const rawLabSchema = z.strictObject({
  slug,
  name: nonEmpty,
  kind: nonEmpty,
  headquarters: nonEmpty.optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  website: url.optional(),
  logoUrl: url.optional(),
  description: nonEmpty.optional(),
});

export const rawProviderSchema = z.strictObject({
  slug,
  name: nonEmpty,
  kind: nonEmpty,
  lab: slug.optional(),
  website: url.optional(),
  docsUrl: url.optional(),
  logoUrl: url.optional(),
  description: nonEmpty.optional(),
});

export const rawBenchmarkSchema = z
  .strictObject({
    slug,
    name: nonEmpty,
    category: nonEmpty,
    unit: nonEmpty,
    higherIsBetter: z.boolean().optional(),
    minScore: z.number().finite().optional(),
    maxScore: z.number().finite().optional(),
    description: nonEmpty.optional(),
    sourceUrl: url.optional(),
  })
  .refine((b) => b.minScore === undefined || b.maxScore === undefined || b.minScore < b.maxScore, {
    error: "minScore must be below maxScore",
    path: ["minScore"],
  });

export const rawOfferingSchema = z
  .strictObject({
    provider: slug,
    id: nonEmpty,
    // Form 1 (default): USD per 1M tokens
    input: usd.optional(),
    output: usd.optional(),
    cachedInput: usd.optional(),
    // Form 2: USD per 1K tokens (AWS, Azure)
    pricePer1K: z
      .strictObject({ input: usd, output: usd.optional(), cachedInput: usd.optional() })
      .optional(),
    // Form 3: USD per token, as decimal strings (OpenRouter)
    pricePerToken: z
      .strictObject({
        input: usdPerToken,
        output: usdPerToken.optional(),
        cachedInput: usdPerToken.optional(),
      })
      .optional(),
    // Form 4: non-token pricing
    unit: nonEmpty.optional(),
    price: usd.optional(),
    // Limits and performance
    context: tokenCount.optional(),
    maxOutput: tokenCount.optional(),
    quantization: nonEmpty.optional(),
    tps: z.number().positive().optional(),
    ttftMs: z.number().int().positive().optional(),
  })
  .superRefine((offering, ctx) => {
    const forms = [
      offering.input !== undefined,
      offering.pricePer1K !== undefined,
      offering.pricePerToken !== undefined,
      offering.unit !== undefined || offering.price !== undefined,
    ].filter(Boolean).length;

    if (forms !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Give exactly one price form: input/output (per 1M tokens), pricePer1K, pricePerToken, or unit + price",
      });
    }
    if ((offering.unit === undefined) !== (offering.price === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "`unit` and `price` must be given together",
        path: ["unit"],
      });
    }
    if (
      offering.input === undefined &&
      (offering.output !== undefined || offering.cachedInput !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "`output`/`cachedInput` require `input`",
        path: ["input"],
      });
    }
  });

export const rawModelSchema = z.strictObject({
  name: nonEmpty,
  slug: slug.optional(),
  family: nonEmpty.optional(),
  type: nonEmpty,
  status: nonEmpty.optional(),
  released: calendarDate.optional(),
  knowledgeCutoff: calendarDate.optional(),
  context: tokenCount.optional(),
  maxOutput: tokenCount.optional(),
  params: z.number().positive().optional(),
  openWeights: z.boolean().optional(),
  license: nonEmpty.optional(),
  input: z.array(nonEmpty).min(1, "List at least one input modality"),
  output: z.array(nonEmpty),
  capabilities: z.array(nonEmpty).default([]),
  description: nonEmpty.optional(),
  offerings: z.array(rawOfferingSchema).default([]),
  scores: z.record(slug, z.number().finite()).default({}),
});

export type RawLab = z.infer<typeof rawLabSchema>;
export type RawProvider = z.infer<typeof rawProviderSchema>;
export type RawBenchmark = z.infer<typeof rawBenchmarkSchema>;
export type RawOffering = z.infer<typeof rawOfferingSchema>;
export type RawModel = z.infer<typeof rawModelSchema>;
