import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Capability, Modality, ModelType } from "@/generated/prisma/enums";
import { getDb } from "@/platform/db";
import {
  paginationMeta,
  paginationToSkipTake,
  toPublicEnum,
  type PaginationMeta,
} from "@/platform/validation";
import { CAPABILITY_LABELS, MODALITY_LABELS, MODEL_TYPE_LABELS } from "../labels";
import { MODEL_SORTS, type ModelListQuery } from "../schemas";
import type { CatalogFacets, CatalogStats, ModelDetail, ModelSummary } from "../types";
import { toModelDetail, toModelSummary } from "./dto";
import {
  buildModelOrderBy,
  buildModelWhere,
  modelDetailSelect,
  modelSummarySelect,
} from "./queries";

/**
 * Catalog data only changes when ingestion runs, so every read is cached for hours and tagged,
 * letting a future ingest webhook invalidate it with revalidateTag("catalog") (docs D15).
 * Cached functions return plain DTOs: the cache can't serialize Prisma's Decimal class.
 */
export const CATALOG_CACHE_TAG = "catalog";

const notDeprecated = { status: { not: "DEPRECATED" } } as const;

export async function listModels(
  query: ModelListQuery,
): Promise<{ data: ModelSummary[]; meta: PaginationMeta }> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const db = getDb();
  const where = buildModelWhere(query);
  const [total, rows] = await Promise.all([
    db.model.count({ where }),
    db.model.findMany({
      where,
      orderBy: buildModelOrderBy(query, MODEL_SORTS[query.sort].defaultOrder),
      ...paginationToSkipTake(query),
      select: modelSummarySelect,
    }),
  ]);
  return { data: rows.map(toModelSummary), meta: paginationMeta(query, total) };
}

export async function getModel(lab: string, slug: string): Promise<ModelDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const row = await getDb().model.findFirst({
    where: { slug, lab: { slug: lab } },
    select: modelDetailSelect,
  });
  return row ? toModelDetail(row) : null;
}

/** Several models at once, returned in the order asked for. Unknown ids are skipped. */
export async function getModelsByIds(ids: { lab: string; slug: string }[]): Promise<ModelDetail[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  if (ids.length === 0) return [];
  const rows = await getDb().model.findMany({
    where: { OR: ids.map(({ lab, slug }) => ({ slug, lab: { slug: lab } })) },
    select: modelDetailSelect,
  });
  const byId = new Map(rows.map((row) => [`${row.lab.slug}/${row.slug}`, toModelDetail(row)]));
  return ids.flatMap(({ lab, slug }) => byId.get(`${lab}/${slug}`) ?? []);
}

/** Every model id, for prerendering the model pages at build time. */
export async function listModelIds(): Promise<{ lab: string; model: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const rows = await getDb().model.findMany({
    select: { slug: true, lab: { select: { slug: true } } },
    orderBy: [{ lab: { slug: "asc" } }, { slug: "asc" }],
  });
  return rows.map((row) => ({ lab: row.lab.slug, model: row.slug }));
}

/** Newest models from the same lab, for "More from this lab". */
export async function getRelatedModels(lab: string, excludeSlug: string): Promise<ModelSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const rows = await getDb().model.findMany({
    where: { lab: { slug: lab }, slug: { not: excludeSlug }, ...notDeprecated },
    orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    take: 4,
    select: modelSummarySelect,
  });
  return rows.map(toModelSummary);
}

type ValueCount = { value: string; count: bigint };

/** Filter options with counts, from the database rather than hardcoded lists (docs §7). */
export async function getFacets(): Promise<CatalogFacets> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const db = getDb();
  const [types, labs, providers, capabilities, modalities] = await Promise.all([
    db.model.groupBy({ by: ["type"], where: notDeprecated, _count: { _all: true } }),
    db.lab.findMany({
      select: { slug: true, name: true, _count: { select: { models: { where: notDeprecated } } } },
      orderBy: { name: "asc" },
    }),
    db.provider.findMany({
      select: {
        slug: true,
        name: true,
        _count: { select: { offerings: { where: { model: notDeprecated } } } },
      },
      orderBy: { name: "asc" },
    }),
    db.$queryRaw<ValueCount[]>`
      SELECT unnest("capabilities")::text AS value, COUNT(*) AS count
      FROM "Model" WHERE "status" <> 'DEPRECATED' GROUP BY 1`,
    db.$queryRaw<ValueCount[]>`
      SELECT unnest("inputModalities")::text AS value, COUNT(*) AS count
      FROM "Model" WHERE "status" <> 'DEPRECATED' GROUP BY 1`,
  ]);

  const typeCounts = new Map(types.map((t) => [t.type, t._count._all]));
  const capabilityCounts = new Map(capabilities.map((c) => [c.value, Number(c.count)]));
  const modalityCounts = new Map(modalities.map((m) => [m.value, Number(m.count)]));

  return {
    types: Object.values(ModelType).map((type) => ({
      value: toPublicEnum(type),
      label: MODEL_TYPE_LABELS[toPublicEnum(type)],
      count: typeCounts.get(type) ?? 0,
    })),
    capabilities: Object.values(Capability).map((capability) => ({
      value: toPublicEnum(capability),
      label: CAPABILITY_LABELS[toPublicEnum(capability)],
      count: capabilityCounts.get(capability) ?? 0,
    })),
    inputModalities: Object.values(Modality).map((modality) => ({
      value: toPublicEnum(modality),
      label: MODALITY_LABELS[toPublicEnum(modality)],
      count: modalityCounts.get(modality) ?? 0,
    })),
    labs: labs
      .filter((lab) => lab._count.models > 0)
      .map((lab) => ({ value: lab.slug, label: lab.name, count: lab._count.models })),
    providers: providers
      .filter((provider) => provider._count.offerings > 0)
      .map((p) => ({ value: p.slug, label: p.name, count: p._count.offerings })),
  };
}

/** Headline numbers for the home page. */
export async function getCatalogStats(): Promise<CatalogStats> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const db = getDb();
  const [models, labs, providers, offerings, openWeights, newest, facets] = await Promise.all([
    db.model.count({ where: notDeprecated }),
    db.lab.count(),
    db.provider.count(),
    db.modelOffering.count(),
    db.model.count({ where: { ...notDeprecated, openWeights: true } }),
    db.model.findMany({
      where: notDeprecated,
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      take: 6,
      select: modelSummarySelect,
    }),
    getFacets(),
  ]);
  const textModels = facets.types.find((t) => t.value === "text")?.count ?? 0;

  return {
    models,
    labs,
    providers,
    offerings,
    openWeights,
    capabilityCoverage: facets.capabilities.map((c) => ({
      capability: c.value as CatalogStats["capabilityCoverage"][number]["capability"],
      label: c.label,
      share: textModels ? Math.min(1, c.count / textModels) : 0,
    })),
    newest: newest.map(toModelSummary),
  };
}
