"use client";

// ============================================================================
// UniNest Home
//
// This file is the WIRING layer.
//
// It connects:
//   DiscoveryTabs
//        ↓
//   FilterBar
//        ↓
//   Listing data
//        ↓
//   Discovery rails OR normal grid
//        ↓
//   ListingCard
//        ↓
//   BottomSheet
//
// Important:
// The ListingCard still owns the appearance of ONE listing.
// This page only decides WHICH listings should be shown and WHERE.
// ============================================================================

import { useState } from "react";

import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import ListingRail from "./components/home/discovery/ListingRail";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";

import { ListingCard } from "./components/home/listingcard/ListingCard";
import { LISTINGS } from "./components/home/listingcard/data";

import { FilterBar } from "./components/filter/FilterBar";
import { applyFilters } from "./components/filter/filter-config";
import { useFilters } from "./components/filter/FilterProvider";

import type { FeedId } from "./config/feeds";

export default function Page() {
  // --------------------------------------------------------------------------
  // Which discovery tab is currently selected?
  // --------------------------------------------------------------------------

  const [activeFeedId, setActiveFeedId] = useState<FeedId>("for-you");

  // --------------------------------------------------------------------------
  // Which listings are currently saved?
  //
  // This stays here for now.
  // Later, when we build Inspections, we will move this into shared state.
  // --------------------------------------------------------------------------

  const [saved, setSaved] = useState<Set<string>>(new Set());

  // --------------------------------------------------------------------------
  // Which listing is currently open in the BottomSheet?
  // --------------------------------------------------------------------------

  const [openId, setOpenId] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Get the current filters selected by the FilterBar.
  // --------------------------------------------------------------------------

  const { filters } = useFilters();

  // --------------------------------------------------------------------------
  // FIRST LAYER OF FILTERING
  //
  // The FilterBar already knows about things such as:
  //   price
  //   room type
  //   area
  //   verification
  //   search text
  //
  // We translate our nested Listing object into the flat shape expected by
  // applyFilters().
  //
  // This means the discovery rails below automatically respect the user's
  // current filters.
  // --------------------------------------------------------------------------

  const filteredListings = applyFilters(LISTINGS, filters, (item) => ({
    price: item.pricing.amount,
    room: item.roomType,
    area: item.location.area,
    verified: item.verified,
    text: `${item.name} ${item.location.area} ${item.insight ?? ""}`,
  }));

  // --------------------------------------------------------------------------
  // FIND THE LISTING CURRENTLY OPEN IN THE DETAIL SHEET.
  // --------------------------------------------------------------------------

  const activeListing =
    LISTINGS.find((item) => item.id === openId) ?? null;

  // --------------------------------------------------------------------------
  // SAVE / UNSAVE
  // --------------------------------------------------------------------------

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  // --------------------------------------------------------------------------
  // FOR YOU DISCOVERY RAILS
  //
  // These are deliberately derived from the SAME filtered listings.
  //
  // This is important:
  //
  // We are NOT creating another dataset.
  //
  // User filters first:
  //
  //       LISTINGS
  //          ↓
  //      FilterBar
  //          ↓
  //  filteredListings
  //          ↓
  //   ┌──────┼────────┬────────────┐
  //   ↓      ↓        ↓            ↓
  // near   five     build       expiring
  //
  // That means filtering remains consistent throughout the page.
  // --------------------------------------------------------------------------

  const nearTheGate = [...filteredListings]
    .filter(
      (listing) =>
        listing.location.distanceFromUniversityKm !== undefined,
    )
    .sort(
      (a, b) =>
        (a.location.distanceFromUniversityKm ?? Infinity) -
        (b.location.distanceFromUniversityKm ?? Infinity),
    );

  const fiveStar = filteredListings.filter(
    (listing) => (listing.rating ?? 0) >= 4.7,
  );

  const underConstruction = filteredListings.filter(
    (listing) => listing.kind === "construction",
  );

  const freeingUpSoon = filteredListings.filter(
    (listing) => listing.kind === "expiring",
  );

  // --------------------------------------------------------------------------
  // OTHER DISCOVERY TABS
  //
  // For now these remain normal grids.
  //
  // The important thing is that they use the same listing data and the same
  // ListingCard. We are only changing which listings are selected.
  // --------------------------------------------------------------------------

  let tabListings = filteredListings;

  if (activeFeedId === "five-star") {
    tabListings = filteredListings.filter(
      (listing) => (listing.rating ?? 0) >= 4.7,
    );
  }

  if (activeFeedId === "under-construction") {
    tabListings = filteredListings.filter(
      (listing) => listing.kind === "construction",
    );
  }

  if (activeFeedId === "close-to-expire") {
    tabListings = filteredListings.filter(
      (listing) => listing.kind === "expiring",
    );
  }

  if (activeFeedId === "trending") {
    // popularityScore is already part of the Listing model.
    // Higher score appears first.
    tabListings = [...filteredListings].sort(
      (a, b) =>
        (b.popularityScore ?? 0) -
        (a.popularityScore ?? 0),
    );
  }

  return (
    <>
      {/* ================================================================
          DISCOVERY TABS

          For You
          Five Star
          Trending
          Under Construction
          Close to Expire
          ================================================================ */}

      <DiscoveryTabs
        activeId={activeFeedId}
        onChange={setActiveFeedId}
      />

      <main
        style={{
          padding: "0 var(--gutter)",
          width: "100%",
        }}
      >
        {/* ================================================================
            FILTER BAR

            This remains above every feed.

            Because every discovery section is derived from
            filteredListings, the selected filters affect the rails too.
            ================================================================ */}

        <FilterBar />

        {/* ================================================================
            FOR YOU

            This is now the actual discovery experience.

            Instead of dumping every listing into one large grid, we give
            the student several small answers to different housing needs.
            ================================================================ */}

        {activeFeedId === "for-you" ? (
          <>
            <ListingRail
              title="Near the gate"
              reason="Shortest walk to UNIDEL"
              listings={nearTheGate}
              saved={saved}
              onToggleSave={toggleSave}
              onOpen={setOpenId}
            />

            <ListingRail
              title="Five star"
              reason="Rated 4.7 and above"
              listings={fiveStar}
              saved={saved}
              onToggleSave={toggleSave}
              onOpen={setOpenId}
            />

            <ListingRail
              title="Under construction"
              reason="Follow a build"
              listings={underConstruction}
              saved={saved}
              onToggleSave={toggleSave}
              onOpen={setOpenId}
            />

            <ListingRail
              title="Freeing up soon"
              reason="Rooms about to open"
              listings={freeingUpSoon}
              saved={saved}
              onToggleSave={toggleSave}
              onOpen={setOpenId}
            />
          </>
        ) : (
          /* ================================================================
             OTHER FEEDS

             These remain a normal responsive grid for now.

             We will improve each feed later only when there is a real
             product reason to do so.
             ================================================================ */

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              paddingBottom: 24,
            }}
          >
            {tabListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={saved.has(listing.id)}
                onToggleSave={toggleSave}
                onOpen={setOpenId}
              />
            ))}
          </div>
        )}
      </main>

      {/* ================================================================
          LISTING QUICK VIEW

          This is intentionally still the simple placeholder.

          We are NOT upgrading the BottomSheet yet.

          First we make sure the discovery architecture works.
          ================================================================ */}

      <BottomSheet
        open={!!activeListing}
        onClose={() => setOpenId(null)}
        title={activeListing?.name}
        footer={
          <button
            style={{
              width: "100%",
              height: 48,
              background: "var(--primary)",
              color: "var(--on-primary)",
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            {activeListing?.kind === "construction"
              ? "Follow build"
              : activeListing?.kind === "expiring"
                ? "Follow room"
                : activeListing?.kind === "rented"
                  ? "See similar places"
                  : "View details"}
          </button>
        }
      >
        {activeListing && (
          <div
            style={{
              padding: "0 var(--gutter) 24px",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            {activeListing.insight}
          </div>
        )}
      </BottomSheet>
    </>
  );
}