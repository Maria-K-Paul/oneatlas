import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ModelSummary } from "@/modules/catalog";
import { CATALOG_CACHE_TAG, modelSummarySelect, toModelSummary } from "@/modules/catalog/server";
import { getDb } from "@/platform/db";
import { formatDate, formatPrice, formatTokens } from "@/platform/format";
import { toPublicEnum } from "@/platform/validation";
import { findBoard, type Board } from "../boards";
import type { BenchmarkDetail, BenchmarkSummary, BoardResult, RankingRow } from "../types";
import {
  categoryIndexes,
  normalizeScores,
  overallIndexes,
  valueScore,
  type ScoreInput,
} from "./score";

/** Ties share a rank (1, 2, 2, 4), like a real leaderboard. */
function rank(
  entries: { model: ModelSummary; value: number; display: string; note?: string }[],
): RankingRow[] {
  return entries.map((entry, index) => {
    let r = index + 1;
    for (let j = index - 1; j >= 0 && entries[j]!.value === entry.value; j--) r = j + 1;
    return { rank: r, ...entry };
  });
}

/** Text models with their scores, plus every benchmark's scale. Rankings only cover text models. */
async function loadScoredModels() {
  const db = getDb();
  const [benchmarks, rows] = await Promise.all([
    db.benchmark.findMany({
      select: { slug: true, category: true, higherIsBetter: true, minScore: true, maxScore: true },
    }),
    db.model.findMany({
      where: { type: "TEXT", status: { not: "DEPRECATED" } },
      select: {
        ...modelSummarySelect,
        scores: { select: { score: true, benchmark: { select: { slug: true } } } },
      },
    }),
  ]);
  const models = new Map(rows.map((row) => [`${row.lab.slug}/${row.slug}`, toModelSummary(row)]));
  const scores: ScoreInput[] = rows.flatMap((row) =>
    row.scores.map((s) => ({
      modelId: `${row.lab.slug}/${row.slug}`,
      benchmarkSlug: s.benchmark.slug,
      score: s.score,
    })),
  );
  const normalized = normalizeScores(benchmarks, scores);
  const byCategory = categoryIndexes(benchmarks, normalized);
  return { models, byCategory, overall: overallIndexes(byCategory) };
}

async function buildBoard(board: Board, limit: number): Promise<RankingRow[]> {
  const byValueDesc = (a: { value: number }, b: { value: number }) => b.value - a.value;

  if (board.kind === "overall" || board.kind === "category" || board.kind === "value") {
    const { models, byCategory, overall } = await loadScoredModels();
    const entries: { model: ModelSummary; value: number; display: string; note?: string }[] = [];

    for (const [id, model] of models) {
      if (board.kind === "category") {
        const index = byCategory.get(id)?.get(board.category!);
        if (index) {
          entries.push({
            model,
            value: index.value,
            display: index.value.toFixed(1),
            note: `${index.covered} of ${index.total} benchmarks`,
          });
        }
        continue;
      }
      const o = overall.get(id);
      if (!o) continue;
      if (board.kind === "overall") {
        entries.push({
          model,
          value: o.value,
          display: o.value.toFixed(1),
          note: `${o.categories} categories`,
        });
      } else {
        const value =
          model.pricing?.unit === "per_million_tokens"
            ? valueScore(o.value, model.pricing.blended)
            : null;
        if (value !== null) {
          entries.push({
            model,
            value,
            display: value.toFixed(1),
            note: `Index ${o.value.toFixed(1)} at ${formatPrice(model.pricing!.blended)}`,
          });
        }
      }
    }
    return rank(entries.sort(byValueDesc).slice(0, limit));
  }

  const db = getDb();
  const notDeprecated = { status: { not: "DEPRECATED" } } as const;

  if (board.kind === "cheapest") {
    const rows = await db.model.findMany({
      where: {
        ...notDeprecated,
        type: "TEXT",
        pricingUnit: "PER_MILLION_TOKENS",
        blendedPrice: { gt: 0 },
      },
      orderBy: [{ blendedPrice: "asc" }, { name: "asc" }],
      take: limit,
      select: modelSummarySelect,
    });
    return rank(
      rows.map(toModelSummary).map((model) => ({
        model,
        value: model.pricing!.blended!,
        display: formatPrice(model.pricing!.blended),
        note: `${formatPrice(model.pricing!.input)} in · ${formatPrice(model.pricing!.output)} out`,
      })),
    );
  }

  if (board.kind === "context") {
    const rows = await db.model.findMany({
      where: { ...notDeprecated, type: "TEXT", contextWindow: { not: null } },
      orderBy: [{ contextWindow: "desc" }, { name: "asc" }],
      take: limit,
      select: modelSummarySelect,
    });
    return rank(
      rows.map(toModelSummary).map((model) => ({
        model,
        value: model.contextWindow!,
        display: formatTokens(model.contextWindow),
        note: model.maxOutputTokens
          ? `${formatTokens(model.maxOutputTokens)} max output`
          : undefined,
      })),
    );
  }

  if (board.kind === "newest") {
    const rows = await db.model.findMany({
      where: { ...notDeprecated, releaseDate: { not: null } },
      orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
      take: limit,
      select: modelSummarySelect,
    });
    return rank(
      rows.map(toModelSummary).map((model) => ({
        model,
        value: new Date(model.releaseDate!).getTime(),
        display: formatDate(model.releaseDate),
      })),
    );
  }

  // availability
  const rows = await db.model.findMany({
    where: { ...notDeprecated, providerCount: { gt: 0 } },
    orderBy: [{ providerCount: "desc" }, { name: "asc" }],
    take: limit,
    select: modelSummarySelect,
  });
  return rank(
    rows.map(toModelSummary).map((model) => ({
      model,
      value: model.providerCount,
      display: String(model.providerCount),
      note: model.providerCount === 1 ? "1 provider" : `${model.providerCount} providers`,
    })),
  );
}

export async function getBoard(slug: string, limit = 100): Promise<BoardResult | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const board = findBoard(slug);
  if (!board) return null;
  return { board, rows: await buildBoard(board, limit) };
}

type BenchmarkRow = {
  slug: string;
  name: string;
  category: string;
  unit: string;
  higherIsBetter: boolean;
  description: string | null;
  sourceUrl: string | null;
};

function toBenchmarkBase(b: BenchmarkRow) {
  return {
    slug: b.slug,
    name: b.name,
    category: toPublicEnum(b.category) as BenchmarkSummary["category"],
    unit: toPublicEnum(b.unit) as BenchmarkSummary["unit"],
    higherIsBetter: b.higherIsBetter,
    description: b.description,
    sourceUrl: b.sourceUrl,
  };
}

const benchmarkSelect = {
  slug: true,
  name: true,
  category: true,
  unit: true,
  higherIsBetter: true,
  description: true,
  sourceUrl: true,
} as const;

export async function listBenchmarks(): Promise<BenchmarkSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const rows = await getDb().benchmark.findMany({
    select: {
      ...benchmarkSelect,
      _count: { select: { scores: true } },
      scores: { select: { score: true, model: { select: modelSummarySelect } } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return rows.map((b) => ({
    ...toBenchmarkBase(b),
    scoreCount: b._count.scores,
    top: [...b.scores]
      .sort((x, y) => (b.higherIsBetter ? y.score - x.score : x.score - y.score))
      .slice(0, 3)
      .map((s) => ({ model: toModelSummary(s.model), score: s.score })),
  }));
}

export async function getBenchmark(slug: string): Promise<BenchmarkDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const b = await getDb().benchmark.findUnique({
    where: { slug },
    select: {
      ...benchmarkSelect,
      _count: { select: { scores: true } },
      scores: { select: { score: true, model: { select: modelSummarySelect } } },
    },
  });
  if (!b) return null;
  const sorted = [...b.scores].sort((x, y) =>
    b.higherIsBetter ? y.score - x.score : x.score - y.score,
  );
  const ranked = rank(
    sorted.map((s) => ({
      model: toModelSummary(s.model),
      value: s.score,
      display: String(s.score),
    })),
  );
  return {
    ...toBenchmarkBase(b),
    scoreCount: b._count.scores,
    results: ranked.map((r) => ({ rank: r.rank, model: r.model, score: r.value })),
  };
}

export async function listBenchmarkSlugs(): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);
  return getDb().benchmark.findMany({ select: { slug: true }, orderBy: { slug: "asc" } });
}
