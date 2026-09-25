"use client";

import { useState } from "react";

import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";
import FeedGrid from "./components/home/feed/FeedGrid";

import { MOCK_LISTINGS } from "./data/mock-listing";

import { FilterBar } from "./components/filter/FilterBar";
import { applyFilters } from "./components/filter/filter-config";
import { useFilters } from "./components/filter/FilterProvider";

import type { FeedId } from "./config/feeds";

export default function Page() {
  const [activeFeedId, setActiveFeedId] =
    useState<FeedId>("for-you");

  const [saved, setSaved] =
    useState<Set<string>>(new Set());

  const [openId, setOpenId] =
    useState<string | null>(null);

  const { filters } = useFilters();

  const shownListings = applyFilters(
    MOCK_LISTINGS,
    filters,
    (item) => ({
      price: item.price,
      room: item.room,
      area: item.area,
      verified: item.verified,
      text: `${item.name} ${item.area} ${item.insight}`,
    }),
  );

  const activeListing =
    MOCK_LISTINGS.find(
      (item) => item.id === openId,
    ) ?? null;

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

  return (
    <>
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
        <FilterBar />

        {/* Temporary feed indicator.
            We will replace this with real feed
            logic in the next discovery step. */}
        <div
          style={{
            padding: "8px 0",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Active feed: {activeFeedId}
        </div>

        <FeedGrid
          listings={shownListings}
          saved={saved}
          onToggleSave={toggleSave}
          onOpen={setOpenId}
        />
      </main>

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
              padding:
                "0 var(--gutter) 24px",
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
