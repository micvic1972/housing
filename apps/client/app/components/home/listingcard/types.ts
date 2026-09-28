// ============================================================================
// This file describes WHAT A LISTING IS. Nothing in here fetches data, shows
// anything on screen, or knows about filters/pages. It's pure shape.
// Every other file (data.ts, ListingCard.tsx, page.tsx) trusts this shape.
// If you ever add a new fact about a listing, add it HERE first, then use it
// elsewhere — never invent a field somewhere else and hope it matches.
// ============================================================================

// The four "kinds" our five discovery tabs care about.
export type ListingKind = "available" | "construction" | "expiring" | "rented";

export type RoomType =
  | "single"
  | "self-contained"
  | "shared"
  | "studio"
  | "one-bedroom"
  | "two-bedroom";

export type ListingStatus =
  | "active"
  | "coming-soon"
  | "expiring-soon"
  | "rented"
  | "unavailable";

// Where the place is. Grouped together because these facts always travel together.
export interface ListingLocation {
  area: string;
  landmark?: string;
  /** Distance from UNIDEL, in kilometres. Students treat distance as a second price tag. */
  distanceFromUniversityKm?: number;
}

// How much, and how it's charged.
export interface ListingPricing {
  amount: number;
  currency: "NGN";
  period: "year" | "semester" | "month";
}

export interface ListingImage {
  id: string;
  url: string;
  alt: string;
}

// WHO you're actually dealing with, and whether just LOOKING costs money.
// This exists because real students complain most about agents charging an
// "inspection fee" just to view a place. Surfacing this clearly on the card
// is one of the most important trust signals in the whole app.
export interface ListingContact {
  contactType: "owner" | "agent" | "university-partner";
  /**
   * undefined = we don't know yet (show "ask before visiting")
   * null      = confirmed there is NO fee
   * {amount}  = confirmed there IS a fee, and how much
   */
  inspectionFee?: { amount: number; currency: "NGN" } | null;
}

// The other big complaint: being forced to pay a full year (or more) upfront.
export interface ListingPaymentOptions {
  acceptedPeriods: Array<"year" | "session" | "semester" | "month">;
  /** Set this ONLY if the listing genuinely demands multiple years upfront. */
  requiresUpfrontYears?: number;
}

// Kept short and honest. A missing field means "we don't know," never "assume it's fine."
export interface ListingSafety {
  hasSecurityPost?: boolean;
  isGatedCompound?: boolean;
}

// THE full shape of one listing. Every field above gets used somewhere in
// ListingCard.tsx — if you add a field here and never use it, that's a sign
// you either forgot to wire it in, or you added something not needed yet.
export interface Listing {
  id: string;
  name: string;

  kind: ListingKind;
  status: ListingStatus;
  roomType: RoomType;

  location: ListingLocation;
  pricing: ListingPricing;
  images: ListingImage[];

  amenities: string[];

  verified: boolean;
  /** What was actually checked during verification — not just a blind true/false. */
  verifiedChecks?: Array<"water" | "power" | "security" | "in-person-visit">;

  rating?: number;
  reviewCount?: number;

  contact?: ListingContact;
  paymentOptions?: ListingPaymentOptions;
  safety?: ListingSafety;

  /** Used later by feed logic to decide who counts as "Trending" — never store isTrending: true. */
  popularityScore?: number;

  /** Only meaningful when kind === "construction". A number from 0 to 100. */
  constructionProgress?: number;
  /** Only meaningful when kind === "expiring". An ISO date string like "2026-10-15". */
  expiresAt?: string;

  /** One short factual line shown on the card, e.g. "Shortest walk to campus." */
  insight?: string;
}