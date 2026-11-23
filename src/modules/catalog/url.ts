import { DEFAULT_PAGE_SIZE } from "@/platform/validation";
import { DEFAULT_MODEL_SORT, MODEL_SORTS, type ModelListQuery } from "./schemas";

export function modelHref(id: string): string {
  return `/models/${id}`;
}

export function labHref(slug: string): string {
  return `/labs/${slug}`;
}

export function providerHref(slug: string): string {
  return `/providers/${slug}`;
}

/**
 * Serializes a catalog query back into a /models URL, omitting defaults so links stay short
 * and canonical. The inverse of `parseModelListQuery`.
 */
export function catalogHref(query: Partial<ModelListQuery>, changes: Partial<ModelListQuery> = {}) {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  const list = (key: string, values?: string[]) => {
    if (values?.length) params.set(key, values.map((v) => v.toLowerCase()).join(","));
  };

  if (next.q) params.set("q", next.q);
  list("type", next.type);
  list("capability", next.capability);
  list("input", next.input);
  list("lab", next.lab);
  list("provider", next.provider);
  if (next.openWeights !== undefined) params.set("openWeights", String(next.openWeights));
  if (next.minContext) params.set("minContext", String(next.minContext));
  if (next.maxPrice !== undefined) params.set("maxPrice", String(next.maxPrice));
  if (next.includeDeprecated) params.set("includeDeprecated", "true");
  const sort = next.sort ?? DEFAULT_MODEL_SORT;
  if (sort !== DEFAULT_MODEL_SORT) params.set("sort", sort);
  if (next.order && next.order !== MODEL_SORTS[sort].defaultOrder) params.set("order", next.order);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.pageSize && next.pageSize !== DEFAULT_PAGE_SIZE)
    params.set("pageSize", String(next.pageSize));

  const search = params.toString();
  return search ? `/models?${search}` : "/models";
}

/** Clicking a column header: same column toggles the direction, a new column starts at its default. */
export function sortHref(query: ModelListQuery, sort: keyof typeof MODEL_SORTS): string {
  const currentOrder = query.order ?? MODEL_SORTS[query.sort].defaultOrder;
  const order =
    query.sort === sort
      ? currentOrder === "asc"
        ? "desc"
        : "asc"
      : MODEL_SORTS[sort].defaultOrder;
  return catalogHref(query, { sort, order, page: 1 });
}
