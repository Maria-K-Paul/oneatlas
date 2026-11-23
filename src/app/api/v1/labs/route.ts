import { listLabs } from "@/modules/labs/server";
import { withApiHandler } from "@/platform/http";

/** GET /api/v1/labs — every lab with model counts and its latest release. */
export const GET = withApiHandler(async () => ({ data: await listLabs() }));
