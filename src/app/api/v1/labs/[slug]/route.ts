import { getLab } from "@/modules/labs/server";
import { NotFoundError, withApiHandler } from "@/platform/http";

/** GET /api/v1/labs/{slug} — one lab with its models and the providers that serve them. */
export const GET = withApiHandler<{ slug: string }>(async (_req, { params }) => {
  const { slug } = await params;
  const lab = await getLab(slug);
  if (!lab) throw new NotFoundError(`No lab "${slug}"`);
  return { data: lab };
});
