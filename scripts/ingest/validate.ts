import { ModelType, PricingUnit, ScoreUnit } from "@/generated/prisma/enums";
import type { IssueCollector, Origin } from "./issues";
import type { NormalizedDataset } from "./types";

/** Which price units make sense for each kind of model. Catches e.g. a $/image price on a chat model. */
const ALLOWED_PRICING_UNITS: Record<ModelType, PricingUnit[]> = {
  TEXT: [PricingUnit.PER_MILLION_TOKENS],
  EMBEDDING: [PricingUnit.PER_MILLION_TOKENS],
  IMAGE: [PricingUnit.PER_IMAGE, PricingUnit.PER_MILLION_TOKENS],
  VIDEO: [PricingUnit.PER_MINUTE],
  SPEECH: [PricingUnit.PER_MILLION_CHARACTERS, PricingUnit.PER_MINUTE],
  TRANSCRIPTION: [PricingUnit.PER_MINUTE, PricingUnit.PER_MILLION_TOKENS],
  RERANKING: [PricingUnit.PER_THOUSAND_SEARCHES, PricingUnit.PER_MILLION_TOKENS],
};

/** Score ranges outside these bounds are almost certainly typos. */
const SCORE_BOUNDS: Record<ScoreUnit, [number, number] | null> = {
  PERCENT: [0, 100],
  ELO: [100, 4000],
  POINTS: null, // bounded by the benchmark's own minScore/maxScore
};

function findDuplicates<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return new Map([...groups].filter(([, group]) => group.length > 1));
}

/**
 * Checks that need the whole dataset: references between records, uniqueness,
 * consistent units and plausible values. Runs after per-record normalization.
 */
export function validateDataset(data: NormalizedDataset, issues: IssueCollector): void {
  const labSlugs = new Set(data.labs.map((lab) => lab.slug));
  const providerSlugs = new Set(data.providers.map((provider) => provider.slug));
  const benchmarks = new Map(data.benchmarks.map((benchmark) => [benchmark.slug, benchmark]));

  const reportDuplicates = <T extends { origin: Origin }>(
    items: T[],
    key: (item: T) => string,
    what: string,
  ) => {
    for (const [value, group] of findDuplicates(items, key)) {
      for (const item of group.slice(1)) {
        issues.error(
          item.origin,
          "slug",
          `Duplicate ${what} "${value}" (first defined in ${group[0]!.origin.file} ${group[0]!.origin.record})`,
        );
      }
    }
  };

  reportDuplicates(data.labs, (lab) => lab.slug, "lab slug");
  reportDuplicates(data.providers, (provider) => provider.slug, "provider slug");
  reportDuplicates(data.benchmarks, (benchmark) => benchmark.slug, "benchmark slug");
  reportDuplicates(data.models, (model) => `${model.labSlug}/${model.slug}`, "model id");

  for (const provider of data.providers) {
    if (provider.labSlug && !labSlugs.has(provider.labSlug)) {
      issues.error(provider.origin, "lab", `Unknown lab "${provider.labSlug}"`);
    }
  }

  for (const model of data.models) {
    const { origin } = model;

    if (!labSlugs.has(model.labSlug)) {
      issues.error(
        origin,
        "",
        `Models file belongs to unknown lab "${model.labSlug}" (add it to labs.json)`,
      );
    }

    if (
      model.contextWindow &&
      model.maxOutputTokens &&
      model.maxOutputTokens > model.contextWindow
    ) {
      issues.error(
        origin,
        "maxOutput",
        `Max output (${model.maxOutputTokens}) exceeds the context window (${model.contextWindow})`,
      );
    }

    if (model.type === ModelType.TEXT && model.outputModalities.length === 0) {
      issues.error(origin, "output", "Text models must list at least one output modality");
    }

    // Offerings
    const units = new Set(model.offerings.map((offering) => offering.pricingUnit));
    if (units.size > 1) {
      issues.error(
        origin,
        "offerings",
        `All offerings of a model must share one pricing unit; found ${[...units].join(", ")}`,
      );
    }

    const seenProviders = new Set<string>();
    for (const offering of model.offerings) {
      const path = offering.path;
      if (!providerSlugs.has(offering.providerSlug)) {
        issues.error(origin, `${path}.provider`, `Unknown provider "${offering.providerSlug}"`);
      }
      if (seenProviders.has(offering.providerSlug)) {
        issues.error(
          origin,
          `${path}.provider`,
          `Provider "${offering.providerSlug}" is listed twice for this model`,
        );
      }
      seenProviders.add(offering.providerSlug);

      if (!ALLOWED_PRICING_UNITS[model.type].includes(offering.pricingUnit)) {
        issues.error(
          origin,
          path,
          `Pricing unit ${offering.pricingUnit} doesn't fit a ${model.type} model (allowed: ${ALLOWED_PRICING_UNITS[model.type].join(", ")})`,
        );
      }
      if (model.type === ModelType.EMBEDDING && offering.outputPrice !== null) {
        issues.error(
          origin,
          `${path}.output`,
          "Embedding models have no output tokens, so no output price",
        );
      }
      if (model.type === ModelType.TEXT && offering.outputPrice === null) {
        issues.error(origin, `${path}.output`, "Text model offerings need an output price");
      }
      if (
        offering.cachedInputPrice !== null &&
        Number(offering.cachedInputPrice) > Number(offering.inputPrice)
      ) {
        issues.error(
          origin,
          `${path}.cachedInput`,
          "Cached input price is higher than the regular input price",
        );
      }
      if (
        offering.contextWindow &&
        model.contextWindow &&
        offering.contextWindow > model.contextWindow
      ) {
        issues.error(
          origin,
          `${path}.context`,
          `Provider context (${offering.contextWindow}) exceeds the model's own context window (${model.contextWindow})`,
        );
      }
    }

    // Scores
    for (const { benchmarkSlug, score } of model.scores) {
      const path = `scores.${benchmarkSlug}`;
      const benchmark = benchmarks.get(benchmarkSlug);
      if (!benchmark) {
        issues.error(
          origin,
          path,
          `Unknown benchmark "${benchmarkSlug}" (add it to benchmarks.json)`,
        );
        continue;
      }
      const [min, max] = SCORE_BOUNDS[benchmark.unit] ?? [benchmark.minScore, benchmark.maxScore];
      if ((min !== null && score < min) || (max !== null && score > max)) {
        issues.error(
          origin,
          path,
          `Score ${score} is outside the ${benchmark.name} scale (${min ?? "−∞"} to ${max ?? "∞"})`,
        );
      }
    }

    if (model.type !== ModelType.TEXT && model.scores.length > 0) {
      issues.warn(
        origin,
        "scores",
        `Benchmark scores on a ${model.type} model; the rankings only use text models`,
      );
    }
  }
}
