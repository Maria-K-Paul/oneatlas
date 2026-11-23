import type {
  BenchmarkCategory,
  Capability,
  Modality,
  ModelStatus,
  ModelType,
  PricingUnit,
  ProviderKind,
  ScoreUnit,
} from "@/generated/prisma/enums";

/**
 * The public API contract for catalog data (docs §7). These are DTOs, not database rows:
 * numbers instead of Decimals, ISO date strings instead of Date objects, lowercase enum values,
 * and "lab/slug" ids instead of internal database ids.
 */

export type PublicModelType = Lowercase<ModelType>;
export type PublicModelStatus = Lowercase<ModelStatus>;
export type PublicModality = Lowercase<Modality>;
export type PublicCapability = Lowercase<Capability>;
export type PublicPricingUnit = Lowercase<PricingUnit>;
export type PublicProviderKind = Lowercase<ProviderKind>;
export type PublicBenchmarkCategory = Lowercase<BenchmarkCategory>;
export type PublicScoreUnit = Lowercase<ScoreUnit>;

export type ModelPricing = {
  unit: PublicPricingUnit;
  /** Cheapest input price across providers, USD per unit. */
  input: number | null;
  /** Cheapest output price across providers, USD per unit. */
  output: number | null;
  /** Cheapest (3 × input + output) / 4 across providers. */
  blended: number | null;
};

export type LabRef = { slug: string; name: string };

export type ModelSummary = {
  /** Public id, "lab/slug". */
  id: string;
  slug: string;
  name: string;
  family: string | null;
  lab: LabRef;
  type: PublicModelType;
  status: PublicModelStatus;
  releaseDate: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  parametersB: number | null;
  openWeights: boolean;
  modalities: { input: PublicModality[]; output: PublicModality[] };
  capabilities: PublicCapability[];
  /** null when no provider offers the model (self-host only). */
  pricing: ModelPricing | null;
  providerCount: number;
};

export type ModelOffering = {
  provider: { slug: string; name: string; kind: PublicProviderKind };
  providerModelId: string;
  pricing: {
    unit: PublicPricingUnit;
    input: number;
    output: number | null;
    cachedInput: number | null;
  };
  contextWindow: number | null;
  maxOutputTokens: number | null;
  quantization: string | null;
  throughputTps: number | null;
  latencyMs: number | null;
};

export type ModelScore = {
  benchmark: {
    slug: string;
    name: string;
    category: PublicBenchmarkCategory;
    unit: PublicScoreUnit;
  };
  score: number;
};

export type ModelDetail = ModelSummary & {
  description: string | null;
  knowledgeCutoff: string | null;
  license: string | null;
  lab: LabRef & { website: string | null };
  offerings: ModelOffering[];
  scores: ModelScore[];
};

export type Facet = { value: string; label: string; count: number };

export type CatalogFacets = {
  types: Facet[];
  capabilities: Facet[];
  inputModalities: Facet[];
  labs: Facet[];
  providers: Facet[];
};

export type CatalogStats = {
  models: number;
  labs: number;
  providers: number;
  offerings: number;
  openWeights: number;
  capabilityCoverage: { capability: PublicCapability; label: string; share: number }[];
  newest: ModelSummary[];
};
