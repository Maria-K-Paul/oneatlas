import { z } from "zod";
import { Capability, Modality, ModelType } from "@/generated/prisma/enums";
import {
  booleanParam,
  csvList,
  intParam,
  numberParam,
  paginationSchema,
  publicEnum,
  searchParamsToRecord,
  searchTextParam,
  type SearchParamsInput,
} from "@/platform/validation";

/**
 * One schema for the /models page and GET /api/v1/models, so both accept and reject exactly
 * the same input (docs D3). Public values are lower_snake; the schema maps them to DB enums.
 */

export const modelTypeEnum = publicEnum(ModelType);
export const capabilityEnum = publicEnum(Capability);
export const modalityEnum = publicEnum(Modality);

export const slugParam = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Invalid slug");

export const MODEL_SORTS = {
  releaseDate: { label: "Newest", defaultOrder: "desc" },
  name: { label: "Name", defaultOrder: "asc" },
  blendedPrice: { label: "Price (blended)", defaultOrder: "asc" },
  inputPrice: { label: "Input price", defaultOrder: "asc" },
  outputPrice: { label: "Output price", defaultOrder: "asc" },
  contextWindow: { label: "Context window", defaultOrder: "desc" },
  providerCount: { label: "Most providers", defaultOrder: "desc" },
} as const satisfies Record<string, { label: string; defaultOrder: "asc" | "desc" }>;

export type ModelSort = keyof typeof MODEL_SORTS;
export const MODEL_SORT_KEYS = Object.keys(MODEL_SORTS) as [ModelSort, ...ModelSort[]];
export const DEFAULT_MODEL_SORT: ModelSort = "releaseDate";

export const modelListQuerySchema = z.object({
  q: searchTextParam,
  lab: csvList(slugParam, { max: 50 }),
  provider: csvList(slugParam, { max: 50 }),
  type: csvList(modelTypeEnum.schema),
  capability: csvList(capabilityEnum.schema),
  input: csvList(modalityEnum.schema),
  openWeights: booleanParam,
  minContext: intParam({ min: 1, max: 100_000_000 }),
  maxPrice: numberParam({ max: 100_000 }),
  includeDeprecated: booleanParam,
  sort: z.enum(MODEL_SORT_KEYS).default(DEFAULT_MODEL_SORT),
  order: z.enum(["asc", "desc"]).optional(),
  ...paginationSchema.shape,
});

export type ModelListQuery = z.infer<typeof modelListQuerySchema>;

export function parseModelListQuery(input: SearchParamsInput) {
  return modelListQuerySchema.safeParse(searchParamsToRecord(input));
}

/** "openai/gpt-5,anthropic/claude-opus-4-5" → [{ lab, slug }, …] */
export const modelIdParam = z
  .string()
  .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, 'Model ids look like "lab/model"')
  .transform((id) => {
    const [lab, slug] = id.split("/") as [string, string];
    return { lab, slug, id };
  });
