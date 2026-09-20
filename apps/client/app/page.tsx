"use client";

import { useState } from "react";
import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";
import BottomSheet from "./components/ui/bottomsheet/BottomSheet";
import FeedGrid from "./components/home/feed/FeedGrid";
import { MOCK_LISTINGS } from "./data/mock-listing";

export default function Page() {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  
  const listing = MOCK_LISTINGS.find((item) => item.id === openId) ?? null;

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
      <DiscoveryTabs onSearchPress={() => alert("Filters sheet comes later")} />
      
      <main style={{ padding: "0 var(--gutter)" }}>
        <FeedGrid 
          listings={MOCK_LISTINGS} 
          saved={saved} 
          onToggleSave={toggleSave} 
          onOpen={setOpenId} 
        />
      </main>

      <BottomSheet
        open={!!listing}
        onClose={() => setOpenId(null)}
        title={listing?.name}
        footer={
          <button
            style={{ width: "100%", height: 48, background: "var(--primary)", color: "var(--on-primary)", borderRadius: 14, fontWeight: 700 }}
          >
            {listing?.kind === "construction" 
              ? "Follow build" 
              : listing?.kind === "expiring" 
              ? "Follow room" 
              : listing?.kind === "rented" 
              ? "See similar places" 
              : "View details"}
          </button>
        }
      >
        {listing && (
          <div style={{ padding: "0 var(--gutter) 24px", color: "var(--text-muted)", fontSize: 14 }}>
            {listing.insight}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
