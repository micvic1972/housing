"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, List, Map as MapIcon } from "lucide-react";
import BottomSheet from "../components/ui/bottomsheet/BottomSheet";
import { FilterBar } from "../components/filter/FilterBar";
import { FilterSheet } from "../components/filter/FilterSheet";
import { SearchSheet } from "../components/filter/SearchSheet";
import ListingDetail, {
  ListingDetailFooter,
} from "../components/home/listingcard/ListingDetail";
import { useFilters } from "../components/filter/FilterProvider";
import { useListings } from "../lib/listings-provider";
import { useSavedListings } from "../lib/saved-listings";
import { campusLabel } from "../config/campuses";
import ListingMap from "./ListingMap";
import styles from "./page.module.css";
import "leaflet/dist/leaflet.css";

export default function MapPage() {
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { filters } = useFilters();
  const {
    listings,
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
  const { savedIds, ready: savedReady, toggleSaved } = useSavedListings();
  const selected =
    discoveryListings.find((listing) => listing.id === selectedId) ??
    listings.find((listing) => listing.id === selectedId) ??
    null;
  const selectListing = useCallback((listingId: string) => {
    setSelectedId(listingId);
  }, []);
  const verifiedListings = useMemo(
    () =>
      discoveryListings.filter(
        (listing) => listing.location.coordinates !== undefined,
      ),
    [discoveryListings],
  );
  const showLocationList = view === "list" || verifiedListings.length === 0;

  useEffect(() => {
    setDiscoveryCollection("all");
  }, [setDiscoveryCollection]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Explore by location</p>
        <h1>Places around your campus</h1>
        <p>
          Results use the same listings and filters as Home. Pins appear only
          for locations an administrator has confirmed.
        </p>
      </header>

      <FilterBar />

      <div
        className={styles.viewSwitch}
        role="group"
        aria-label="Map or list view"
      >
        <button
          type="button"
          aria-pressed={view === "map"}
          className={view === "map" ? styles.activeView : ""}
          onClick={() => setView("map")}
        >
          <MapIcon size={17} aria-hidden />
          Map
        </button>
        <button
          type="button"
          aria-pressed={view === "list"}
          className={view === "list" ? styles.activeView : ""}
          onClick={() => setView("list")}
        >
          <List size={17} aria-hidden />
          List
        </button>
      </div>

      {view === "map" && verifiedListings.length > 0 ? (
        <section
          className={styles.mapSection}
          aria-label="Verified listing map"
        >
          <div className={styles.mapResults}>
            <div className={styles.mapCanvasColumn}>
              <div className={styles.resultsHeading}>
                <h2>Map results · {discoveryCount} places</h2>
                <label>
                  Sort{" "}
                  <select
                    aria-label="Sort map listings"
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
              <ListingMap
                listings={verifiedListings}
                onSelectListing={selectListing}
              />
            </div>
            <aside className={styles.mapListingPanel}>
              <h3>Verified locations</h3>
              <p>
                Select a property or map marker to preview the listing. Only
                locations confirmed by an administrator are shown on the map.
              </p>
              <div className={styles.mapListingCards}>
                {verifiedListings.map((listing) => (
                  <button
                    className={styles.locationCard}
                    key={listing.id}
                    type="button"
                    onClick={() => selectListing(listing.id)}
                  >
                    <span className={styles.locationText}>
                      <strong>{listing.name}</strong>
                      <span>
                        {[listing.location.area, listing.location.landmark]
                          .filter(Boolean)
                          .join(" · ") || "Location details not reported"}
                      </span>
                    </span>
                    <span className={styles.price}>
                      ₦{listing.pricing.amount.toLocaleString("en-NG")}
                      <small> / {listing.pricing.period}</small>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.allResultsLink}
                onClick={() => setView("list")}
              >
                Browse all {discoveryCount} matching places
              </button>
            </aside>
          </div>
          <p className={styles.mapNote}>
            Showing {verifiedListings.length} verified map{" "}
            {verifiedListings.length === 1 ? "location" : "locations"} from the
            current results.
          </p>
          {verifiedListings.length < discoveryListings.length ? (
            <p className={styles.mapNote}>
              {discoveryListings.length - verifiedListings.length} loaded{" "}
              {discoveryListings.length - verifiedListings.length === 1
                ? "listing has"
                : "listings have"}{" "}
              no confirmed map point and are not pinned. Switch to List to see
              every result.
            </p>
          ) : null}
          {discoveryStatus !== "error" &&
          (discoveryHasMore || discoveryStatus === "loading") ? (
            <button
              type="button"
              disabled={discoveryStatus === "loading" || !discoveryHasMore}
              onClick={loadMoreDiscovery}
            >
              {discoveryStatus === "loading"
                ? "Loading more places…"
                : "Load more map results"}
            </button>
          ) : null}
        </section>
      ) : null}
      {view === "map" &&
      verifiedListings.length === 0 &&
      discoveryListings.length > 0 &&
      discoveryStatus !== "loading" ? (
        <section className={styles.mapUnavailable} role="status">
          <div className={styles.mapIcon} aria-hidden>
            <MapPin size={26} />
          </div>
          <div>
            <h2>No verified locations in these results</h2>
            <p>
              Listings without an administrator-confirmed coordinate are not
              pinned. You can still browse all matching locations in the list.
            </p>
          </div>
          <button type="button" onClick={() => setView("list")}>
            Browse location list
          </button>
        </section>
      ) : null}

      {filters.campus ? (
        <p className={styles.filterNote}>
          Campus filter: {campusLabel(filters.campus) ?? filters.campus}
        </p>
      ) : null}

      {discoveryStatus === "loading" && discoveryListings.length === 0 ? (
        <p className={styles.state} role="status">
          Loading current listings…
        </p>
      ) : null}

      {discoveryStatus === "error" && discoveryListings.length === 0 ? (
        <section className={styles.state} role="alert">
          <p>Places could not be loaded.</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </section>
      ) : null}

      {discoveryStatus === "ready" && discoveryCount === 0 ? (
        <section className={styles.state} role="status">
          <h2>No places match these filters</h2>
          <p>Change or clear a filter to see other recorded listings.</p>
        </section>
      ) : null}

      {showLocationList && discoveryListings.length > 0 ? (
        <section className={styles.results} aria-label="Listing locations">
          <div className={styles.resultsHeading}>
            <h2>Location list</h2>
            <label>
              {discoveryCount} places · Sort{" "}
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
          {discoveryListings.map((listing) => (
            <button
              className={styles.locationCard}
              key={listing.id}
              type="button"
              onClick={() => selectListing(listing.id)}
            >
              <span className={styles.pin} aria-hidden>
                <MapPin size={18} />
              </span>
              <span className={styles.locationText}>
                <strong>{listing.name}</strong>
                <span>
                  {[
                    campusLabel(listing.location.campus) ??
                      listing.location.campus,
                    listing.location.area,
                    listing.location.landmark,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Location details not reported"}
                </span>
              </span>
              <span className={styles.price}>
                ₦{listing.pricing.amount.toLocaleString("en-NG")}
                <small> / {listing.pricing.period}</small>
              </span>
            </button>
          ))}
          {discoveryStatus !== "error" &&
          (discoveryHasMore || discoveryStatus === "loading") ? (
            <button
              type="button"
              disabled={discoveryStatus === "loading" || !discoveryHasMore}
              onClick={loadMoreDiscovery}
            >
              {discoveryStatus === "loading"
                ? "Loading more places…"
                : "Load more places"}
            </button>
          ) : null}
          {discoveryStatus === "error" && discoveryListings.length > 0 ? (
            <section className={styles.state} role="alert">
              <p>More matching listings could not be loaded.</p>
              <button type="button" onClick={reload}>
                Retry
              </button>
            </section>
          ) : null}
        </section>
      ) : null}

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name}
        footer={
          selected ? (
            <ListingDetailFooter
              listing={selected}
              saved={savedIds.has(selected.id)}
              savingDisabled={!savedReady}
              onToggleSave={toggleSaved}
            />
          ) : undefined
        }
      >
        {selected ? (
          <ListingDetail key={selected.id} listing={selected} />
        ) : null}
      </BottomSheet>

      <FilterSheet />
      <SearchSheet onOpenListing={setSelectedId} />
    </main>
  );
}
