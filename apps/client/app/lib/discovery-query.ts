import { ROOM_LABELS } from "../components/filter/listing-fields";
import type { Filters } from "../components/filter/filter-types";

export type DiscoveryCollection = "all" | "available" | "construction";
export type DiscoverySort =
  "relevance" | "newest" | "price-asc" | "price-desc" | "distance-asc";

export const DISCOVERY_PAGE_SIZE = 12;

export function buildDiscoveryQuery(
  filters: Filters,
  collection: DiscoveryCollection,
  sort: DiscoverySort,
): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.campus) params.set("campus", filters.campus);
  if (filters.area) params.set("area", filters.area);
  if (filters.room) {
    const roomType = Object.entries(ROOM_LABELS).find(
      ([, label]) => label === filters.room,
    )?.[0];
    if (roomType) params.set("roomType", roomType);
  }
  if (filters.budget === "lt") params.set("maxPrice", "149999");
  if (filters.budget === "mid") {
    params.set("minPrice", "150000");
    params.set("maxPrice", "220000");
  }
  if (filters.budget === "hi") params.set("minPrice", "220001");
  if (filters.ownerOnly) params.set("contactType", "owner");
  if (filters.noFee) params.set("inspectionFeeStatus", "none");
  if (filters.lowUpfront) params.set("maxUpfrontYears", "1");
  if (filters.gated) params.set("isGatedCompound", "true");
  if (filters.hideRented) params.set("availableOnly", "true");
  if (filters.amenities.length > 0) {
    params.set("amenities", filters.amenities.join(","));
  }
  if (collection !== "all") params.set("collection", collection);
  if (sort !== "relevance") params.set("sort", sort);
  return params.toString();
}
