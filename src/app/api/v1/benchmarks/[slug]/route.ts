import { getBenchmark } from "@/modules/rankings/server";
import { NotFoundError, withApiHandler } from "@/platform/http";

/** GET /api/v1/benchmarks/{slug} — one benchmark's full leaderboard. */
export const GET = withApiHandler<{ slug: string }>(async (_req, { params }) => {
  const { slug } = await params;
  const benchmark = await getBenchmark(slug);
  if (!benchmark) throw new NotFoundError(`No benchmark "${slug}"`);
  return { data: benchmark };
});
