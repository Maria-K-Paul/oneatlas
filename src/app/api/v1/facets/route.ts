import { getFacets } from "@/modules/catalog/server";
import { withApiHandler } from "@/platform/http";

/** GET /api/v1/facets — filter options with counts, so no client hardcodes the lists. */
export const GET = withApiHandler(async () => ({ data: await getFacets() }));
