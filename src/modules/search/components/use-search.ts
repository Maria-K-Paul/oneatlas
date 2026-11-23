"use client";

import { useEffect, useState } from "react";
import type { SearchResults } from "../types";

type Settled = { query: string; results: SearchResults | null; error: boolean };

/**
 * Debounced search against GET /api/v1/search. Each new query aborts the previous request, so a
 * slow response for "cl" can never overwrite the results for "claude". While a new query loads,
 * the previous results stay on screen.
 */
export function useSearch(query: string, { delayMs = 150 } = {}) {
  const q = query.trim();
  const [settled, setSettled] = useState<Settled>({ query: "", results: null, error: false });

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data: SearchResults };
        setSettled({ query: q, results: body.data, error: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[search]", error);
        setSettled({ query: q, results: null, error: true });
      }
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, delayMs]);

  if (!q) return { results: null, loading: false, error: false };
  const loading = settled.query !== q;
  return { results: settled.results, loading, error: !loading && settled.error };
}
