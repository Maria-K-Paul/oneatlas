import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import {
  CATALOG_CACHE_TAG,
  modelSummarySelect,
  toIsoDate,
  toModelSummary,
} from "@/modules/catalog/server";
import { getDb } from "@/platform/db";
import { toPublicEnum } from "@/platform/validation";
import type { LabDetail, LabSummary, PublicLabKind } from "../types";

const labSelect = {
  slug: true,
  name: true,
  kind: true,
  headquarters: true,
  foundedYear: true,
  website: true,
  description: true,
  models: {
    where: { status: { not: "DEPRECATED" } },
    select: { slug: true, name: true, releaseDate: true, openWeights: true },
    orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
  },
} satisfies Prisma.LabSelect;

type LabRow = {
  slug: string;
  name: string;
  kind: string;
  headquarters: string | null;
  foundedYear: number | null;
  website: string | null;
  description: string | null;
  models: { slug: string; name: string; releaseDate: Date | null; openWeights: boolean }[];
};

function toLabSummary(lab: LabRow): LabSummary {
  const latest = lab.models.find((m) => m.releaseDate) ?? lab.models[0];
  return {
    slug: lab.slug,
    name: lab.name,
    kind: toPublicEnum(lab.kind) as PublicLabKind,
    headquarters: lab.headquarters,
    foundedYear: lab.foundedYear,
    website: lab.website,
    description: lab.description,
    modelCount: lab.models.length,
    openWeightsCount: lab.models.filter((m) => m.openWeights).length,
    latestRelease: latest
      ? {
          id: `${lab.slug}/${latest.slug}`,
          name: latest.name,
          releaseDate: toIsoDate(latest.releaseDate),
        }
      : null,
  };
}

export async function listLabs(): Promise<LabSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const labs = await getDb().lab.findMany({ select: labSelect });
  return labs
    .map(toLabSummary)
    .sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name));
}

export async function getLab(slug: string): Promise<LabDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const db = getDb();
  const lab = await db.lab.findUnique({
    where: { slug },
    select: { ...labSelect, providers: { select: { slug: true, name: true }, take: 1 } },
  });
  if (!lab) return null;

  const [models, offerings] = await Promise.all([
    db.model.findMany({
      where: { lab: { slug } },
      orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      select: modelSummarySelect,
    }),
    db.modelOffering.findMany({
      where: { model: { lab: { slug }, status: { not: "DEPRECATED" } } },
      select: { provider: { select: { slug: true, name: true, kind: true } } },
    }),
  ]);

  const providers = new Map<string, LabDetail["providers"][number]>();
  for (const { provider } of offerings) {
    const entry = providers.get(provider.slug) ?? {
      slug: provider.slug,
      name: provider.name,
      kind: toPublicEnum(provider.kind),
      modelCount: 0,
    };
    entry.modelCount++;
    providers.set(provider.slug, entry);
  }

  return {
    ...toLabSummary(lab),
    models: models.map(toModelSummary),
    providers: [...providers.values()].sort(
      (a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name),
    ),
    firstPartyApi: lab.providers[0] ?? null,
  };
}

export async function listLabSlugs(): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);
  return getDb().lab.findMany({ select: { slug: true }, orderBy: { slug: "asc" } });
}
