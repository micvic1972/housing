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

const STORAGE_KEY = "delta-housing.saved-listings.v1";

type SavedListingsValue = {
  savedIds: ReadonlySet<string>;
  ready: boolean;
  error: string | null;
  toggleSaved: (id: string) => boolean;
  removeSaved: (id: string) => boolean;
};

const SavedListingsContext = createContext<SavedListingsValue | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (
            !Array.isArray(parsed) ||
            parsed.some((id) => typeof id !== "string")
          ) {
            throw new Error("Saved listing data is invalid");
          }
          setSavedIds(new Set(parsed));
        }
      } catch {
        setError("Saved places could not be read from this browser.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const updateSaved = useCallback(
    (id: string, shouldSave: boolean): boolean => {
      if (!ready) return false;

      const next = new Set(savedIds);
      if (shouldSave) next.add(id);
      else next.delete(id);

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        setError("Could not save this place on this device.");
        return false;
      }

      setSavedIds(next);
      setError(null);
      return true;
    },
    [ready, savedIds],
  );

  const toggleSaved = useCallback(
    (id: string) => updateSaved(id, !savedIds.has(id)),
    [savedIds, updateSaved],
  );
  const removeSaved = useCallback(
    (id: string) => updateSaved(id, false),
    [updateSaved],
  );

  const value = useMemo(
    () => ({ savedIds, ready, error, toggleSaved, removeSaved }),
    [savedIds, ready, error, toggleSaved, removeSaved],
  );

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings(): SavedListingsValue {
  const context = useContext(SavedListingsContext);
  if (!context) {
    throw new Error("useSavedListings must be used inside SavedListingsProvider");
  }
  return context;
}
