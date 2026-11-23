import type { Prisma } from "@/generated/prisma/client";
import type { ModelListQuery } from "../schemas";

/** Columns every model list needs. Kept small: list pages never load offerings or scores. */
export const modelSummarySelect = {
  slug: true,
  name: true,
  family: true,
  type: true,
  status: true,
  releaseDate: true,
  contextWindow: true,
  maxOutputTokens: true,
  parametersB: true,
  openWeights: true,
  inputModalities: true,
  outputModalities: true,
  capabilities: true,
  pricingUnit: true,
  minInputPrice: true,
  minOutputPrice: true,
  blendedPrice: true,
  providerCount: true,
  lab: { select: { slug: true, name: true } },
} satisfies Prisma.ModelSelect;

export const modelDetailSelect = {
  ...modelSummarySelect,
  description: true,
  knowledgeCutoff: true,
  license: true,
  lab: { select: { slug: true, name: true, website: true } },
  offerings: {
    select: {
      providerModelId: true,
      pricingUnit: true,
      inputPrice: true,
      outputPrice: true,
      cachedInputPrice: true,
      contextWindow: true,
      maxOutputTokens: true,
      quantization: true,
      throughputTps: true,
      latencyMs: true,
      provider: { select: { slug: true, name: true, kind: true } },
    },
    orderBy: [{ inputPrice: "asc" }, { provider: { name: "asc" } }],
  },
  scores: {
    select: {
      score: true,
      benchmark: { select: { slug: true, name: true, category: true, unit: true } },
    },
    orderBy: { benchmark: { name: "asc" } },
  },
} satisfies Prisma.ModelSelect;

export type ModelSummaryRow = Prisma.ModelGetPayload<{ select: typeof modelSummarySelect }>;
export type ModelDetailRow = Prisma.ModelGetPayload<{ select: typeof modelDetailSelect }>;

/** Translates a validated catalog query into a Prisma filter. Every condition hits an index (docs §5.4). */
export function buildModelWhere(query: ModelListQuery): Prisma.ModelWhereInput {
  const and: Prisma.ModelWhereInput[] = [];

  if (!query.includeDeprecated) and.push({ status: { not: "DEPRECATED" } });
  if (query.q) {
    const contains = { contains: query.q, mode: "insensitive" } as const;
    and.push({
      OR: [
        { name: contains },
        { family: contains },
        { slug: contains },
        { lab: { name: contains } },
      ],
    });
  }
  if (query.lab) and.push({ lab: { slug: { in: query.lab } } });
  if (query.provider)
    and.push({ offerings: { some: { provider: { slug: { in: query.provider } } } } });
  if (query.type) and.push({ type: { in: query.type } });
  if (query.capability) and.push({ capabilities: { hasEvery: query.capability } });
  if (query.input) and.push({ inputModalities: { hasEvery: query.input } });
  if (query.openWeights !== undefined) and.push({ openWeights: query.openWeights });
  if (query.minContext) and.push({ contextWindow: { gte: query.minContext } });
  if (query.maxPrice !== undefined) {
    and.push({ blendedPrice: { lte: query.maxPrice }, pricingUnit: "PER_MILLION_TOKENS" });
  }

  return { AND: and };
}

const SORT_COLUMNS = {
  releaseDate: "releaseDate",
  name: "name",
  blendedPrice: "blendedPrice",
  inputPrice: "minInputPrice",
  outputPrice: "minOutputPrice",
  contextWindow: "contextWindow",
  providerCount: "providerCount",
} as const;

const PRICE_SORTS = new Set(["blendedPrice", "inputPrice", "outputPrice"]);

/**
 * Nulls always sort last (a model with no price isn't "cheapest"). Price sorts group by pricing
 * unit first, so $/token and $/image are never interleaved (docs D7). Name breaks ties so pages
 * are stable.
 */
export function buildModelOrderBy(
  query: Pick<ModelListQuery, "sort" | "order">,
  defaultOrder: "asc" | "desc",
): Prisma.ModelOrderByWithRelationInput[] {
  const sort = query.order ?? defaultOrder;
  const column = SORT_COLUMNS[query.sort];
  const orderBy: Prisma.ModelOrderByWithRelationInput[] = [];
  if (PRICE_SORTS.has(query.sort)) orderBy.push({ pricingUnit: { sort: "asc", nulls: "last" } });
  orderBy.push(
    column === "name" || column === "providerCount"
      ? { [column]: sort }
      : { [column]: { sort, nulls: "last" } },
  );
  if (column !== "name") orderBy.push({ name: "asc" });
  return orderBy;
}
