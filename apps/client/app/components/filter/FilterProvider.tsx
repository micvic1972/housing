"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_FILTERS, countActiveFilters } from "./filter-config";
import type { FilterKey, Filters, SheetMode } from "./filter-types";
import { isCampusId, type CampusId } from "../../config/campuses";

const CAMPUS_PREFERENCE_KEY = "delta-housing.campus-preference.v1";

type FiltersContextValue = {
  /** What the student has chosen right now. */
  filters: Filters;
  setFilter: <K extends FilterKey>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  campusPreferenceReady: boolean;
  campusPreferenceError: string | null;
  setCampusPreference: (campus: CampusId | null) => boolean;
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
  const [campusPreferenceReady, setCampusPreferenceReady] = useState(false);
  const [campusPreferenceError, setCampusPreferenceError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CAMPUS_PREFERENCE_KEY);
        if (stored && isCampusId(stored)) {
          setFilters((previous) => ({ ...previous, campus: stored }));
        } else if (stored) {
          throw new Error("Campus preference is invalid");
        }
      } catch {
        setCampusPreferenceError(
          "Your campus preference could not be read from this browser.",
        );
      } finally {
        setCampusPreferenceReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const setFilter = useCallback(
    <K extends FilterKey>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setCampusPreference = useCallback((campus: CampusId | null) => {
    try {
      if (campus) {
        window.localStorage.setItem(CAMPUS_PREFERENCE_KEY, campus);
      } else {
        window.localStorage.removeItem(CAMPUS_PREFERENCE_KEY);
      }
    } catch {
      setCampusPreferenceError(
        "Could not save your campus preference on this device.",
      );
      return false;
    }

    setFilters((previous) => ({ ...previous, campus }));
    setCampusPreferenceError(null);
    return true;
  }, []);
  const clearAllFilters = useCallback(() => {
    const cleared = setCampusPreference(null);
    setFilters(EMPTY_FILTERS);
    return cleared;
  }, [setCampusPreference]);
  const openSheet = useCallback((mode: SheetMode) => setSheetMode(mode), []);
  const closeSheet = useCallback(() => setSheetMode(null), []);

  const value = useMemo(
    () => ({
      filters,
      setFilter,
      clearFilters: clearAllFilters,
      campusPreferenceReady,
      campusPreferenceError,
      setCampusPreference,
      activeCount: countActiveFilters(filters),
      sheetMode,
      openSheet,
      closeSheet,
    }),
    [
      filters,
      setFilter,
      clearAllFilters,
      campusPreferenceReady,
      campusPreferenceError,
      setCampusPreference,
      sheetMode,
      openSheet,
      closeSheet,
    ],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}
