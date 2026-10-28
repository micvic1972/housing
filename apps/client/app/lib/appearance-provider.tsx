"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "delta-housing.appearance.v1";

export type AppearanceMode = "system" | "light" | "dark";
export type AppearanceAccent = "blue" | "terracotta";

type AppearancePreferences = {
  mode: AppearanceMode;
  accent: AppearanceAccent;
};

type AppearanceContextValue = {
  preferences: AppearancePreferences;
  ready: boolean;
  error: string | null;
  setMode: (mode: AppearanceMode) => void;
  setAccent: (accent: AppearanceAccent) => void;
};

type AppearanceSnapshot = {
  preferences: AppearancePreferences;
  ready: boolean;
  error: string | null;
  needsMigration: boolean;
};

const DEFAULT_PREFERENCES: AppearancePreferences = {
  mode: "light",
  accent: "blue",
};

const SERVER_SNAPSHOT: AppearanceSnapshot = {
  preferences: DEFAULT_PREFERENCES,
  ready: false,
  error: null,
  needsMigration: false,
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const listeners = new Set<() => void>();
let cachedSnapshot: AppearanceSnapshot | null = null;

function isPreferences(value: unknown): value is AppearancePreferences {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.mode === "system" ||
      record.mode === "light" ||
      record.mode === "dark") &&
    (record.accent === "blue" || record.accent === "terracotta")
  );
}

function migratePreferences(value: unknown): AppearancePreferences {
  if (isPreferences(value)) return value;
  if (typeof value !== "object" || value === null) {
    throw new Error("Stored appearance settings are invalid");
  }

  const record = value as Record<string, unknown>;
  if (
    (record.mode === "system" ||
      record.mode === "light" ||
      record.mode === "dark") &&
    (record.accent === "forest" || record.accent === "lavender-sage")
  ) {
    return {
      mode: record.mode,
      accent: record.accent === "forest" ? "blue" : "terracotta",
    };
  }
  throw new Error("Stored appearance settings are invalid");
}

function applyPreferences(preferences: AppearancePreferences) {
  document.documentElement.dataset.theme = preferences.mode;
  document.documentElement.dataset.accent = preferences.accent;
}

function getSnapshot(): AppearanceSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (cachedSnapshot) return cachedSnapshot;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      cachedSnapshot = {
        preferences: DEFAULT_PREFERENCES,
        ready: true,
        error: null,
        needsMigration: false,
      };
      return cachedSnapshot;
    }

    const parsed: unknown = JSON.parse(stored);
    const preferences = migratePreferences(parsed);
    cachedSnapshot = {
      preferences,
      ready: true,
      error: null,
      needsMigration: JSON.stringify(parsed) !== JSON.stringify(preferences),
    };
  } catch {
    cachedSnapshot = {
      preferences: DEFAULT_PREFERENCES,
      ready: true,
      error: "Appearance settings could not be read from this browser.",
      needsMigration: false,
    };
  }
  return cachedSnapshot;
}

function publishSnapshot(next: AppearanceSnapshot) {
  cachedSnapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedSnapshot = null;
      for (const subscriber of listeners) subscriber();
    }
  }
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const { preferences, ready, error } = snapshot;

  useEffect(() => {
    if (!ready) return;
    applyPreferences(preferences);
    if (!snapshot.needsMigration) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      publishSnapshot({ ...snapshot, needsMigration: false });
    } catch {
      publishSnapshot({
        ...snapshot,
        error:
          "Appearance was updated, but this browser could not save the new preference format.",
      });
    }
  }, [preferences, ready, snapshot]);

  const updatePreferences = useCallback((next: AppearancePreferences) => {
    let nextError: string | null = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      nextError = "Appearance changed for this visit but could not be saved.";
    }
    applyPreferences(next);
    publishSnapshot({
      preferences: next,
      ready: true,
      error: nextError,
      needsMigration: false,
    });
  }, []);

  const setMode = useCallback(
    (mode: AppearanceMode) => updatePreferences({ ...preferences, mode }),
    [preferences, updatePreferences],
  );

  const setAccent = useCallback(
    (accent: AppearanceAccent) => updatePreferences({ ...preferences, accent }),
    [preferences, updatePreferences],
  );

  const value = useMemo(
    () => ({ preferences, ready, error, setMode, setAccent }),
    [preferences, ready, error, setMode, setAccent],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used inside <AppearanceProvider>");
  }
  return context;
}
