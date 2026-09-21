"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EMPTY_FILTERS, countActiveFilters } from "./filter-config";
import type { FilterKey, Filters, SheetMode } from "./filter-types";

type FiltersContextValue = {
  /** What the student has chosen right now. */
  filters: Filters;
  setFilter: <K extends FilterKey>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  activeCount: number;
  /** Which part of the sheet is open, or null when it is closed. */
  sheetMode: SheetMode | null;
  openSheet: (mode: SheetMode) => void;
  closeSheet: () => void;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Holds the filter values AND whether the sheet is open, so the search icon in the tabs,
 * the chips and the sheet can all talk to each other.
 *
 * Wrap it around everything that needs it (usually in the layout, above the tabs and the feed).
 * Today the values live in memory. To put them in the URL later (?budget=lt), change only this file.
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);

  const setFilter = useCallback(<K extends FilterKey>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const openSheet = useCallback((mode: SheetMode) => setSheetMode(mode), []);
  const closeSheet = useCallback(() => setSheetMode(null), []);

  const value = useMemo(
    () => ({
      filters,
      setFilter,
      clearFilters,
      activeCount: countActiveFilters(filters),
      sheetMode,
      openSheet,
      closeSheet,
    }),
    [filters, setFilter, clearFilters, sheetMode, openSheet, closeSheet],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}