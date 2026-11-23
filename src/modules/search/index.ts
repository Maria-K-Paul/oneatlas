// Client-safe public surface of the search module. Server functions: "@/modules/search/server".

export { CommandMenu } from "./components/command-menu";
export { useSearch } from "./components/use-search";
export { relevance, byRelevance } from "./relevance";
export type { SearchResults } from "./types";
