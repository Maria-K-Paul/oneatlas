import type { ModelSummary, PublicBenchmarkCategory, PublicScoreUnit } from "@/modules/catalog";
import type { Board } from "./boards";

export type RankingRow = {
  rank: number;
  model: ModelSummary;
  /** The ranked value (index, price, tokens, provider count or a timestamp). */
  value: number;
  /** How the value is shown, e.g. "74.2" or "$0.26". */
  display: string;
  /** Extra context, e.g. "3 of 4 benchmarks". */
  note?: string;
};

export type BoardResult = { board: Board; rows: RankingRow[] };

export type BenchmarkSummary = {
  slug: string;
  name: string;
  category: PublicBenchmarkCategory;
  unit: PublicScoreUnit;
  higherIsBetter: boolean;
  description: string | null;
  sourceUrl: string | null;
  scoreCount: number;
  top: { model: ModelSummary; score: number }[];
};

export type BenchmarkDetail = Omit<BenchmarkSummary, "top"> & {
  results: { rank: number; model: ModelSummary; score: number }[];
};
