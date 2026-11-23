import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ApiError, type ErrorBody, type ErrorDetail } from "./errors";

/**
 * Catalog data only changes when ingestion runs, so successful GETs are cached at the edge
 * for 5 minutes and may be served stale for an hour while refreshing (docs D15).
 */
export const CACHE_POLICIES = {
  public: "public, s-maxage=300, stale-while-revalidate=3600",
  "no-store": "no-store",
} as const;

export type CachePolicy = keyof typeof CACHE_POLICIES;

/** What a route handler returns. `meta` carries pagination; `status` defaults to 200. */
export type ApiSuccess<T = unknown> = {
  data: T;
  meta?: Record<string, unknown>;
  status?: number;
};

type HandlerContext<P> = { params: Promise<P> };

/**
 * Wraps a Route Handler so it only deals with input and output:
 * - wraps the result in the `{ data, meta }` envelope and sets cache headers
 * - turns Zod errors into 400s and `ApiError`s into their status
 * - logs anything unexpected and returns a generic 500 without a stack trace
 * - lets Next.js control-flow signals through untouched (e.g. `connection()` telling the
 *   prerenderer to defer the route to request time), so they're never mistaken for failures
 */
export function withApiHandler<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: HandlerContext<P>) => Promise<ApiSuccess>,
  { cache = "public" }: { cache?: CachePolicy } = {},
) {
  return async (req: NextRequest, ctx: HandlerContext<P>): Promise<NextResponse> => {
    try {
      const { data, meta, status = 200 } = await handler(req, ctx);
      const body = meta === undefined ? { data } : { data, meta };
      return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": CACHE_POLICIES[status < 400 ? cache : "no-store"] },
      });
    } catch (error) {
      unstable_rethrow(error);
      return errorResponse(error, req);
    }
  };
}

export function errorResponse(error: unknown, req?: NextRequest): NextResponse<ErrorBody> {
  if (error instanceof ZodError) {
    return errorJson(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid request parameters",
      details: zodIssues(error),
    });
  }
  if (error instanceof ApiError) {
    return errorJson(error.status, {
      code: error.code,
      message: error.message,
      ...(error.details?.length ? { details: error.details } : {}),
    });
  }
  console.error(
    `[api] unhandled error${req ? ` on ${req.method} ${req.nextUrl.pathname}` : ""}`,
    error,
  );
  return errorJson(500, {
    code: "INTERNAL_ERROR",
    message: "Something went wrong on our side. Please try again.",
  });
}

export function zodIssues(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}

function errorJson(status: number, error: ErrorBody["error"]): NextResponse<ErrorBody> {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}
