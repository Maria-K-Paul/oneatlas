import type {
  BenchmarkCategory,
  Capability,
  LabKind,
  Modality,
  ModelStatus,
  ModelType,
  PricingUnit,
  ProviderKind,
  ScoreUnit,
} from "@/generated/prisma/enums";
import type { Origin } from "./issues";

/**
 * The dataset after normalization: database-shaped values, natural keys (slugs) instead of IDs,
 * plus an `origin` on each record for error reporting. Prices are decimal strings in USD per
 * unit, rounded to the 4 decimal places the database stores, so no float error creeps in.
 */

export type NormalizedLab = {
  origin: Origin;
  slug: string;
  name: string;
  kind: LabKind;
  description: string | null;
  website: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  logoUrl: string | null;
};

export type NormalizedProvider = {
  origin: Origin;
  slug: string;
  name: string;
  kind: ProviderKind;
  labSlug: string | null;
  description: string | null;
  website: string | null;
  docsUrl: string | null;
  logoUrl: string | null;
};

export type NormalizedBenchmark = {
  origin: Origin;
  slug: string;
  name: string;
  category: BenchmarkCategory;
  unit: ScoreUnit;
  higherIsBetter: boolean;
  minScore: number | null;
  maxScore: number | null;
  description: string | null;
  sourceUrl: string | null;
};

export type NormalizedOffering = {
  path: string;
  providerSlug: string;
  providerModelId: string;
  pricingUnit: PricingUnit;
  inputPrice: string;
  outputPrice: string | null;
  cachedInputPrice: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  quantization: string | null;
  throughputTps: number | null;
  latencyMs: number | null;
};

export type NormalizedScore = {
  benchmarkSlug: string;
  score: number;
};

export type NormalizedModel = {
  origin: Origin;
  labSlug: string;
  slug: string;
  name: string;
  family: string | null;
  type: ModelType;
  status: ModelStatus;
  description: string | null;
  releaseDate: Date | null;
  knowledgeCutoff: Date | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  parametersB: number | null;
  openWeights: boolean;
  license: string | null;
  inputModalities: Modality[];
  outputModalities: Modality[];
  capabilities: Capability[];
  offerings: NormalizedOffering[];
  scores: NormalizedScore[];
};

export type NormalizedDataset = {
  source: string;
  labs: NormalizedLab[];
  providers: NormalizedProvider[];
  benchmarks: NormalizedBenchmark[];
  models: NormalizedModel[];
};

export type TableStats = { created: number; updated: number; deleted: number; unchanged: number };

export type WriteStats = {
  labs: TableStats;
  providers: TableStats;
  benchmarks: TableStats;
  models: TableStats;
  offerings: TableStats;
  scores: TableStats;
};
