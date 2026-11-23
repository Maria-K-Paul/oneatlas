import { listBenchmarks } from "@/modules/rankings/server";
import { withApiHandler } from "@/platform/http";

/** GET /api/v1/benchmarks — every benchmark with its top three models. */
export const GET = withApiHandler(async () => ({ data: await listBenchmarks() }));
