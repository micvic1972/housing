"use client";

import { useEffect, useState } from "react";
import CampusOnboarding from "./components/home/CampusOnboarding";
import FeedGrid from "./components/home/feed/FeedGrid";
import ListingDetail, {
  ListingDetailFooter,
} from "./components/home/listingcard/ListingDetail";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";
import { FilterBar } from "./components/filter/FilterBar";
import { FilterSheet } from "./components/filter/FilterSheet";
import { SearchSheet } from "./components/filter/SearchSheet";
import { useFilters } from "./components/filter/FilterProvider";
import { useListings } from "./lib/listings-provider";
import { useSavedListings } from "./lib/saved-listings";
import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import type { FeedId } from "./config/feeds";
import styles from "./page.module.css";

export default function Page() {
  const [activeFeedId, setActiveFeedId] = useState<FeedId>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { filters, clearFilters, setCampusPreference, sheetMode } =
    useFilters();
  const {
    listings,
    status,
    reload,
    discoveryListings,
    discoveryStatus,
    discoveryCount,
    discoveryHasMore,
    discoverySort,
    setDiscoverySort,
    setDiscoveryCollection,
    loadMoreDiscovery,
  } = useListings();
  const {
    savedIds,
    ready: savedReady,
    error: savedError,
    toggleSaved,
  } = useSavedListings();

  const activeListing =
    discoveryListings.find((listing) => listing.id === openId) ??
    listings.find((listing) => listing.id === openId) ??
    null;

  useEffect(() => {
    setDiscoveryCollection(activeFeedId);
  }, [activeFeedId, setDiscoveryCollection]);

  function removeCampusPreference() {
    setCampusPreference(null);
  }

  return (
    <>
      <DiscoveryTabs activeId={activeFeedId} onChange={setActiveFeedId} />
      <main className={styles.discovery}>
        <FilterBar />

        {filters.campus ? (
          <p className={styles.campusNote} aria-live="polite">
            Showing listings recorded for this campus.{" "}
            <button type="button" onClick={removeCampusPreference}>
              Clear campus preference
            </button>
          </p>
        ) : null}

        {discoveryStatus === "loading" && discoveryListings.length === 0 ? (
          <section className={styles.loadingState} role="status">
            <div className={styles.stateHeading}>
              <h1>Find student accommodation at UNIDEL</h1>
              <p>Loading current listings and applying your filters…</p>
            </div>
            <div className={styles.skeletonGrid} aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div className={styles.skeletonCard} key={index}>
                  <div className={styles.skeletonPhoto} />
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonMeta} />
                  <div className={styles.skeletonPrice} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {discoveryStatus === "error" && discoveryListings.length === 0 ? (
          <section className={styles.stateCard} role="alert">
            <p className={styles.stateEyebrow}>Connection problem</p>
            <h1>Places couldn’t be loaded</h1>
            <p>Check that the API is reachable from this device, then retry.</p>
            <button
              className={styles.stateAction}
              type="button"
              onClick={reload}
            >
              Try again
            </button>
          </section>
        ) : null}

        {discoveryStatus === "ready" &&
        discoveryCount === 0 &&
        listings.length === 0 ? (
          <section className={styles.stateCard} role="status">
            <p className={styles.stateEyebrow}>UNIDEL accommodation</p>
            <h1>No places listed yet</h1>
            <p>Listings will appear here when they are added.</p>
            <button
              className={styles.stateActionSecondary}
              type="button"
              onClick={reload}
            >
              Check again
            </button>
          </section>
        ) : null}

        {discoveryStatus === "ready" &&
        discoveryCount === 0 &&
        listings.length > 0 ? (
          <section className={styles.stateCard} role="status">
            <p className={styles.stateEyebrow}>Search results</p>
            <h1>No places match these filters</h1>
            <p>
              This may reflect gaps in the current listings. Clear or change a
              filter to see other available records.
            </p>
            <button
              type="button"
              className={styles.stateAction}
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          </section>
        ) : null}

        {discoveryListings.length > 0 ? (
          <>
            <div className={styles.resultCount} aria-live="polite">
              <span>
                {discoveryCount === 1
                  ? "1 listing"
                  : `${discoveryCount} listings`}
              </span>
              <label>
                Sort{" "}
                <select
                  aria-label="Sort listings"
                  value={discoverySort}
                  onChange={(event) =>
                    setDiscoverySort(
                      event.currentTarget.value as typeof discoverySort,
                    )
                  }
                >
                  <option value="relevance">Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="distance-asc">
                    Nearest (reported distance)
                  </option>
                </select>
              </label>
            </div>
            <FeedGrid
              listings={discoveryListings}
              saved={savedIds}
              savingDisabled={!savedReady}
              onToggleSave={toggleSaved}
              onOpen={setOpenId}
            />
            {discoveryStatus !== "error" &&
            (discoveryHasMore || discoveryStatus === "loading") ? (
              <button
                className={styles.stateActionSecondary}
                type="button"
                disabled={discoveryStatus === "loading" || !discoveryHasMore}
                onClick={loadMoreDiscovery}
              >
                {discoveryStatus === "loading"
                  ? "Loading more places…"
                  : "Load more places"}
              </button>
            ) : null}
          </>
        ) : null}

        {savedError ? (
          <p className={styles.saveError} role="alert">
            {savedError} Saved places are stored on this device only and are not
            synced to an account.
          </p>
        ) : null}
        {discoveryStatus === "error" && discoveryListings.length > 0 ? (
          <p role="alert" className={styles.saveError}>
            Could not load more matching places. Retry to refresh results.
            <button type="button" onClick={reload}>
              Retry
            </button>
          </p>
        ) : null}
      </main>

      <BottomSheet
        open={Boolean(activeListing)}
        onClose={() => setOpenId(null)}
        title={activeListing?.name}
        footer={
          activeListing ? (
            <ListingDetailFooter
              listing={activeListing}
              saved={savedIds.has(activeListing.id)}
              savingDisabled={!savedReady}
              onToggleSave={toggleSaved}
            />
          ) : undefined
        }
      >
        {activeListing ? (
          <ListingDetail key={activeListing.id} listing={activeListing} />
        ) : null}
      </BottomSheet>

      <FilterSheet />
      <SearchSheet onOpenListing={setOpenId} />
      <CampusOnboarding
        blocked={
          Boolean(activeListing) ||
          sheetMode !== null ||
          status !== "ready" ||
          discoveryStatus !== "ready"
        }
      />
    </>
  );
}
