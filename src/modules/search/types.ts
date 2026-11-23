import type { ModelSummary, PublicProviderKind } from "@/modules/catalog";

export type SearchResults = {
  query: string;
  models: ModelSummary[];
  labs: { slug: string; name: string; modelCount: number }[];
  providers: { slug: string; name: string; kind: PublicProviderKind; offeringCount: number }[];
};
