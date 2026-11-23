import { describe, expect, it } from "vitest";
import {
  categoryIndexes,
  normalizeScores,
  overallIndexes,
  valueScore,
  type BenchmarkInput,
} from "./score";

const percent = (slug: string, category: string): BenchmarkInput => ({
  slug,
  category,
  higherIsBetter: true,
  minScore: 0,
  maxScore: 100,
});

describe("normalizeScores", () => {
  it("keeps percent scores on their own 0–100 scale", () => {
    const n = normalizeScores(
      [percent("quiz", "knowledge")],
      [{ modelId: "a", benchmarkSlug: "quiz", score: 72 }],
    );
    expect(n.get("a")?.get("quiz")).toBe(72);
  });

  it("min–max scales unbounded units such as Elo across the scored models", () => {
    const elo: BenchmarkInput = {
      slug: "arena",
      category: "pref",
      higherIsBetter: true,
      minScore: null,
      maxScore: null,
    };
    const n = normalizeScores(
      [elo],
      [
        { modelId: "a", benchmarkSlug: "arena", score: 1200 },
        { modelId: "b", benchmarkSlug: "arena", score: 1400 },
        { modelId: "c", benchmarkSlug: "arena", score: 1300 },
      ],
    );
    expect([n.get("a")?.get("arena"), n.get("c")?.get("arena"), n.get("b")?.get("arena")]).toEqual([
      0, 50, 100,
    ]);
  });

  it("inverts benchmarks where lower is better", () => {
    const errorRate: BenchmarkInput = { ...percent("wer", "speech"), higherIsBetter: false };
    const n = normalizeScores([errorRate], [{ modelId: "a", benchmarkSlug: "wer", score: 10 }]);
    expect(n.get("a")?.get("wer")).toBe(90);
  });
});

describe("categoryIndexes", () => {
  const benchmarks = [
    percent("c1", "coding"),
    percent("c2", "coding"),
    percent("c3", "coding"),
    percent("m1", "math"),
  ];

  it("averages a model's scores in each category", () => {
    const n = normalizeScores(benchmarks, [
      { modelId: "a", benchmarkSlug: "c1", score: 60 },
      { modelId: "a", benchmarkSlug: "c2", score: 80 },
      { modelId: "a", benchmarkSlug: "m1", score: 90 },
    ]);
    const idx = categoryIndexes(benchmarks, n).get("a")!;
    // c3 has no results from any model, so it does not count toward coverage.
    expect(idx.get("coding")).toEqual({ value: 70, covered: 2, total: 2 });
    expect(idx.get("math")).toEqual({ value: 90, covered: 1, total: 1 });
  });

  it("requires results for at least half of a category's benchmarks", () => {
    const n = normalizeScores(benchmarks, [
      { modelId: "lucky", benchmarkSlug: "c1", score: 99 },
      { modelId: "b", benchmarkSlug: "c2", score: 50 },
      { modelId: "b", benchmarkSlug: "c3", score: 50 },
    ]);
    expect(categoryIndexes(benchmarks, n).get("lucky")?.has("coding")).toBe(false); // 1 of 3
    expect(categoryIndexes(benchmarks, n).get("b")?.has("coding")).toBe(true); // 2 of 3
  });
});

describe("overallIndexes", () => {
  it("averages category indexes and skips models with too few categories", () => {
    const indexes = new Map([
      [
        "a",
        new Map([
          ["x", { value: 60, covered: 1, total: 1 }],
          ["y", { value: 80, covered: 1, total: 1 }],
          ["z", { value: 70, covered: 1, total: 1 }],
        ]),
      ],
      ["b", new Map([["x", { value: 99, covered: 1, total: 1 }]])],
    ]);
    const overall = overallIndexes(indexes, 3);
    expect(overall.get("a")).toEqual({ value: 70, categories: 3 });
    expect(overall.has("b")).toBe(false);
  });
});

describe("valueScore", () => {
  it("divides by price and excludes free or unknown prices", () => {
    expect(valueScore(70, 3.5)).toBe(20);
    expect(valueScore(70, 0)).toBeNull();
    expect(valueScore(70, null)).toBeNull();
  });
});
