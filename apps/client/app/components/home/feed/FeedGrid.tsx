"use client";

import type { Listing } from "../../../types/listing";
import ListingCard from "../listingcard/ListingCard";
import styles from "./FeedGrid.module.css";

interface FeedGridProps {
  listings: Listing[];
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;
}

export default function FeedGrid({ listings, saved, onToggleSave, onOpen }: FeedGridProps) {
  return (
    /* Enforces centered alignment rules at the grid root container scale */
    <div 
      className={styles.grid} 
      style={{ 
        width: "100%", 
        maxWidth: "600px", 
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        alignItems: "center"
      }}
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          saved={saved.has(listing.id)}
          onToggleSave={onToggleSave}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
