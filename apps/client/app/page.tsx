"use client";

// ============================================================================
// UniNest Home
//
// This file is the WIRING layer.
//
// It connects:
//   DiscoveryTabs
//        ↓
//   FilterBar  (chips) ──opens──▶ FilterSheet
//        ↓
//   Listing data
//        ↓
//   Discovery rails OR normal grid
//        ↓
//   ListingCard
//        ↓
//   BottomSheet (Quick look) → ListingDetail
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
import ListingDetail, {
  ListingDetailFooter,
} from "./components/home/listingcard/ListingDetail";
import { LISTINGS } from "./components/home/listingcard/data";

import { FilterBar } from "./components/filter/FilterBar";
import { FilterSheet } from "./components/filter/FilterSheet";
import { applyFilters } from "./components/filter/filter-config";
import { useFilters } from "./components/filter/FilterProvider";
import { listingFilterFields } from "./components/filter/listing-fields";

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
  // Which listing is currently open in the Quick look sheet?
  // --------------------------------------------------------------------------

  const [openId, setOpenId] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Get the current filters selected by the FilterBar.
  // --------------------------------------------------------------------------

  const { filters } = useFilters();

  // --------------------------------------------------------------------------
  // FIRST LAYER OF FILTERING
  //
  // listingFilterFields teaches the filters how to read a Listing (price,
  // room, area, verified, search text). The FilterSheet uses the very same
  // function for its live "Show 7 places" count, so the two always agree.
  //
  // This means the discovery rails below automatically respect the user's
  // current filters.
  // --------------------------------------------------------------------------
  const filteredListings = applyFilters(LISTINGS, filters, listingFilterFields);

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
          LISTING QUICK LOOK

          The sheet is the shell (Step 2). ListingDetail is what goes inside
          it (photos, info, four tabs). The footer (heart + main action) is
          handed to the sheet's footer slot so it never scrolls away.

          key={activeListing.id} makes sure a different listing always starts
          fresh on the Overview tab.
          ================================================================ */}

      <BottomSheet
        open={!!activeListing}
        onClose={() => setOpenId(null)}
        title={activeListing?.name}
        footer={
          activeListing ? (
            <ListingDetailFooter
              listing={activeListing}
              saved={saved.has(activeListing.id)}
              onToggleSave={toggleSave}
            />
          ) : undefined
        }
      >
        {activeListing ? (
          <ListingDetail key={activeListing.id} listing={activeListing} />
        ) : null}
      </BottomSheet>

      {/* ================================================================
          FILTER SHEET (Step 4)

          It was missing before, which is why tapping a chip did nothing:
          the chips set the "open" state, but nothing drew the sheet.
          FilterSheet reads that state from FiltersProvider on its own, so
          it needs no props.
          ================================================================ */}

      <FilterSheet />
    </>
  );
}