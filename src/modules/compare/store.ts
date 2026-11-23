"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MAX_COMPARE } from "./constants";

export type CompareItem = { id: string; name: string };

type CompareState = {
  items: CompareItem[];
  toggle: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  replace: (items: CompareItem[]) => void;
};

/**
 * The compare selection must survive navigation between pages, so it's the one piece of client
 * state outside the URL (docs D4). Persisted to localStorage; hydration is deferred to
 * <CompareTray> so server and first client render agree.
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      items: [],
      toggle: (item) =>
        set(({ items }) => {
          if (items.some((i) => i.id === item.id))
            return { items: items.filter((i) => i.id !== item.id) };
          if (items.length >= MAX_COMPARE) return { items };
          return { items: [...items, item] };
        }),
      remove: (id) => set(({ items }) => ({ items: items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      replace: (items) => set({ items: items.slice(0, MAX_COMPARE) }),
    }),
    { name: "oneatlas-compare", skipHydration: true },
  ),
);
