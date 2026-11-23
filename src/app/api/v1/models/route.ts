import { listModels, modelListQuerySchema } from "@/modules/catalog/server";
import { withApiHandler } from "@/platform/http";
import { searchParamsToRecord } from "@/platform/validation";

/** GET /api/v1/models — search, filter, sort and paginate the catalog (docs §7). */
export const GET = withApiHandler(async (req) => {
  const query = modelListQuerySchema.parse(searchParamsToRecord(req.nextUrl.searchParams));
  return listModels(query);
});
