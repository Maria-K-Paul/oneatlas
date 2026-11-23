import { describe, expect, it } from "vitest";
import { IssueCollector } from "./issues";
import type { NormalizedDataset, NormalizedModel, NormalizedOffering } from "./types";
import { validateDataset } from "./validate";

const origin = (record: string) => ({ file: "test.json", record });

const offering = (overrides: Partial<NormalizedOffering> = {}): NormalizedOffering => ({
  path: "offerings[0]",
  providerSlug: "host",
  providerModelId: "atlas",
  pricingUnit: "PER_MILLION_TOKENS",
  inputPrice: "1.0000",
  outputPrice: "2.0000",
  cachedInputPrice: null,
  contextWindow: null,
  maxOutputTokens: null,
  quantization: null,
  throughputTps: null,
  latencyMs: null,
  ...overrides,
});

const model = (overrides: Partial<NormalizedModel> = {}): NormalizedModel => ({
  origin: origin("[0] Atlas"),
  labSlug: "acme",
  slug: "atlas",
  name: "Atlas",
  family: null,
  type: "TEXT",
  status: "ACTIVE",
  description: null,
  releaseDate: null,
  knowledgeCutoff: null,
  contextWindow: 128_000,
  maxOutputTokens: 8_000,
  parametersB: null,
  openWeights: false,
  license: null,
  inputModalities: ["TEXT"],
  outputModalities: ["TEXT"],
  capabilities: [],
  offerings: [offering()],
  scores: [],
  ...overrides,
});

const dataset = (models: NormalizedModel[]): NormalizedDataset => ({
  source: "test@1",
  labs: [
    {
      origin: origin("[0] acme"),
      slug: "acme",
      name: "Acme",
      kind: "COMPANY",
      description: null,
      website: null,
      headquarters: null,
      foundedYear: null,
      logoUrl: null,
    },
  ],
  providers: [
    {
      origin: origin("[0] host"),
      slug: "host",
      name: "Host",
      kind: "INFERENCE_PLATFORM",
      labSlug: null,
      description: null,
      website: null,
      docsUrl: null,
      logoUrl: null,
    },
  ],
  benchmarks: [
    {
      origin: origin("[0] quiz"),
      slug: "quiz",
      name: "Quiz",
      category: "KNOWLEDGE",
      unit: "PERCENT",
      higherIsBetter: true,
      minScore: 0,
      maxScore: 100,
      description: null,
      sourceUrl: null,
    },
  ],
  models,
});

const errorsFor = (models: NormalizedModel[]) => {
  const issues = new IssueCollector();
  validateDataset(dataset(models), issues);
  return issues.errors.map((issue) => issue.message);
};

describe("validateDataset", () => {
  it("accepts a consistent dataset", () => {
    expect(errorsFor([model({ scores: [{ benchmarkSlug: "quiz", score: 71.5 }] })])).toEqual([]);
  });

  it("catches references to unknown providers and benchmarks", () => {
    expect(
      errorsFor([
        model({
          offerings: [offering({ providerSlug: "nowhere" })],
          scores: [{ benchmarkSlug: "mystery", score: 50 }],
        }),
      ]),
    ).toEqual([
      'Unknown provider "nowhere"',
      'Unknown benchmark "mystery" (add it to benchmarks.json)',
    ]);
  });

  it("catches duplicate model ids and duplicate providers per model", () => {
    const errors = errorsFor([
      model({ offerings: [offering(), offering({ path: "offerings[1]" })] }),
      model({ origin: origin("[1] Atlas again") }),
    ]);
    expect(errors).toContain('Provider "host" is listed twice for this model');
    expect(errors.some((e) => e.startsWith('Duplicate model id "acme/atlas"'))).toBe(true);
  });

  it("rejects scores outside the benchmark's scale", () => {
    expect(errorsFor([model({ scores: [{ benchmarkSlug: "quiz", score: 101 }] })])).toEqual([
      "Score 101 is outside the Quiz scale (0 to 100)",
    ]);
  });

  it("rejects mixed pricing units and units that don't fit the model type", () => {
    const errors = errorsFor([
      model({
        offerings: [
          offering(),
          offering({ path: "offerings[1]", providerSlug: "host", pricingUnit: "PER_IMAGE" }),
        ],
      }),
    ]);
    expect(errors).toContain(
      "All offerings of a model must share one pricing unit; found PER_MILLION_TOKENS, PER_IMAGE",
    );
    expect(
      errors.some((e) => e.startsWith("Pricing unit PER_IMAGE doesn't fit a TEXT model")),
    ).toBe(true);
  });

  it("rejects a provider context window larger than the model's", () => {
    expect(errorsFor([model({ offerings: [offering({ contextWindow: 200_000 })] })])).toEqual([
      "Provider context (200000) exceeds the model's own context window (128000)",
    ]);
  });

  it("rejects output prices on embedding models and missing ones on text models", () => {
    expect(
      errorsFor([
        model({ type: "EMBEDDING", outputModalities: [] }),
        model({ slug: "atlas-2", offerings: [offering({ outputPrice: null })] }),
      ]),
    ).toEqual([
      "Embedding models have no output tokens, so no output price",
      "Text model offerings need an output price",
    ]);
  });
});
