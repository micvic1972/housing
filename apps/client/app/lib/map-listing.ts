// Turns one flat row from the API into the nested Listing the client uses.

import type {
  Listing,
  ListingContact,
  ListingImage,
  ListingKind,
  ListingPaymentOptions,
  ListingSafety,
  ListingStatus,
  RoomType,
} from "../components/home/listingcard/types";

// One row exactly as the API sends it (flat, with nulls for empty columns).
export type ApiListing = {
  id: string;
  name: string;
  kind: string;
  status: string;
  roomType: string;
  area: string;
  campus: string | null;
  landmark: string | null;
  distanceKm: number | null;
  priceAmount: number;
  priceCurrency: string;
  pricePeriod: string;
  amenities: string[];
  verified: boolean;
  verifiedChecks: string[];
  rating: number | null;
  reviewCount: number | null;
  contactType: string | null;
  inspectionFeeStatus: string;
  inspectionFeeAmount: number | null;
  acceptedPeriods: string[];
  requiresUpfrontYears: number | null;
  hasSecurityPost: boolean | null;
  isGatedCompound: boolean | null;
  popularityScore: number | null;
  constructionProgress: number | null;
  expiresAt: string | null;
  insight: string | null;
  images: { id: string; url: string; alt: string; position: number }[];
};

// The card expects 3 photos. With none, we give 3 empty urls,
// which tells the card to draw its placeholder illustration.
function toImages(row: ApiListing): ListingImage[] {
  const real = [...row.images]
    .sort((a, b) => a.position - b.position)
    .map(({ id, url, alt }) => ({ id, url, alt }));
  if (real.length > 0) return real;
  return [1, 2, 3].map((n) => ({
    id: `${row.id}-placeholder-${n}`,
    url: "",
    alt: `${row.name}, photo ${n}`,
  }));
}

// Honest-gap rule: unknown fee -> undefined, confirmed no fee -> null.
function toContact(row: ApiListing): ListingContact | undefined {
  let inspectionFee: ListingContact["inspectionFee"];
  if (row.inspectionFeeStatus === "none") inspectionFee = null;
  if (row.inspectionFeeStatus === "confirmed" && row.inspectionFeeAmount !== null) {
    inspectionFee = { amount: row.inspectionFeeAmount, currency: "NGN" };
  }
  if (!row.contactType && inspectionFee === undefined) return undefined;
  return {
    contactType: row.contactType
      ? (row.contactType as ListingContact["contactType"])
      : undefined,
    inspectionFee,
  };
}

function toPaymentOptions(row: ApiListing): ListingPaymentOptions | undefined {
  if (row.acceptedPeriods.length === 0 && row.requiresUpfrontYears === null) return undefined;
  return {
    acceptedPeriods: row.acceptedPeriods as ListingPaymentOptions["acceptedPeriods"],
    requiresUpfrontYears: row.requiresUpfrontYears ?? undefined,
  };
}

function toSafety(row: ApiListing): ListingSafety | undefined {
  if (row.hasSecurityPost === null && row.isGatedCompound === null) return undefined;
  return {
    hasSecurityPost: row.hasSecurityPost ?? undefined,
    isGatedCompound: row.isGatedCompound ?? undefined,
  };
}

export function mapListing(row: ApiListing): Listing {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ListingKind,
    status: row.status as ListingStatus,
    roomType: row.roomType as RoomType,
    location: {
      area: row.area,
      campus: row.campus ?? undefined,
      landmark: row.landmark ?? undefined,
      distanceFromUniversityKm: row.distanceKm ?? undefined,
    },
    pricing: {
      amount: row.priceAmount,
      currency: "NGN",
      period: row.pricePeriod as Listing["pricing"]["period"],
    },
    images: toImages(row),
    amenities: row.amenities,
    verified: row.verified,
    verifiedChecks: row.verifiedChecks as Listing["verifiedChecks"],
    rating: row.rating ?? undefined,
    reviewCount: row.reviewCount ?? undefined,
    contact: toContact(row),
    paymentOptions: toPaymentOptions(row),
    safety: toSafety(row),
    popularityScore: row.popularityScore ?? undefined,
    constructionProgress: row.constructionProgress ?? undefined,
    expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : undefined,
    insight: row.insight ?? undefined,
  };
}