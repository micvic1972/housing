import type { Listing } from "../components/home/listingcard/types";

type ListingState = Pick<Listing, "kind" | "status">;

export function getListingStatusLabel(listing: ListingState): string | null {
  if (listing.status === "rented" || listing.kind === "rented") return "Rented";
  if (listing.status === "unavailable") return "Unavailable";
  if (listing.status === "coming-soon") {
    return listing.kind === "construction" ? "Under construction" : "Coming soon";
  }
  if (listing.status === "expiring-soon" || listing.kind === "expiring") {
    return "Frees up soon";
  }
  if (listing.kind === "construction") return "Under construction";
  return null;
}

export function isListingUnavailable(listing: ListingState): boolean {
  return (
    listing.kind === "rented" ||
    listing.status === "rented" ||
    listing.status === "unavailable"
  );
}
