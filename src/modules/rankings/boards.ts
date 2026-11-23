import type { BenchmarkCategory } from "@/generated/prisma/enums";

export type BoardKind =
  "overall" | "category" | "value" | "cheapest" | "context" | "newest" | "availability";

export type Board = {
  slug: string;
  title: string;
  description: string;
  kind: BoardKind;
  category?: BenchmarkCategory;
  /** Column heading for the ranked value. */
  metric: string;
};

/** Every leaderboard, in display order. The slugs are the /rankings/{board} URLs. */
export const BOARDS: Board[] = [
  {
    slug: "overall",
    title: "Overall",
    kind: "overall",
    metric: "Index",
    description:
      "The average of a model's category indexes. A model needs results in at least three categories to be ranked.",
  },
  {
    slug: "reasoning",
    title: "Reasoning",
    kind: "category",
    category: "REASONING",
    metric: "Index",
    description: "Graduate-level science and frontier-knowledge questions.",
  },
  {
    slug: "coding",
    title: "Coding",
    kind: "category",
    category: "CODING",
    metric: "Index",
    description: "Real-world bug fixing and competitive programming.",
  },
  {
    slug: "math",
    title: "Math",
    kind: "category",
    category: "MATH",
    metric: "Index",
    description: "Competition mathematics.",
  },
  {
    slug: "agentic",
    title: "Agentic",
    kind: "category",
    category: "AGENTIC",
    metric: "Index",
    description: "Multi-step tasks with tools: terminals and customer-service simulations.",
  },
  {
    slug: "knowledge",
    title: "Knowledge",
    kind: "category",
    category: "KNOWLEDGE",
    metric: "Index",
    description: "Broad academic knowledge across many subjects.",
  },
  {
    slug: "multimodal",
    title: "Multimodal",
    kind: "category",
    category: "MULTIMODAL",
    metric: "Index",
    description: "Questions that require understanding images.",
  },
  {
    slug: "long-context",
    title: "Long context",
    kind: "category",
    category: "LONG_CONTEXT",
    metric: "Index",
    description: "Finding and reproducing details hidden in very long inputs.",
  },
  {
    slug: "human-preference",
    title: "Human preference",
    kind: "category",
    category: "HUMAN_PREFERENCE",
    metric: "Index",
    description: "Which answers people prefer in blind, head-to-head votes.",
  },
  {
    slug: "value",
    title: "Best value",
    kind: "value",
    metric: "Index per $",
    description:
      "Overall index divided by blended price per 1M tokens. Free tiers are excluded rather than dividing by zero.",
  },
  {
    slug: "cheapest",
    title: "Cheapest",
    kind: "cheapest",
    metric: "Blended / 1M",
    description: "Lowest blended price per 1M tokens among paid text-model offerings.",
  },
  {
    slug: "longest-context",
    title: "Longest context",
    kind: "context",
    metric: "Context",
    description: "The largest context windows, as published by each lab.",
  },
  {
    slug: "newest",
    title: "Newest",
    kind: "newest",
    metric: "Released",
    description: "The most recent releases of every type.",
  },
  {
    slug: "most-available",
    title: "Most available",
    kind: "availability",
    metric: "Providers",
    description: "How many providers serve the model: the clearest public signal of adoption.",
  },
];

export function findBoard(slug: string): Board | undefined {
  return BOARDS.find((board) => board.slug === slug);
}
