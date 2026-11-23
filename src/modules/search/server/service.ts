import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_CACHE_TAG, modelSummarySelect, toModelSummary } from "@/modules/catalog/server";
import { getDb } from "@/platform/db";
import { toPublicEnum } from "@/platform/validation";
import { byRelevance } from "../relevance";
import type { SearchResults } from "../types";

const LIMITS = { models: 8, labs: 4, providers: 4 };

/**
 * Global search across models, labs and providers. Case-insensitive substring matching backed
 * by trigram indexes (docs D13), then ordered by relevance in code. Deprecated models sink.
 */
export async function searchAll(rawQuery: string): Promise<SearchResults> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const query = rawQuery.trim();
  if (!query) return { query, models: [], labs: [], providers: [] };

  const db = getDb();
  const contains = { contains: query, mode: "insensitive" } as const;
  const [models, labs, providers] = await Promise.all([
    db.model.findMany({
      where: {
        OR: [
          { name: contains },
          { family: contains },
          { slug: contains },
          { lab: { name: contains } },
        ],
      },
      take: 40,
      select: modelSummarySelect,
    }),
    db.lab.findMany({
      where: { OR: [{ name: contains }, { slug: contains }] },
      take: 10,
      select: { slug: true, name: true, _count: { select: { models: true } } },
    }),
    db.provider.findMany({
      where: { OR: [{ name: contains }, { slug: contains }] },
      take: 10,
      select: { slug: true, name: true, kind: true, _count: { select: { offerings: true } } },
    }),
  ]);

  return {
    query,
    models: byRelevance(
      models,
      query,
      (m) => m.name,
      (m) => (m.status === "DEPRECATED" ? 5 : 0),
      // Equally relevant: newest release first, so "claude" leads with the current models.
      (a, b) =>
        (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0) ||
        a.name.localeCompare(b.name),
    )
      .slice(0, LIMITS.models)
      .map(toModelSummary),
    labs: byRelevance(labs, query, (l) => l.name)
      .slice(0, LIMITS.labs)
      .map((l) => ({ slug: l.slug, name: l.name, modelCount: l._count.models })),
    providers: byRelevance(providers, query, (p) => p.name)
      .slice(0, LIMITS.providers)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        kind: toPublicEnum(p.kind),
        offeringCount: p._count.offerings,
      })),
  };
}
