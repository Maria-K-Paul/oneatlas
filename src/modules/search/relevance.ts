/**
 * Orders search hits the way people expect (docs D13): an exact name match first, then names
 * that start with the query, then names containing a word that starts with it, then any
 * other match (e.g. on the lab name). Ties keep alphabetical order.
 */
export function relevance(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 4;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(/[\s\-_.:/()[\]]+/).some((word) => word.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  return 4;
}

export function byRelevance<T>(
  items: T[],
  query: string,
  name: (item: T) => string,
  penalty?: (item: T) => number,
  /** Orders equally relevant items; defaults to alphabetical. */
  tieBreak: (a: T, b: T) => number = (a, b) => name(a).localeCompare(name(b)),
): T[] {
  return [...items]
    .map((item) => ({ item, score: relevance(name(item), query) + (penalty?.(item) ?? 0) }))
    .sort((a, b) => a.score - b.score || tieBreak(a.item, b.item))
    .map(({ item }) => item);
}
