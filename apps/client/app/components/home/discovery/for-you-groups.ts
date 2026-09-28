// ============================================================================
// Decides how "For You" groups listings into themed rows — a FEED DECISION,
// same category as config/feeds.ts, kept separate from the Listing type and
// the card. To add/remove/reorder a row, edit ONLY this file.
// ============================================================================

import type { Listing } from "../listingcard/types";

export type ForYouGroup = {
  title: string;
  note: string;
  listings: Listing[];
};

export function getForYouGroups(all: Listing[]): ForYouGroup[] {
  const byDistance = [...all].sort(
    (a, b) => (a.location.distanceFromUniversityKm ?? 99) - (b.location.distanceFromUniversityKm ?? 99),
  );

  return [
    { title: "Near the gate", note: "Shortest walk to UNIDEL", listings: byDistance.slice(0, 3) },
    { title: "Five star", note: "Rated 4.7 and above", listings: all.filter((l) => (l.rating ?? 0) >= 4.7) },
    { title: "Under construction", note: "Follow a build", listings: all.filter((l) => l.kind === "construction") },
    { title: "Freeing up soon", note: "Rooms about to open", listings: all.filter((l) => l.kind === "expiring") },
  ];
}