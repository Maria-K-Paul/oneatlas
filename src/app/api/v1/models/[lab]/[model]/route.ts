import { getModel } from "@/modules/catalog/server";
import { NotFoundError, withApiHandler } from "@/platform/http";

/** GET /api/v1/models/{lab}/{model} — the full record: offerings with prices, and benchmark scores. */
export const GET = withApiHandler<{ lab: string; model: string }>(async (_req, { params }) => {
  const { lab, model } = await params;
  const detail = await getModel(lab, model);
  if (!detail) throw new NotFoundError(`No model "${lab}/${model}"`);
  return { data: detail };
});
