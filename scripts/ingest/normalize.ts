import { Prisma } from "@/generated/prisma/client";
import {
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
import type { RawDataset, RawRecord } from "./adapters/source-adapter";
import { IssueCollector, type Origin } from "./issues";
import {
  rawBenchmarkSchema,
  rawLabSchema,
  rawModelSchema,
  rawProviderSchema,
  type RawOffering,
} from "./raw-schema";
import type {
  NormalizedBenchmark,
  NormalizedDataset,
  NormalizedLab,
  NormalizedModel,
  NormalizedOffering,
  NormalizedProvider,
} from "./types";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/** The database stores prices as DECIMAL(10, 4). */
export const PRICE_DECIMAL_PLACES = 4;

// ───────────────────────── Aliases ─────────────────────────
// Sources describe the same thing in different words. Each map turns accepted spellings
// (lowercase, spaces and hyphens treated as underscores) into the database enum value.

const LAB_KINDS: Record<string, LabKind> = {
  company: LabKind.COMPANY,
  research_institute: LabKind.RESEARCH_INSTITUTE,
  nonprofit: LabKind.RESEARCH_INSTITUTE,
  open_community: LabKind.OPEN_COMMUNITY,
  community: LabKind.OPEN_COMMUNITY,
};

const PROVIDER_KINDS: Record<string, ProviderKind> = {
  first_party: ProviderKind.FIRST_PARTY,
  cloud: ProviderKind.CLOUD,
  inference_platform: ProviderKind.INFERENCE_PLATFORM,
  inference: ProviderKind.INFERENCE_PLATFORM,
  aggregator: ProviderKind.AGGREGATOR,
  router: ProviderKind.AGGREGATOR,
};

const MODEL_TYPES: Record<string, ModelType> = {
  text: ModelType.TEXT,
  chat: ModelType.TEXT,
  llm: ModelType.TEXT,
  embedding: ModelType.EMBEDDING,
  embeddings: ModelType.EMBEDDING,
  image: ModelType.IMAGE,
  image_generation: ModelType.IMAGE,
  video: ModelType.VIDEO,
  speech: ModelType.SPEECH,
  tts: ModelType.SPEECH,
  text_to_speech: ModelType.SPEECH,
  transcription: ModelType.TRANSCRIPTION,
  stt: ModelType.TRANSCRIPTION,
  asr: ModelType.TRANSCRIPTION,
  speech_to_text: ModelType.TRANSCRIPTION,
  reranking: ModelType.RERANKING,
  rerank: ModelType.RERANKING,
};

const MODEL_STATUSES: Record<string, ModelStatus> = {
  active: ModelStatus.ACTIVE,
  ga: ModelStatus.ACTIVE,
  preview: ModelStatus.PREVIEW,
  beta: ModelStatus.PREVIEW,
  experimental: ModelStatus.PREVIEW,
  deprecated: ModelStatus.DEPRECATED,
  legacy: ModelStatus.DEPRECATED,
};

const MODALITIES: Record<string, Modality> = {
  text: Modality.TEXT,
  image: Modality.IMAGE,
  vision: Modality.IMAGE,
  audio: Modality.AUDIO,
  speech: Modality.AUDIO,
  video: Modality.VIDEO,
  file: Modality.FILE,
  pdf: Modality.FILE,
  document: Modality.FILE,
};

const CAPABILITIES: Record<string, Capability> = {
  tools: Capability.TOOL_CALLING,
  tool_calling: Capability.TOOL_CALLING,
  function_calling: Capability.TOOL_CALLING,
  json: Capability.STRUCTURED_OUTPUT,
  json_mode: Capability.STRUCTURED_OUTPUT,
  structured_output: Capability.STRUCTURED_OUTPUT,
  structured_outputs: Capability.STRUCTURED_OUTPUT,
  reasoning: Capability.REASONING,
  thinking: Capability.REASONING,
  caching: Capability.PROMPT_CACHING,
  prompt_caching: Capability.PROMPT_CACHING,
  fine_tuning: Capability.FINE_TUNING,
  finetuning: Capability.FINE_TUNING,
  web_search: Capability.WEB_SEARCH,
  search: Capability.WEB_SEARCH,
  grounding: Capability.WEB_SEARCH,
};

const BENCHMARK_CATEGORIES: Record<string, BenchmarkCategory> = Object.fromEntries(
  Object.values(BenchmarkCategory).map((value) => [value.toLowerCase(), value]),
);

const SCORE_UNITS: Record<string, ScoreUnit> = {
  percent: ScoreUnit.PERCENT,
  percentage: ScoreUnit.PERCENT,
  elo: ScoreUnit.ELO,
  points: ScoreUnit.POINTS,
};

/** Non-token price units, and how to convert each into the unit we store. */
const PRICE_UNITS: Record<
  string,
  { pricingUnit: PricingUnit; convert: (price: Decimal) => Decimal }
> = {
  image: { pricingUnit: PricingUnit.PER_IMAGE, convert: (p) => p },
  second: { pricingUnit: PricingUnit.PER_MINUTE, convert: (p) => p.mul(60) },
  minute: { pricingUnit: PricingUnit.PER_MINUTE, convert: (p) => p },
  hour: { pricingUnit: PricingUnit.PER_MINUTE, convert: (p) => p.div(60) },
  "1k_chars": { pricingUnit: PricingUnit.PER_MILLION_CHARACTERS, convert: (p) => p.mul(1_000) },
  "1m_chars": { pricingUnit: PricingUnit.PER_MILLION_CHARACTERS, convert: (p) => p },
  "1k_searches": { pricingUnit: PricingUnit.PER_THOUSAND_SEARCHES, convert: (p) => p },
};

function aliasKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function mapAlias<T extends string>(
  map: Record<string, T>,
  value: string,
  report: (message: string) => void,
  what: string,
): T | undefined {
  const mapped = map[aliasKey(value)];
  if (mapped === undefined) {
    const accepted = [...new Set(Object.keys(map))].join(", ");
    report(`Unknown ${what} "${value}". Accepted values: ${accepted}`);
  }
  return mapped;
}

function mapAliasList<T extends string>(
  map: Record<string, T>,
  values: string[],
  report: (index: number, message: string) => void,
  what: string,
): T[] {
  const mapped = values.flatMap((value, index) => {
    const result = mapAlias(map, value, (message) => report(index, message), what);
    return result === undefined ? [] : [result];
  });
  return [...new Set(mapped)];
}

// ───────────────────────── Value parsers ─────────────────────────

/** "GPT-5.1 mini" → "gpt-5-1-mini". Accents are folded, other symbols become hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 131072 → 131072, "128K" → 128000, "1.05M" → 1050000. Decimal K/M, as vendors write them. */
export function parseTokenCount(value: number | string): number | undefined {
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : undefined;
  const match = /^(\d+(?:\.\d+)?)\s*([kKmM]?)$/.exec(value.trim());
  if (!match) return undefined;
  const [, amount, suffix] = match;
  const multiplier = { k: 1_000, m: 1_000_000 }[suffix!.toLowerCase()] ?? 1;
  const tokens = Math.round(Number(amount) * multiplier);
  return tokens > 0 ? tokens : undefined;
}

/** "2025-08-07" → that date at UTC midnight; "2025-08" → 2025-08-01. Rejects impossible dates. */
export function parseCalendarDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3] ?? "1");
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : undefined;
}

export type ConvertedPrice = {
  pricingUnit: PricingUnit;
  input: Decimal;
  output: Decimal | null;
  cachedInput: Decimal | null;
};

/**
 * Converts any of the four source price forms into USD per stored unit.
 * Uses decimal arithmetic: "0.00000125" per token × 1,000,000 is exactly 1.25.
 */
export function convertOfferingPrice(offering: RawOffering): ConvertedPrice | { error: string } {
  const perMillion = (value: string | number | undefined, factor: number) =>
    value === undefined ? null : new Decimal(value).mul(factor);

  if (offering.unit !== undefined && offering.price !== undefined) {
    const unit = PRICE_UNITS[aliasKey(offering.unit)];
    if (!unit) {
      return {
        error: `Unknown price unit "${offering.unit}". Accepted values: ${Object.keys(PRICE_UNITS)
          .map((key) => key.replace("_", "-"))
          .join(", ")}`,
      };
    }
    return {
      pricingUnit: unit.pricingUnit,
      input: unit.convert(new Decimal(offering.price)),
      output: null,
      cachedInput: null,
    };
  }

  const [prices, factor] = offering.pricePer1K
    ? [offering.pricePer1K, 1_000]
    : offering.pricePerToken
      ? [offering.pricePerToken, 1_000_000]
      : [offering, 1];

  if (prices.input === undefined) return { error: "Missing input price" };

  return {
    pricingUnit: PricingUnit.PER_MILLION_TOKENS,
    input: perMillion(prices.input, factor)!,
    output: perMillion(prices.output, factor),
    cachedInput: perMillion(prices.cachedInput, factor),
  };
}

/** Rounds to the stored precision; reports when that changes the value. */
function toStoredPrice(value: Decimal, onRounded: (from: string, to: string) => void): string {
  const rounded = value.toDecimalPlaces(PRICE_DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  if (!rounded.equals(value)) onRounded(value.toString(), rounded.toString());
  return rounded.toFixed(PRICE_DECIMAL_PLACES);
}

// ───────────────────────── Records ─────────────────────────

function originOf(record: RawRecord, label?: unknown): Origin {
  const name = typeof label === "string" && label ? ` ${label}` : "";
  return { file: record.file, record: `[${record.index}]${name}` };
}

function labelOf(value: unknown, key: "name" | "slug"): unknown {
  return value && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function normalizeLab(record: RawRecord, issues: IssueCollector): NormalizedLab | undefined {
  const origin = originOf(record, labelOf(record.value, "slug"));
  const parsed = rawLabSchema.safeParse(record.value);
  if (!parsed.success) return void issues.fromZod(origin, parsed.error);
  const lab = parsed.data;

  const kind = mapAlias(LAB_KINDS, lab.kind, (m) => issues.error(origin, "kind", m), "lab kind");
  if (!kind) return undefined;

  return {
    origin,
    slug: lab.slug,
    name: lab.name,
    kind,
    description: lab.description ?? null,
    website: lab.website ?? null,
    headquarters: lab.headquarters ?? null,
    foundedYear: lab.foundedYear ?? null,
    logoUrl: lab.logoUrl ?? null,
  };
}

function normalizeProvider(
  record: RawRecord,
  issues: IssueCollector,
): NormalizedProvider | undefined {
  const origin = originOf(record, labelOf(record.value, "slug"));
  const parsed = rawProviderSchema.safeParse(record.value);
  if (!parsed.success) return void issues.fromZod(origin, parsed.error);
  const provider = parsed.data;

  const kind = mapAlias(
    PROVIDER_KINDS,
    provider.kind,
    (m) => issues.error(origin, "kind", m),
    "provider kind",
  );
  if (!kind) return undefined;

  return {
    origin,
    slug: provider.slug,
    name: provider.name,
    kind,
    labSlug: provider.lab ?? null,
    description: provider.description ?? null,
    website: provider.website ?? null,
    docsUrl: provider.docsUrl ?? null,
    logoUrl: provider.logoUrl ?? null,
  };
}

function normalizeBenchmark(
  record: RawRecord,
  issues: IssueCollector,
): NormalizedBenchmark | undefined {
  const origin = originOf(record, labelOf(record.value, "slug"));
  const parsed = rawBenchmarkSchema.safeParse(record.value);
  if (!parsed.success) return void issues.fromZod(origin, parsed.error);
  const benchmark = parsed.data;

  const category = mapAlias(
    BENCHMARK_CATEGORIES,
    benchmark.category,
    (m) => issues.error(origin, "category", m),
    "benchmark category",
  );
  const unit = mapAlias(
    SCORE_UNITS,
    benchmark.unit,
    (m) => issues.error(origin, "unit", m),
    "score unit",
  );
  if (!category || !unit) return undefined;

  // Percent scores have a natural 0–100 scale; other units are bounded by the data unless given.
  const isPercent = unit === ScoreUnit.PERCENT;
  return {
    origin,
    slug: benchmark.slug,
    name: benchmark.name,
    category,
    unit,
    higherIsBetter: benchmark.higherIsBetter ?? true,
    minScore: benchmark.minScore ?? (isPercent ? 0 : null),
    maxScore: benchmark.maxScore ?? (isPercent ? 100 : null),
    description: benchmark.description ?? null,
    sourceUrl: benchmark.sourceUrl ?? null,
  };
}

function normalizeOffering(
  offering: RawOffering,
  path: string,
  origin: Origin,
  issues: IssueCollector,
): NormalizedOffering | undefined {
  const converted = convertOfferingPrice(offering);
  if ("error" in converted) return void issues.error(origin, path, converted.error);

  const warnRounded = (field: string) => (from: string, to: string) =>
    issues.warn(
      origin,
      `${path}.${field}`,
      `Price ${from} rounded to ${to} (database keeps ${PRICE_DECIMAL_PLACES} decimal places)`,
    );

  return {
    path,
    providerSlug: offering.provider,
    providerModelId: offering.id,
    pricingUnit: converted.pricingUnit,
    inputPrice: toStoredPrice(converted.input, warnRounded("input")),
    outputPrice: converted.output && toStoredPrice(converted.output, warnRounded("output")),
    cachedInputPrice:
      converted.cachedInput && toStoredPrice(converted.cachedInput, warnRounded("cachedInput")),
    contextWindow:
      offering.context === undefined ? null : (parseTokenCount(offering.context) ?? null),
    maxOutputTokens:
      offering.maxOutput === undefined ? null : (parseTokenCount(offering.maxOutput) ?? null),
    quantization: offering.quantization ?? null,
    throughputTps: offering.tps ?? null,
    latencyMs: offering.ttftMs ?? null,
  };
}

function normalizeModel(
  record: RawRecord & { labSlug: string },
  issues: IssueCollector,
): NormalizedModel | undefined {
  const origin = originOf(record, labelOf(record.value, "name"));
  const parsed = rawModelSchema.safeParse(record.value);
  if (!parsed.success) return void issues.fromZod(origin, parsed.error);
  const model = parsed.data;
  const errorsBefore = issues.errors.length;
  const at = (path: string) => (message: string) => issues.error(origin, path, message);

  const type = mapAlias(MODEL_TYPES, model.type, at("type"), "model type");
  const status = model.status
    ? mapAlias(MODEL_STATUSES, model.status, at("status"), "model status")
    : ModelStatus.ACTIVE;
  const inputModalities = mapAliasList(
    MODALITIES,
    model.input,
    (i, m) => at(`input[${i}]`)(m),
    "modality",
  );
  const outputModalities = mapAliasList(
    MODALITIES,
    model.output,
    (i, m) => at(`output[${i}]`)(m),
    "modality",
  );
  const capabilities = mapAliasList(
    CAPABILITIES,
    model.capabilities,
    (i, m) => at(`capabilities[${i}]`)(m),
    "capability",
  );

  const releaseDate = model.released ? parseCalendarDate(model.released) : null;
  if (releaseDate === undefined) at("released")(`"${model.released}" is not a real calendar date`);
  const knowledgeCutoff = model.knowledgeCutoff ? parseCalendarDate(model.knowledgeCutoff) : null;
  if (knowledgeCutoff === undefined) {
    at("knowledgeCutoff")(`"${model.knowledgeCutoff}" is not a real calendar date`);
  }

  const offerings = model.offerings.flatMap((offering, index) => {
    const normalized = normalizeOffering(offering, `offerings[${index}]`, origin, issues);
    return normalized ? [normalized] : [];
  });

  if (issues.errors.length > errorsBefore || !type || !status) return undefined;

  return {
    origin,
    labSlug: record.labSlug,
    slug: model.slug ?? slugify(model.name),
    name: model.name,
    family: model.family ?? null,
    type,
    status,
    description: model.description ?? null,
    releaseDate: releaseDate ?? null,
    knowledgeCutoff: knowledgeCutoff ?? null,
    contextWindow: model.context === undefined ? null : (parseTokenCount(model.context) ?? null),
    maxOutputTokens:
      model.maxOutput === undefined ? null : (parseTokenCount(model.maxOutput) ?? null),
    parametersB: model.params ?? null,
    openWeights: model.openWeights ?? false,
    license: model.license ?? null,
    inputModalities,
    outputModalities,
    capabilities,
    offerings,
    scores: Object.entries(model.scores).map(([benchmarkSlug, score]) => ({
      benchmarkSlug,
      score,
    })),
  };
}

/** Parses and normalizes every record, collecting all problems instead of stopping at the first. */
export function normalizeDataset(raw: RawDataset, issues: IssueCollector): NormalizedDataset {
  const keep = <T>(items: (T | undefined)[]) =>
    items.filter((item): item is T => item !== undefined);

  return {
    source: raw.source,
    labs: keep(raw.labs.map((record) => normalizeLab(record, issues))),
    providers: keep(raw.providers.map((record) => normalizeProvider(record, issues))),
    benchmarks: keep(raw.benchmarks.map((record) => normalizeBenchmark(record, issues))),
    models: keep(raw.models.map((record) => normalizeModel(record, issues))),
  };
}
