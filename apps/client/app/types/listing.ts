export type FacilityId = "water" | "power" | "wifi" | "security";

export type ListingStatus = "AVAILABLE" | "ALMOST_FULL" | "COMING_SOON" | "FREEING_SOON" | "FULL";

export type ListingKind = "standard" | "construction" | "expiring" | "rented";

export interface Listing {
  id: string;
  seed: number; // used later to generate a consistent placeholder photo per listing
  name: string;
  area: string;
  walk: number; // minutes on foot from campus
  dist: number; // km from UNIDEL
  price: number; // naira per year
  room: string;
  fac: FacilityId[];
  verified: boolean;
  vdate?: string; // date verified, e.g. "12 Sep" — only present if verified
  status: ListingStatus;
  rating?: number; // out of 5 — absent for construction listings
  pop: number; // popularity score, drives the Trending feed's sort
  kind: ListingKind;
  insight: string; // the short "why this listing" line shown on every card
  left?: number; // present only when status is ALMOST_FULL
  progress?: number; // percent built, 0–100 — present only when kind is "construction"
  ready?: string; // expected completion, e.g. "Nov 2026" — present only when kind is "construction"
  endsAt?: number; // epoch ms countdown target — present only when kind is "expiring"
}