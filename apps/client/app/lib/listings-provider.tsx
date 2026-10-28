"use client";

// Fetches the real listings once and shares them with the whole client app.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Listing } from "../components/home/listingcard/types";
import { apiBase } from "./api-base";
import { mapListing, type ApiListing } from "./map-listing";

type Status = "loading" | "ready" | "error";

type ApiListingsResponse = {
  data: ApiListing[];
  meta: {
    count: number;
    collection: string;
    sort: string;
    search: string | null;
  };
};

type ListingsContextValue = {
  listings: Listing[];
  status: Status;
  reload: () => void;
};

const ListingsContext = createContext<ListingsContextValue>({
  listings: [],
  status: "loading",
  reload: () => {},
});

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ListingsContextValue>({
    listings: [],
    status: "loading",
    reload: () => {},
  });
  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = useCallback(() => {
    setValue((current) => ({ ...current, status: "loading" }));
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setValue((current) => ({
        ...current,
        status: "error",
        reload,
      }));
    }, 8_000);

    Promise.resolve()
      .then(() =>
        fetch(`${apiBase()}/listings`, {
          signal: controller.signal,
          cache: "no-store",
        }),
      )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Listings request failed with status ${res.status}`);
        }
        return res.json() as Promise<ApiListingsResponse>;
      })
      .then((response) => {
        if (!Array.isArray(response.data)) {
          throw new Error("Listings response did not contain a data array");
        }
        if (!controller.signal.aborted) {
          setValue({
            listings: response.data.map(mapListing),
            status: "ready",
            reload,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setValue((current) => ({
            ...current,
            status: "error",
            reload,
          }));
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reload, reloadVersion]);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  return (
    <ListingsContext.Provider value={value}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  return useContext(ListingsContext);
}
