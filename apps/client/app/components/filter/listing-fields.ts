// ============================================================================
// listing-fields.ts
//
// Teaches the filters how to READ a Listing. It is the one place where the
// nested Listing shape is flattened into the simple shape the filters use.
//
// Both page.tsx (which decides what to show) and FilterSheet.tsx (which shows
// the live "Show 7 places" count) use THIS function, so the count in the
// sheet can never disagree with what the feed shows.
//
// It also fixes a real mismatch: the Room chips say "Self-contain", but a
// listing stores roomType "self-contained". We translate one into the other
// here. Record<RoomType, string> makes TypeScript complain if a new room type
// is ever added to types.ts and forgotten here.
// ============================================================================

import type { Listing, RoomType } from "../home/listingcard/types";
import type { FilterFields } from "./filter-types";

const ROOM_LABELS: Record<RoomType, string> = {
  single: "Single room",
  "self-contained": "Self-contain",
  shared: "Shared room",
  studio: "Studio",
  "one-bedroom": "1-bed flat",
  "two-bedroom": "2-bed flat",
};

export function listingFilterFields(item: Listing): FilterFields {
  return {
    price: item.pricing.amount,
    room: ROOM_LABELS[item.roomType],
    area: item.location.area,
    verified: item.verified,
    text: `${item.name} ${item.location.area} ${item.insight ?? ""}`,
  };
}