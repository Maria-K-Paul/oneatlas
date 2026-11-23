import { getProvider } from "@/modules/providers/server";
import { NotFoundError, withApiHandler } from "@/platform/http";

/** GET /api/v1/providers/{slug} — one provider's catalog with prices. */
export const GET = withApiHandler<{ slug: string }>(async (_req, { params }) => {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) throw new NotFoundError(`No provider "${slug}"`);
  return { data: provider };
});
