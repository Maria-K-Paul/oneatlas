import { z } from "zod";
import { BOARDS } from "@/modules/rankings";
import { getBoard } from "@/modules/rankings/server";
import { withApiHandler } from "@/platform/http";
import { searchParamsToRecord } from "@/platform/validation";

const querySchema = z.object({
  board: z.enum(BOARDS.map((b) => b.slug) as [string, ...string[]]).default("overall"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** GET /api/v1/rankings?board=overall&limit=50 */
export const GET = withApiHandler(async (req) => {
  const { board, limit } = querySchema.parse(searchParamsToRecord(req.nextUrl.searchParams));
  const result = (await getBoard(board, limit))!;
  return {
    data: result.rows,
    meta: {
      board: { slug: result.board.slug, title: result.board.title, metric: result.board.metric },
    },
  };
});
