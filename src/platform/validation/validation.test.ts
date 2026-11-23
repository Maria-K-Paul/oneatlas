import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  booleanParam,
  csvList,
  paginationMeta,
  paginationSchema,
  paginationToSkipTake,
  publicEnum,
  searchParamsToRecord,
  searchTextParam,
} from "./index";

describe("searchParamsToRecord", () => {
  it("joins repeated keys so ?a=1&a=2 equals ?a=1,2", () => {
    expect(searchParamsToRecord(new URLSearchParams("lab=a&lab=b&q=x"))).toEqual({
      lab: "a,b",
      q: "x",
    });
    expect(searchParamsToRecord({ lab: ["a", "b"], q: "x", empty: undefined })).toEqual({
      lab: "a,b",
      q: "x",
    });
  });
});

describe("csvList", () => {
  const schema = csvList(z.enum(["a", "b", "c"]), { max: 2 });

  it("splits, trims and de-duplicates", () => {
    expect(schema.parse(" a, b ,a,")).toEqual(["a", "b"]);
  });

  it("treats empty input as absent", () => {
    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse(" , ")).toBeUndefined();
  });

  it("rejects unknown items and overly long lists", () => {
    expect(schema.safeParse("a,z").success).toBe(false);
    expect(schema.safeParse("a,b,c").success).toBe(false);
  });
});

describe("scalar params", () => {
  it("parses booleans", () => {
    expect(booleanParam.parse("true")).toBe(true);
    expect(booleanParam.parse("0")).toBe(false);
    expect(booleanParam.safeParse("yes").success).toBe(false);
  });

  it("trims search text and caps its length", () => {
    expect(searchTextParam.parse("  claude ")).toBe("claude");
    expect(searchTextParam.parse("   ")).toBeUndefined();
    expect(searchTextParam.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("pagination", () => {
  it("applies defaults and caps page size at 100", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 24 });
    expect(paginationSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("computes skip/take and totals", () => {
    expect(paginationToSkipTake({ page: 3, pageSize: 24 })).toEqual({ skip: 48, take: 24 });
    expect(paginationMeta({ page: 1, pageSize: 24 }, 81)).toEqual({
      page: 1,
      pageSize: 24,
      total: 81,
      totalPages: 4,
    });
    expect(paginationMeta({ page: 1, pageSize: 24 }, 0).totalPages).toBe(1);
  });
});

describe("publicEnum", () => {
  const Capability = { TOOL_CALLING: "TOOL_CALLING", REASONING: "REASONING" } as const;
  const capability = publicEnum(Capability);

  it("exposes lower_snake public values and maps them back", () => {
    expect(capability.values).toEqual(["tool_calling", "reasoning"]);
    expect(capability.schema.parse("tool_calling")).toBe("TOOL_CALLING");
    expect(capability.schema.parse("REASONING")).toBe("REASONING");
    expect(capability.toPublic("TOOL_CALLING")).toBe("tool_calling");
  });

  it("lists the allowed values when one is unknown", () => {
    const result = capability.schema.safeParse("telepathy");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Expected one of: tool_calling, reasoning");
  });
});
