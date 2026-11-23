import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { planSync, sameValue } from "./write";

describe("sameValue", () => {
  it("compares Decimal prices numerically", () => {
    expect(sameValue(new Prisma.Decimal("0.1500"), "0.1500")).toBe(true);
    expect(sameValue(new Prisma.Decimal("0.15"), "0.1500")).toBe(true);
    expect(sameValue(new Prisma.Decimal("0.15"), "0.1600")).toBe(false);
  });

  it("compares dates by instant and arrays element by element", () => {
    expect(sameValue(new Date("2025-08-07"), new Date("2025-08-07T00:00:00Z"))).toBe(true);
    expect(sameValue(["TEXT", "IMAGE"], ["TEXT", "IMAGE"])).toBe(true);
    expect(sameValue(["TEXT"], ["TEXT", "IMAGE"])).toBe(false);
  });

  it("treats null and undefined as the same absence", () => {
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(undefined, null)).toBe(true);
    expect(sameValue(null, "x")).toBe(false);
    expect(sameValue("x", null)).toBe(false);
  });
});

describe("planSync", () => {
  const existing = [
    { id: "1", slug: "kept", name: "Kept" },
    { id: "2", slug: "renamed", name: "Old name" },
    { id: "3", slug: "gone", name: "Gone" },
  ];
  const desired = [
    { slug: "kept", name: "Kept" },
    { slug: "renamed", name: "New name" },
    { slug: "new", name: "New" },
  ];

  it("creates new rows, updates changed ones, removes missing ones and skips the rest", () => {
    const plan = planSync(
      existing,
      desired,
      (r) => r.slug,
      (i) => i.slug,
    );
    expect(plan).toEqual({
      create: [{ slug: "new", name: "New" }],
      update: [{ id: "2", data: { slug: "renamed", name: "New name" } }],
      remove: ["3"],
      unchanged: 1,
    });
  });

  it("only compares the fields the desired record carries (e.g. not createdAt)", () => {
    const rows = [{ id: "1", slug: "a", name: "A", createdAt: new Date() }];
    expect(
      planSync(
        rows,
        [{ slug: "a", name: "A" }],
        (r) => r.slug,
        (i) => i.slug,
      ).unchanged,
    ).toBe(1);
  });
});
