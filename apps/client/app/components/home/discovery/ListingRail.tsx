"use client";

import type { ReactNode } from "react";
import type { Listing } from "../listingcard/types";
import { ListingCard } from "../listingcard/ListingCard";

import styles from "./ListingRail.module.css";
interface ListingRailProps {
  title: string;
  reason: string;
  listings: Listing[];

  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;

  /**
   * Optional content shown at the right side of the heading.
   *
   * We are not using it yet, but keeping the small extension point
   * here means the section can later support something like
   * "See all" without changing the rail itself.
   */
  action?: ReactNode;
}

export default function ListingRail({
  title,
  reason,
  listings,
  saved,
  onToggleSave,
  onOpen,
  action,
}: ListingRailProps) {
  /**
   * A section with no listings should not leave an empty rail
   * occupying space on the Home feed.
   */
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby={`rail-${title}`}>
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <h2 id={`rail-${title}`} className={styles.title}>
            {title}
          </h2>

          <p className={styles.reason}>{reason}</p>
        </div>

        {action ? (
          <div className={styles.action}>
            {action}
          </div>
        ) : null}
      </div>

      <div
        className={styles.rail}
        aria-label={`${title} listings`}
      >
        {listings.map((listing) => (
          <div className={styles.item} key={listing.id}>
            <ListingCard
              listing={listing}
              saved={saved.has(listing.id)}
              onToggleSave={onToggleSave}
              onOpen={onOpen}
            />
          </div>
        ))}
      </div>
    </section>
  );
}