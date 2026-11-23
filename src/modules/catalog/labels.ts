import type {
  PublicBenchmarkCategory,
  PublicCapability,
  PublicModality,
  PublicModelStatus,
  PublicModelType,
  PublicProviderKind,
} from "./types";

/** Display names for enum values. One place, so every page says the same thing. */

export const MODEL_TYPE_LABELS: Record<PublicModelType, string> = {
  text: "Text",
  embedding: "Embedding",
  image: "Image",
  video: "Video",
  speech: "Speech",
  transcription: "Transcription",
  reranking: "Reranking",
};

export const MODEL_STATUS_LABELS: Record<PublicModelStatus, string> = {
  active: "Active",
  preview: "Preview",
  deprecated: "Deprecated",
};

export const CAPABILITY_LABELS: Record<PublicCapability, string> = {
  tool_calling: "Tool calling",
  structured_output: "Structured output",
  reasoning: "Reasoning",
  prompt_caching: "Prompt caching",
  fine_tuning: "Fine-tuning",
  web_search: "Web search",
};

export const MODALITY_LABELS: Record<PublicModality, string> = {
  text: "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
  file: "Files",
};

export const PROVIDER_KIND_LABELS: Record<PublicProviderKind, string> = {
  first_party: "First-party API",
  cloud: "Cloud platform",
  inference_platform: "Inference platform",
  aggregator: "Aggregator",
};

export const BENCHMARK_CATEGORY_LABELS: Record<PublicBenchmarkCategory, string> = {
  reasoning: "Reasoning",
  knowledge: "Knowledge",
  coding: "Coding",
  math: "Math",
  agentic: "Agentic",
  multimodal: "Multimodal",
  long_context: "Long context",
  human_preference: "Human preference",
};
