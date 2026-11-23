import { z } from "zod";
import { searchAll } from "@/modules/search/server";
import { withApiHandler } from "@/platform/http";

const querySchema = z.object({
  q: z.string().trim().max(100, "Search text can be at most 100 characters").default(""),
});

/** GET /api/v1/search?q=claude — models, labs and providers, ranked by relevance. */
export const GET = withApiHandler(async (req) => {
  const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q") ?? undefined });
  return { data: await searchAll(q) };
});
