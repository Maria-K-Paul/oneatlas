import { compareQuerySchema, getComparison } from "@/modules/compare/server";
import { ValidationError, withApiHandler } from "@/platform/http";
import { searchParamsToRecord } from "@/platform/validation";

/** GET /api/v1/compare?models=openai/gpt-5,anthropic/claude-sonnet-4-5 — 2 to 4 models side by side. */
export const GET = withApiHandler(async (req) => {
  const { models } = compareQuerySchema.parse(searchParamsToRecord(req.nextUrl.searchParams));
  if (models.length < 2) {
    throw new ValidationError("Compare needs at least two models", [
      { path: "models", message: 'Pass 2–4 comma-separated ids like "openai/gpt-5"' },
    ]);
  }
  const comparison = await getComparison(models);
  return { data: comparison, meta: { missing: comparison.missing } };
});
