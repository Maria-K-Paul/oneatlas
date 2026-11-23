import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import {
  CATALOG_CACHE_TAG,
  decimalToNumber,
  modelSummarySelect,
  toModelSummary,
} from "@/modules/catalog/server";
import { getDb } from "@/platform/db";
import { toPublicEnum } from "@/platform/validation";
import type { ProviderDetail, ProviderSummary } from "../types";

const providerSelect = {
  slug: true,
  name: true,
  kind: true,
  description: true,
  website: true,
  docsUrl: true,
  lab: { select: { slug: true, name: true } },
  offerings: {
    where: { model: { status: { not: "DEPRECATED" } } },
    select: { model: { select: { lab: { select: { slug: true } } } } },
  },
} satisfies Prisma.ProviderSelect;

type ProviderRow = {
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  website: string | null;
  docsUrl: string | null;
  lab: { slug: string; name: string } | null;
  offerings: { model: { lab: { slug: string } } }[];
};

function toProviderSummary(p: ProviderRow): ProviderSummary {
  return {
    slug: p.slug,
    name: p.name,
    kind: toPublicEnum(p.kind) as ProviderSummary["kind"],
    description: p.description,
    website: p.website,
    docsUrl: p.docsUrl,
    lab: p.lab,
    modelCount: p.offerings.length,
    labCount: new Set(p.offerings.map((o) => o.model.lab.slug)).size,
  };
}

export async function listProviders(): Promise<ProviderSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const providers = await getDb().provider.findMany({ select: providerSelect });
  return providers
    .map(toProviderSummary)
    .sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name));
}

export async function getProvider(slug: string): Promise<ProviderDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const db = getDb();
  const provider = await db.provider.findUnique({ where: { slug }, select: providerSelect });
  if (!provider) return null;

  const offerings = await db.modelOffering.findMany({
    where: { provider: { slug } },
    select: {
      providerModelId: true,
      pricingUnit: true,
      inputPrice: true,
      outputPrice: true,
      cachedInputPrice: true,
      contextWindow: true,
      throughputTps: true,
      model: { select: { ...modelSummarySelect } },
    },
    orderBy: [{ model: { lab: { name: "asc" } } }, { model: { name: "asc" } }],
  });

  return {
    ...toProviderSummary(provider),
    offerings: offerings.map((o) => {
      const model = toModelSummary(o.model);
      const input = o.inputPrice.toNumber();
      return {
        model,
        providerModelId: o.providerModelId,
        pricing: {
          unit: toPublicEnum(o.pricingUnit),
          input,
          output: decimalToNumber(o.outputPrice),
          cachedInput: decimalToNumber(o.cachedInputPrice),
        },
        contextWindow: o.contextWindow ?? model.contextWindow,
        throughputTps: o.throughputTps,
        cheapest: model.providerCount > 1 && model.pricing?.input === input,
      };
    }),
  };
}

export async function listProviderSlugs(): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);
  return getDb().provider.findMany({ select: { slug: true }, orderBy: { slug: "asc" } });
}
