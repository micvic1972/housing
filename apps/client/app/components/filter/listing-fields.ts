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

export const ROOM_LABELS: Record<RoomType, string> = {
  single: "Single room",
  "self-contained": "Self-contain",
  shared: "Shared room",
  studio: "Studio",
  "one-bedroom": "1-bed flat",
  "two-bedroom": "2-bed flat",
};

export function listingFilterFields(item: Listing): FilterFields {
  const inspectionFee = item.contact?.inspectionFee;
  const upfrontYears = item.paymentOptions?.requiresUpfrontYears;

  return {
    price: item.pricing.amount,
    room: ROOM_LABELS[item.roomType],
    area: item.location.area,
    campus: item.location.campus,
    amenities: item.amenities,
    text: `${item.name} ${item.location.area} ${item.location.campus ?? ""} ${item.location.landmark ?? ""} ${ROOM_LABELS[item.roomType]} ${item.amenities.join(" ")} ${item.insight ?? ""} ${item.status}`,
    owner: item.contact?.contactType
      ? item.contact.contactType === "owner"
      : undefined,
    noFee: inspectionFee === undefined ? undefined : inspectionFee === null,
    lowUpfront: upfrontYears === undefined ? undefined : upfrontYears <= 1,
    gated: item.safety?.isGatedCompound,
    available:
      item.kind !== "rented" &&
      item.status !== "rented" &&
      item.status !== "unavailable",
  };
}
