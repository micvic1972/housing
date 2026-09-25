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
    <div className={styles.grid}>
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