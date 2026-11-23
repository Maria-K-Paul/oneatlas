import type { ModelSummary, PublicProviderKind } from "@/modules/catalog";

export type PublicLabKind = "company" | "research_institute" | "open_community";

export type LabSummary = {
  slug: string;
  name: string;
  kind: PublicLabKind;
  headquarters: string | null;
  foundedYear: number | null;
  website: string | null;
  description: string | null;
  modelCount: number;
  openWeightsCount: number;
  latestRelease: { id: string; name: string; releaseDate: string | null } | null;
};

export type LabDetail = LabSummary & {
  models: ModelSummary[];
  /** Providers that serve at least one of this lab's models, with how many. */
  providers: { slug: string; name: string; kind: PublicProviderKind; modelCount: number }[];
  firstPartyApi: { slug: string; name: string } | null;
};

export const LAB_KIND_LABELS: Record<PublicLabKind, string> = {
  company: "Company",
  research_institute: "Research institute",
  open_community: "Open community",
};
