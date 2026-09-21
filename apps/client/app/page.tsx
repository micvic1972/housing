"use client";

import { useState } from "react";
import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";
import FeedGrid from "./components/home/feed/FeedGrid";
import { MOCK_LISTINGS } from "./data/mock-listing";

// Pluralized relative path imports matching your folder structure on disk
import { FilterBar } from "./components/filter/FilterBar";
import { FilterSheet } from "./components/filter/FilterSheet";
import { applyFilters } from "./components/filter/filter-config";
import { useFilters } from "./components/filter/FilterProvider";

export default function Page() {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  
  // Grabs the shared state and drawer actions from your filters context provider
  const { filters } = useFilters();

  const shownListings = applyFilters(MOCK_LISTINGS, filters, (item) => ({
    price: item.price,
    room: item.room,
    area: item.area,
    verified: item.verified,
    text: `${item.name} ${item.area} ${item.insight}`,
  }));

  const activeListing = MOCK_LISTINGS.find((item) => item.id === openId) ?? null;

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
      <DiscoveryTabs />
      
      <main style={{ padding: "0 var(--gutter)", width: "100%" }}>
        <FilterBar />
        <FeedGrid 
          listings={shownListings} 
          saved={saved} 
          onToggleSave={toggleSave} 
          onOpen={setOpenId} 
        />
      </main>

      {/* The live sliding multi-filter sheet linked directly to our collection result lengths */}
      <FilterSheet resultCount={shownListings.length} />

      {/* Accommodation Details Sheet */}
      <BottomSheet
        open={!!activeListing}
        onClose={() => setOpenId(null)}
        title={activeListing?.name}
        footer={
          <button
            style={{ width: "100%", height: 48, background: "var(--primary)", color: "var(--on-primary)", borderRadius: 14, fontWeight: 700 }}
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
          <div style={{ padding: "0 var(--gutter) 24px", color: "var(--text-muted)", fontSize: 14 }}>
            {activeListing.insight}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
