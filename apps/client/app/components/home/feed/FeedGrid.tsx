"use client";

import type { Listing } from "../listingcard/types";
import { ListingCard } from "../listingcard/ListingCard";
import styles from "./FeedGrid.module.css";

interface FeedGridProps {
  listings: Listing[];
  saved: ReadonlySet<string>;
  savingDisabled: boolean;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;
}

export default function FeedGrid({
  listings,
  saved,
  savingDisabled,
  onToggleSave,
  onOpen,
}: FeedGridProps) {
  return (
    <div className={styles.grid}>
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          saved={saved.has(listing.id)}
          savingDisabled={savingDisabled}
          onToggleSave={onToggleSave}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}