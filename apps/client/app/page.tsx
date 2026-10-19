"use client";

import { useMemo, useState } from "react";
import CampusOnboarding from "./components/home/CampusOnboarding";
import FeedGrid from "./components/home/feed/FeedGrid";
import ListingDetail, {
  ListingDetailFooter,
} from "./components/home/listingcard/ListingDetail";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";
import { FilterBar } from "./components/filter/FilterBar";
import { FilterSheet } from "./components/filter/FilterSheet";
import { SearchSheet } from "./components/filter/SearchSheet";
import { applyFilters } from "./components/filter/filter-config";
import { useFilters } from "./components/filter/FilterProvider";
import { useListings } from "./lib/listings-provider";
import { useSavedListings } from "./lib/saved-listings";
import { isListingUnavailable } from "./lib/listing-status";
import { listingFilterFields } from "./components/filter/listing-fields";
import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import type { FeedId } from "./config/feeds";
import styles from "./page.module.css";

export default function Page() {
  const [activeFeedId, setActiveFeedId] = useState<FeedId>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const {
    filters,
    clearFilters,
    setCampusPreference,
    sheetMode,
  } = useFilters();
  const { listings, status, reload } = useListings();
  const {
    savedIds,
    ready: savedReady,
    error: savedError,
    toggleSaved,
  } = useSavedListings();

  const filteredListings = useMemo(
    () => applyFilters(listings, filters, listingFilterFields),
    [listings, filters],
  );
  const tabListings = useMemo(() => {
    if (activeFeedId === "available") {
      return filteredListings.filter(
        (listing) => listing.kind === "available" && !isListingUnavailable(listing),
      );
    }
    if (activeFeedId === "construction") {
      return filteredListings.filter(
        (listing) =>
          listing.kind === "construction" || listing.status === "coming-soon",
      );
    }
    return filteredListings;
  }, [activeFeedId, filteredListings]);
  const activeListing = listings.find((listing) => listing.id === openId) ?? null;

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

        {status === "loading" ? (
          <section className={styles.loadingState} role="status">
            <div className={styles.stateHeading}>
              <h1>Find student accommodation at UNIDEL</h1>
              <p>Loading current listings…</p>
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

        {status === "error" ? (
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

        {status === "ready" && listings.length === 0 ? (
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

        {status === "ready" &&
        listings.length > 0 &&
        filteredListings.length === 0 ? (
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

        {status === "ready" &&
        filteredListings.length > 0 &&
        tabListings.length === 0 ? (
          <section className={styles.stateCard} role="status">
            <h1>No listings in this category</h1>
            <p>Try all listings or adjust your filters.</p>
            <button
              type="button"
              className={styles.stateActionSecondary}
              onClick={() => setActiveFeedId("all")}
            >
              Browse all listings
            </button>
          </section>
        ) : null}

        {status === "ready" && tabListings.length > 0 ? (
          <>
            <p className={styles.resultCount} aria-live="polite">
              {tabListings.length === 1
                ? "1 listing"
                : `${tabListings.length} listings`}
            </p>
            <FeedGrid
              listings={tabListings}
              saved={savedIds}
              savingDisabled={!savedReady}
              onToggleSave={toggleSaved}
              onOpen={setOpenId}
            />
          </>
        ) : null}

        {savedError ? (
          <p className={styles.saveError} role="alert">
            {savedError} Saved places are stored on this device only and are
            not synced to an account.
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
        blocked={Boolean(activeListing) || sheetMode !== null || status !== "ready"}
      />
    </>
  );
}
