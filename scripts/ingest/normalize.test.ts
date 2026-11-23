import { describe, expect, it } from "vitest";
import type { RawDataset } from "./adapters/source-adapter";
import { IssueCollector } from "./issues";
import {
  convertOfferingPrice,
  normalizeDataset,
  parseCalendarDate,
  parseTokenCount,
  slugify,
} from "./normalize";
import { rawOfferingSchema } from "./raw-schema";

describe("slugify", () => {
  it.each([
    ["GPT-5.1", "gpt-5-1"],
    ["Claude Sonnet 4.5", "claude-sonnet-4-5"],
    ["FLUX.1 Kontext [pro]", "flux-1-kontext-pro"],
    ["  Qwen3 235B  ", "qwen3-235b"],
    ["Café Model", "cafe-model"],
  ])("%s → %s", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe("parseTokenCount", () => {
  it.each([
    [131072, 131072],
    ["128K", 128_000],
    ["128k", 128_000],
    ["1M", 1_000_000],
    ["1.05M", 1_050_000],
    ["400000", 400_000],
  ])("%s → %s", (input, expected) => {
    expect(parseTokenCount(input)).toBe(expected);
  });

  it.each([0, -5, 1.5, "lots", "12G"])("rejects %s", (input) => {
    expect(parseTokenCount(input)).toBeUndefined();
  });
});

describe("parseCalendarDate", () => {
  it("parses full dates at UTC midnight", () => {
    expect(parseCalendarDate("2025-08-07")?.toISOString()).toBe("2025-08-07T00:00:00.000Z");
  });

  it("treats month precision as the first of the month", () => {
    expect(parseCalendarDate("2024-09")?.toISOString()).toBe("2024-09-01T00:00:00.000Z");
  });

  it.each(["2025-02-30", "2025-13-01", "25-01-01"])("rejects %s", (input) => {
    expect(parseCalendarDate(input)).toBeUndefined();
  });
});

describe("convertOfferingPrice", () => {
  const convert = (raw: Record<string, unknown>) => {
    const result = convertOfferingPrice(
      rawOfferingSchema.parse({ provider: "p", id: "m", ...raw }),
    );
    if ("error" in result) throw new Error(result.error);
    return {
      unit: result.pricingUnit,
      input: result.input.toString(),
      output: result.output?.toString() ?? null,
      cachedInput: result.cachedInput?.toString() ?? null,
    };
  };

  it("keeps USD per 1M tokens as-is", () => {
    expect(convert({ input: 1.25, output: 10, cachedInput: 0.125 })).toEqual({
      unit: "PER_MILLION_TOKENS",
      input: "1.25",
      output: "10",
      cachedInput: "0.125",
    });
  });

  it("converts per-1K prices (AWS, Azure) exactly", () => {
    expect(convert({ pricePer1K: { input: 0.003, output: 0.015 } })).toMatchObject({
      input: "3",
      output: "15",
    });
  });

  it("converts per-token decimal strings (OpenRouter) without float error", () => {
    // 0.00000015 * 1e6 in floating point is 0.15000000000000002
    expect(convert({ pricePerToken: { input: "0.00000015", output: "0.0000006" } })).toMatchObject({
      input: "0.15",
      output: "0.6",
    });
  });

  it.each([
    [{ unit: "image", price: 0.04 }, "PER_IMAGE", "0.04"],
    [{ unit: "second", price: 0.75 }, "PER_MINUTE", "45"],
    [{ unit: "hour", price: 0.6 }, "PER_MINUTE", "0.01"],
    [{ unit: "1k-chars", price: 0.1 }, "PER_MILLION_CHARACTERS", "100"],
    [{ unit: "1k-searches", price: 2 }, "PER_THOUSAND_SEARCHES", "2"],
  ])("converts %o", (raw, unit, input) => {
    expect(convert(raw)).toMatchObject({ unit, input, output: null });
  });

  it("rejects an unknown unit", () => {
    const result = convertOfferingPrice(
      rawOfferingSchema.parse({ provider: "p", id: "m", unit: "fortnight", price: 1 }),
    );
    expect(result).toEqual({ error: expect.stringContaining('Unknown price unit "fortnight"') });
  });
});

describe("rawOfferingSchema", () => {
  it("requires exactly one price form", () => {
    const both = rawOfferingSchema.safeParse({
      provider: "p",
      id: "m",
      input: 1,
      output: 2,
      pricePer1K: { input: 0.001 },
    });
    expect(both.success).toBe(false);

    const none = rawOfferingSchema.safeParse({ provider: "p", id: "m" });
    expect(none.success).toBe(false);
  });

  it("rejects unknown keys, so typos don't pass silently", () => {
    const typo = rawOfferingSchema.safeParse({
      provider: "p",
      id: "m",
      input: 1,
      output: 2,
      contxt: 5,
    });
    expect(typo.success).toBe(false);
  });
});

describe("normalizeDataset", () => {
  const dataset = (model: Record<string, unknown>): RawDataset => ({
    source: "test@1",
    labs: [{ file: "labs.json", index: 0, value: { slug: "acme", name: "Acme", kind: "company" } }],
    providers: [],
    benchmarks: [],
    models: [{ file: "models/acme.json", index: 0, labSlug: "acme", value: model }],
  });

  it("maps aliases to database enums and derives the slug", () => {
    const issues = new IssueCollector();
    const result = normalizeDataset(
      dataset({
        name: "Atlas Large 2.5",
        type: "chat",
        status: "beta",
        input: ["text", "vision", "pdf"],
        output: ["text"],
        capabilities: ["function_calling", "json_mode", "thinking"],
        context: "1M",
      }),
      issues,
    );

    expect(issues.issues).toEqual([]);
    expect(result.models[0]).toMatchObject({
      slug: "atlas-large-2-5",
      type: "TEXT",
      status: "PREVIEW",
      inputModalities: ["TEXT", "IMAGE", "FILE"],
      capabilities: ["TOOL_CALLING", "STRUCTURED_OUTPUT", "REASONING"],
      contextWindow: 1_000_000,
    });
  });

  it("reports unknown values with the accepted list and drops the record", () => {
    const issues = new IssueCollector();
    const result = normalizeDataset(
      dataset({
        name: "Atlas",
        type: "hologram",
        input: ["text"],
        output: ["text"],
        capabilities: ["telepathy"],
      }),
      issues,
    );

    expect(result.models).toHaveLength(0);
    expect(issues.errors.map((i) => [i.path, i.message.split(".")[0]])).toEqual([
      ["type", 'Unknown model type "hologram"'],
      ["capabilities[0]", 'Unknown capability "telepathy"'],
    ]);
    expect(issues.errors[0]).toMatchObject({ file: "models/acme.json", record: "[0] Atlas" });
  });
});
