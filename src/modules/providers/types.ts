import type {
  LabRef,
  ModelSummary,
  PublicPricingUnit,
  PublicProviderKind,
} from "@/modules/catalog";

export type ProviderSummary = {
  slug: string;
  name: string;
  kind: PublicProviderKind;
  description: string | null;
  website: string | null;
  docsUrl: string | null;
  lab: LabRef | null;
  modelCount: number;
  labCount: number;
};

export type ProviderOffering = {
  model: ModelSummary;
  providerModelId: string;
  pricing: {
    unit: PublicPricingUnit;
    input: number;
    output: number | null;
    cachedInput: number | null;
  };
  contextWindow: number | null;
  throughputTps: number | null;
  /** True when this provider has the lowest input price for the model. */
  cheapest: boolean;
};

export type ProviderDetail = ProviderSummary & { offerings: ProviderOffering[] };
