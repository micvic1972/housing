"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiBase } from "./api-base";
import {
  isAccountDataVisible,
  isCurrentAccountRequest,
  type AccountScope,
} from "./account-scope";

type SavedListingsValue = {
  savedIds: ReadonlySet<string>;
  ready: boolean;
  signedIn: boolean;
  error: string | null;
  toggleSaved: (id: string) => boolean;
  removeSaved: (id: string) => boolean;
};

const SavedListingsContext = createContext<SavedListingsValue | null>(null);
const EMPTY_SAVED_IDS: ReadonlySet<string> = new Set();

function getSavedIdsFromResponse(body: unknown): Set<string> {
  if (!body || typeof body !== "object" || !("data" in body)) {
    return new Set();
  }
  const records = body.data;
  if (!Array.isArray(records)) {
    return new Set();
  }
  const ids = records.flatMap((record) => {
    if (
      record &&
      typeof record === "object" &&
      "listingId" in record &&
      typeof record.listingId === "string"
    ) {
      return [record.listingId];
    }
    return [];
  });
  return new Set(ids);
}

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const accountScope = useRef<AccountScope>({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
  });

  useLayoutEffect(() => {
    accountScope.current = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
    };
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!userId || !isCurrentAccountRequest(accountScope.current, userId)) {
        return;
      }
      controller.abort();
      setReady(true);
      setLoadedUserId(userId ?? null);
      setError("Saved places took too long to load. Retry.");
    }, 8_000);

    const load = async () => {
      setReady(false);
      setSavedIds(new Set());
      setLoadedUserId(null);
      setError(null);
      if (!isSignedIn || !userId) {
        setSavedIds(new Set());
        setReady(true);
        setLoadedUserId(null);
        setError(null);
        window.clearTimeout(timeout);
        return;
      }
      try {
        let token: string | null;
        try {
          token = await getToken();
        } catch (tokenError) {
          if (
            !controller.signal.aborted &&
            isCurrentAccountRequest(accountScope.current, userId)
          ) {
            setError(
              tokenError instanceof Error
                ? tokenError.message
                : "Could not authenticate saved places.",
            );
          }
          return;
        }
        if (
          controller.signal.aborted ||
          !isCurrentAccountRequest(accountScope.current, userId)
        )
          return;
        if (!token) {
          throw new Error("Sign in to sync saved places.");
        }

        const response = await fetch(`${apiBase()}/saved-listings`, {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : `Saved places failed (${response.status})`;
          throw new Error(message);
        }

        if (
          !controller.signal.aborted &&
          isCurrentAccountRequest(accountScope.current, userId)
        ) {
          setSavedIds(getSavedIdsFromResponse(body));
          setLoadedUserId(userId);
          setError(null);
        }
      } catch (loadError) {
        if (
          !controller.signal.aborted &&
          isCurrentAccountRequest(accountScope.current, userId)
        ) {
          setLoadedUserId(userId);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load saved places.",
          );
        }
      } finally {
        window.clearTimeout(timeout);
        if (
          !controller.signal.aborted &&
          isCurrentAccountRequest(accountScope.current, userId)
        ) {
          setLoadedUserId(userId);
          setReady(true);
        }
      }
    };

    const start = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [getToken, isLoaded, isSignedIn, userId, version]);

  const persistMutation = useCallback(
    async (listingId: string, shouldSave: boolean): Promise<boolean> => {
      if (!isLoaded || !isSignedIn || !userId) {
        setError("Sign in to save this place.");
        return false;
      }

      let token: string | null;
      try {
        token = await getToken();
      } catch (tokenError) {
        if (isCurrentAccountRequest(accountScope.current, userId)) {
          setError(
            tokenError instanceof Error
              ? tokenError.message
              : "Could not authenticate this saved-place update.",
          );
        }
        return false;
      }
      if (!isCurrentAccountRequest(accountScope.current, userId)) return false;
      if (!token) {
        setError("Sign in to save this place.");
        return false;
      }

      const previous = new Set(savedIds);
      const next = new Set(previous);
      if (shouldSave) next.add(listingId);
      else next.delete(listingId);

      setSavedIds(next);

      try {
        const response = await fetch(
          `${apiBase()}/saved-listings/${encodeURIComponent(listingId)}`,
          {
            method: shouldSave ? "POST" : "DELETE",
            headers: {
              authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const body: unknown = await response.json();
        if (!isCurrentAccountRequest(accountScope.current, userId))
          return false;
        if (!response.ok) {
          const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : `Saved place update failed (${response.status})`;
          setSavedIds(previous);
          setError(message);
          return false;
        }

        const ids = getSavedIdsFromResponse(body);
        if (ids.size > 0 || shouldSave) {
          setSavedIds(
            shouldSave ? new Set([...previous, listingId]) : new Set(previous),
          );
        }
        if (!shouldSave && !ids.size) {
          setSavedIds(new Set([...previous].filter((id) => id !== listingId)));
        }
        setError(null);
        setVersion((current) => current + 1);
        return true;
      } catch (saveError) {
        if (!isCurrentAccountRequest(accountScope.current, userId))
          return false;
        setSavedIds(previous);
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not update saved places.",
        );
        return false;
      }
    },
    [getToken, isLoaded, isSignedIn, savedIds, userId],
  );

  const toggleSaved = useCallback(
    (id: string): boolean => {
      if (!ready || !isSignedIn || !userId) {
        setError("Sign in to save this place.");
        return false;
      }
      const currentlySaved = savedIds.has(id);
      const next = new Set(savedIds);
      if (currentlySaved) next.delete(id);
      else next.add(id);
      setSavedIds(next);
      void persistMutation(id, !currentlySaved).then((success) => {
        if (!success && isCurrentAccountRequest(accountScope.current, userId)) {
          setSavedIds(new Set(savedIds));
        }
      });
      return true;
    },
    [isSignedIn, persistMutation, ready, savedIds, userId],
  );

  const removeSaved = useCallback(
    (id: string): boolean => {
      if (!ready || !isSignedIn || !userId) {
        setError("Sign in to remove this saved place.");
        return false;
      }
      const next = new Set(savedIds);
      next.delete(id);
      setSavedIds(next);
      void persistMutation(id, false).then((success) => {
        if (!success && isCurrentAccountRequest(accountScope.current, userId)) {
          setSavedIds(new Set(savedIds));
        }
      });
      return true;
    },
    [isSignedIn, persistMutation, ready, savedIds, userId],
  );

  const value = useMemo(() => {
    const dataVisible = isAccountDataVisible(
      { isLoaded, isSignedIn: Boolean(isSignedIn), userId: userId ?? null },
      loadedUserId,
    );
    return {
      savedIds: dataVisible ? savedIds : EMPTY_SAVED_IDS,
      ready: isLoaded && (!isSignedIn || (dataVisible && ready)),
      signedIn: Boolean(isSignedIn),
      error: dataVisible ? error : null,
      toggleSaved,
      removeSaved,
    };
  }, [
    error,
    isLoaded,
    isSignedIn,
    loadedUserId,
    ready,
    removeSaved,
    savedIds,
    toggleSaved,
    userId,
  ]);

  return (
    <SavedListingsContext.Provider value={value}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings(): SavedListingsValue {
  const context = useContext(SavedListingsContext);
  if (!context) {
    throw new Error(
      "useSavedListings must be used inside SavedListingsProvider",
    );
  }
  return context;
}
