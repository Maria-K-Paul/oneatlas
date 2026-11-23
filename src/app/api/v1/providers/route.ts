import { listProviders } from "@/modules/providers/server";
import { withApiHandler } from "@/platform/http";

/** GET /api/v1/providers — every provider with model and lab counts. */
export const GET = withApiHandler(async () => ({ data: await listProviders() }));
