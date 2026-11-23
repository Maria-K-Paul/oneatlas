import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDate,
  formatParameters,
  formatPrice,
  formatPriceWithUnit,
  formatTokens,
} from "./index";

describe("formatPrice", () => {
  it.each([
    [0, "Free"],
    [0.075, "$0.075"],
    [0.0375, "$0.0375"],
    [2.5, "$2.50"],
    [15, "$15.00"],
    [null, "—"],
  ])("%s → %s", (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  it("appends the unit", () => {
    expect(formatPriceWithUnit(2.5, "per_million_tokens")).toBe("$2.50 / 1M tokens");
    expect(formatPriceWithUnit(0.04, "per_image")).toBe("$0.04 / image");
    expect(formatPriceWithUnit(0, "per_image")).toBe("Free");
  });
});

describe("formatTokens", () => {
  it.each([
    [128_000, "128K"],
    [131_072, "128K"],
    [1_048_576, "1M"],
    [1_000_000, "1M"],
    [1_050_000, "1.05M"],
    [200_000, "200K"],
    [8191, "8.19K"],
    [512, "512"],
    [null, "—"],
  ])("%s → %s", (value, expected) => {
    expect(formatTokens(value)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("formats calendar dates without shifting by timezone", () => {
    expect(formatDate("2025-08-07T00:00:00.000Z")).toBe("Aug 7, 2025");
  });

  it("handles missing and invalid values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("other formatters", () => {
  it("formats counts and parameter sizes", () => {
    expect(formatCount(8274)).toBe("8,274");
    expect(formatParameters(405)).toBe("405B");
    expect(formatParameters(1000)).toBe("1T");
    expect(formatParameters(3.8)).toBe("3.8B");
    expect(formatParameters(0.5)).toBe("500M");
  });
});
