import { describe, expect, it } from "vitest";
import { byRelevance, relevance } from "./relevance";

describe("relevance", () => {
  it("ranks exact, prefix, word-prefix, then substring matches", () => {
    expect(relevance("GPT-5", "gpt-5")).toBe(0);
    expect(relevance("GPT-5 mini", "gpt-5")).toBe(1);
    expect(relevance("Claude Sonnet 4.5", "sonnet")).toBe(2);
    expect(relevance("DeepSeek-R1", "seek")).toBe(3);
    expect(relevance("Claude Opus 4.5", "anthropic")).toBe(4); // matched on lab, not name
  });
});

describe("byRelevance", () => {
  it("sorts by relevance, then alphabetically, applying penalties", () => {
    const models = [
      { name: "Llama 3.3 70B", deprecated: false },
      { name: "Hermes 3 70B", deprecated: false },
      { name: "Llama 4 Scout", deprecated: false },
      { name: "Llama 3.1 8B", deprecated: true },
    ];
    const sorted = byRelevance(
      models,
      "llama",
      (m) => m.name,
      (m) => (m.deprecated ? 5 : 0),
    );
    expect(sorted.map((m) => m.name)).toEqual([
      "Llama 3.3 70B",
      "Llama 4 Scout",
      "Hermes 3 70B",
      "Llama 3.1 8B",
    ]);
  });
});
