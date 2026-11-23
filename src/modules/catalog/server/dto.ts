import type { Prisma } from "@/generated/prisma/client";
import { toPublicEnum } from "@/platform/validation";
import type { ModelDetail, ModelSummary } from "../types";
import type { ModelDetailRow, ModelSummaryRow } from "./queries";

/** Database row → API contract. The only place Decimals become numbers and Dates become strings. */

export function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/** Calendar dates are stored as DATE; send them as "YYYY-MM-DD". */
export function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toModelSummary(row: ModelSummaryRow): ModelSummary {
  return {
    id: `${row.lab.slug}/${row.slug}`,
    slug: row.slug,
    name: row.name,
    family: row.family,
    lab: { slug: row.lab.slug, name: row.lab.name },
    type: toPublicEnum(row.type),
    status: toPublicEnum(row.status),
    releaseDate: toIsoDate(row.releaseDate),
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    parametersB: row.parametersB,
    openWeights: row.openWeights,
    modalities: {
      input: row.inputModalities.map(toPublicEnum),
      output: row.outputModalities.map(toPublicEnum),
    },
    capabilities: row.capabilities.map(toPublicEnum),
    pricing: row.pricingUnit
      ? {
          unit: toPublicEnum(row.pricingUnit),
          input: decimalToNumber(row.minInputPrice),
          output: decimalToNumber(row.minOutputPrice),
          blended: decimalToNumber(row.blendedPrice),
        }
      : null,
    providerCount: row.providerCount,
  };
}

export function toModelDetail(row: ModelDetailRow): ModelDetail {
  return {
    ...toModelSummary(row),
    description: row.description,
    knowledgeCutoff: toIsoDate(row.knowledgeCutoff),
    license: row.license,
    lab: { slug: row.lab.slug, name: row.lab.name, website: row.lab.website },
    offerings: row.offerings.map((o) => ({
      provider: {
        slug: o.provider.slug,
        name: o.provider.name,
        kind: toPublicEnum(o.provider.kind),
      },
      providerModelId: o.providerModelId,
      pricing: {
        unit: toPublicEnum(o.pricingUnit),
        input: o.inputPrice.toNumber(),
        output: decimalToNumber(o.outputPrice),
        cachedInput: decimalToNumber(o.cachedInputPrice),
      },
      contextWindow: o.contextWindow,
      maxOutputTokens: o.maxOutputTokens,
      quantization: o.quantization,
      throughputTps: o.throughputTps,
      latencyMs: o.latencyMs,
    })),
    scores: row.scores.map((s) => ({
      benchmark: {
        slug: s.benchmark.slug,
        name: s.benchmark.name,
        category: toPublicEnum(s.benchmark.category),
        unit: toPublicEnum(s.benchmark.unit),
      },
      score: s.score,
    })),
  };
}
