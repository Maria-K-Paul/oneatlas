import { NextRequest } from "next/server";
import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./errors";
import { withApiHandler } from "./handler";

const request = () => new NextRequest("http://localhost/api/v1/things");
const ctx = { params: Promise.resolve({}) };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withApiHandler", () => {
  it("wraps data in the envelope and sets edge cache headers", async () => {
    const handler = withApiHandler(async () => ({ data: [1, 2], meta: { total: 2 } }));
    const response = await handler(request(), ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(await response.json()).toEqual({ data: [1, 2], meta: { total: 2 } });
  });

  it("honours a custom status and the no-store policy", async () => {
    const handler = withApiHandler(async () => ({ data: { ok: false }, status: 503 }), {
      cache: "no-store",
    });
    const response = await handler(request(), ctx);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("turns Zod errors into a 400 with field details", async () => {
    const handler = withApiHandler(async () => {
      z.object({ pageSize: z.number().max(100) }).parse({ pageSize: 500 });
      return { data: null };
    });
    const response = await handler(request(), ctx);

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: [{ path: "pageSize", message: expect.any(String) }],
      },
    });
  });

  it("maps ApiErrors to their status", async () => {
    const handler = withApiHandler(async () => {
      throw new NotFoundError("Model not found");
    });
    const response = await handler(request(), ctx);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Model not found" },
    });
  });

  it("hides unexpected errors behind a generic 500 and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiHandler(async () => {
      throw new Error("connection refused at 10.0.0.5:5432");
    });
    const response = await handler(request(), ctx);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
    expect(log).toHaveBeenCalledOnce();
  });
});
