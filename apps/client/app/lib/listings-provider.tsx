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
import { useFilters } from "../components/filter/FilterProvider";
import {
  buildDiscoveryQuery,
  DISCOVERY_PAGE_SIZE,
  type DiscoveryCollection,
  type DiscoverySort,
} from "./discovery-query";

type Status = "loading" | "ready" | "error";
type DiscoveryStatus = Status;

type ApiListingsResponse = {
  data: ApiListing[];
  meta: {
    count: number;
    collection: string;
    sort: string;
    search: string | null;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
};

type ListingsContextValue = {
  listings: Listing[];
  status: Status;
  reload: () => void;
  discoveryListings: Listing[];
  discoveryStatus: DiscoveryStatus;
  discoveryCount: number;
  discoveryHasMore: boolean;
  discoverySort: DiscoverySort;
  setDiscoverySort: (sort: DiscoverySort) => void;
  setDiscoveryCollection: (collection: DiscoveryCollection) => void;
  loadMoreDiscovery: () => void;
};

const ListingsContext = createContext<ListingsContextValue>({
  listings: [],
  status: "loading",
  reload: () => {},
  discoveryListings: [],
  discoveryStatus: "loading",
  discoveryCount: 0,
  discoveryHasMore: false,
  discoverySort: "relevance",
  setDiscoverySort: () => {},
  setDiscoveryCollection: () => {},
  loadMoreDiscovery: () => {},
});

export function ListingsProvider({ children }: { children: ReactNode }) {
  const { filters } = useFilters();
  const [listingsValue, setListingsValue] = useState<{
    listings: Listing[];
    status: Status;
  }>({
    listings: [],
    status: "loading",
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [discoverySort, setDiscoverySort] =
    useState<DiscoverySort>("relevance");
  const [discoveryCollection, setDiscoveryCollection] =
    useState<DiscoveryCollection>("all");
  const discoveryQuery = buildDiscoveryQuery(
    filters,
    discoveryCollection,
    discoverySort,
  );

  const reload = useCallback(() => {
    setListingsValue((current) => ({ ...current, status: "loading" }));
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setListingsValue((current) => ({
        ...current,
        status: "error",
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
          setListingsValue((current) => ({
            ...current,
            listings: response.data.map(mapListing),
            status: "ready",
          }));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setListingsValue((current) => ({
            ...current,
            status: "error",
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

  const setSort = useCallback((sort: DiscoverySort) => {
    setDiscoverySort(sort);
  }, []);
  const setCollection = useCallback((collection: DiscoveryCollection) => {
    setDiscoveryCollection(collection);
  }, []);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  return (
    <DiscoveryListingsProvider
      key={`${discoveryQuery}:${reloadVersion}`}
      baseValue={{ ...listingsValue, reload }}
      query={discoveryQuery}
      searching={Boolean(filters.q.trim())}
      sort={discoverySort}
      setSort={setSort}
      setCollection={setCollection}
    >
      {children}
    </DiscoveryListingsProvider>
  );
}

function DiscoveryListingsProvider({
  children,
  baseValue,
  query,
  searching,
  sort,
  setSort,
  setCollection,
}: {
  children: ReactNode;
  baseValue: Pick<ListingsContextValue, "listings" | "status" | "reload">;
  query: string;
  searching: boolean;
  sort: DiscoverySort;
  setSort: (sort: DiscoverySort) => void;
  setCollection: (collection: DiscoveryCollection) => void;
}) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    listings: Listing[];
    count: number;
    hasMore: boolean;
    requestKey: string;
    status: DiscoveryStatus;
  }>({
    listings: [],
    count: 0,
    hasMore: false,
    requestKey: "",
    status: "loading",
  });
  const requestKey = `${query}:${page}`;
  const discoveryStatus =
    result.requestKey === requestKey ? result.status : "loading";

  useEffect(() => {
    const controller = new AbortController();
    const key = `${query}:${page}`;
    const timeout = window.setTimeout(() => {
      controller.abort();
      setResult((current) => ({
        ...current,
        requestKey: key,
        status: "error",
      }));
    }, 8_000);
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    params.set("pageSize", String(DISCOVERY_PAGE_SIZE));

    const timer = window.setTimeout(
      () => {
        fetch(`${apiBase()}/listings?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })
          .then(async (response) => {
            if (!response.ok) {
              const body: unknown = await response.json().catch(() => null);
              const message =
                typeof body === "object" &&
                body !== null &&
                "error" in body &&
                typeof body.error === "string"
                  ? body.error
                  : `Listings request failed with status ${response.status}`;
              throw new Error(message);
            }
            return (await response.json()) as ApiListingsResponse;
          })
          .then((response) => {
            if (!Array.isArray(response.data)) {
              throw new Error("Listings response did not contain a data array");
            }
            if (!controller.signal.aborted) {
              const nextListings = response.data.map(mapListing);
              setResult((current) => ({
                listings:
                  page === 1
                    ? nextListings
                    : [
                        ...current.listings,
                        ...nextListings.filter(
                          (listing) =>
                            !current.listings.some(
                              (existing) => existing.id === listing.id,
                            ),
                        ),
                      ],
                status: "ready",
                count: response.meta.count,
                hasMore: response.meta.hasMore ?? false,
                requestKey: key,
              }));
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setResult((current) => ({
                ...current,
                requestKey: key,
                status: "error",
              }));
            }
          })
          .finally(() => window.clearTimeout(timeout));
      },
      searching ? 250 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [page, query, searching]);

  const loadMore = useCallback(() => {
    if (discoveryStatus !== "ready" || !result.hasMore) {
      return;
    }
    setPage((current) => current + 1);
  }, [discoveryStatus, result.hasMore]);

  const contextValue: ListingsContextValue = {
    ...baseValue,
    discoveryListings: result.listings,
    discoveryStatus,
    discoveryCount: result.count,
    discoveryHasMore: result.hasMore,
    discoverySort: sort,
    setDiscoverySort: setSort,
    setDiscoveryCollection: setCollection,
    loadMoreDiscovery: loadMore,
  };

  return (
    <ListingsContext.Provider value={contextValue}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  return useContext(ListingsContext);
}
