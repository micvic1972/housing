// ============================================================================
// FAKE DATA, standing in for a real backend. Every listing here follows the
// exact shape defined in types.ts. That's the whole point of having a
// types.ts file: this file HAS to match it, or TypeScript will show a red
// error right here, telling you exactly what's wrong.
//
// There are 5 listings on purpose, one for each situation the card needs to
// handle: a normal available place, a place with an agent fee, a place still
// being built, a place about to free up, and a place that's already rented.
//
// Each listing now has 3 photos. url is "" on purpose: an empty url tells the
// card "no real photo yet, draw the placeholder illustration". The alt text
// says what each photo shows: outside, a room, the compound.
// ============================================================================

import type { Listing } from "./types";

export const LISTINGS: Listing[] = [
  {
    id: "l1",
    name: "Amber Court Lodges",
    kind: "available",
    status: "active",
    roomType: "self-contained",
    location: { area: "Main Gate Axis", distanceFromUniversityKm: 0.3 },
    pricing: { amount: 220_000, currency: "NGN", period: "year" },
    images: [
      { id: "l1-1", url: "", alt: "Amber Court Lodges, outside" },
      { id: "l1-2", url: "", alt: "Amber Court Lodges, a room" },
      { id: "l1-3", url: "", alt: "Amber Court Lodges, the compound" },
    ],
    amenities: ["Water", "Power", "Wi-Fi", "Security"],
    verified: true,
    verifiedChecks: ["water", "power", "security", "in-person-visit"],
    rating: 4.9,
    reviewCount: 32,
    // Direct with the owner, confirmed no fee to inspect: the ideal case.
    contact: { contactType: "owner", inspectionFee: null },
    paymentOptions: { acceptedPeriods: ["year", "semester"] },
    safety: { hasSecurityPost: true, isGatedCompound: true },
    popularityScore: 96,
    insight: "Shortest walk to campus among verified lodges",
  },
  {
    id: "l2",
    name: "Palm Nest Hostel",
    kind: "available",
    status: "active",
    roomType: "single",
    location: { area: "Behind Campus", distanceFromUniversityKm: 0.6 },
    pricing: { amount: 150_000, currency: "NGN", period: "year" },
    images: [
      { id: "l2-1", url: "", alt: "Palm Nest Hostel, outside" },
      { id: "l2-2", url: "", alt: "Palm Nest Hostel, a room" },
      { id: "l2-3", url: "", alt: "Palm Nest Hostel, the compound" },
    ],
    amenities: ["Water", "Power", "Security"],
    verified: true,
    verifiedChecks: ["water", "power", "in-person-visit"],
    rating: 4.8,
    reviewCount: 21,
    // Through an agent, and there IS a fee: the case the card must warn about clearly.
    contact: { contactType: "agent", inspectionFee: { amount: 3_000, currency: "NGN" } },
    paymentOptions: { acceptedPeriods: ["year"], requiresUpfrontYears: 2 },
    popularityScore: 91,
    insight: "Rooms here are filling fast this week",
  },
  {
    id: "l3",
    name: "Blue Ridge Studios",
    kind: "construction",
    status: "coming-soon",
    roomType: "studio",
    location: { area: "Agbor Road", distanceFromUniversityKm: 0.8 },
    pricing: { amount: 260_000, currency: "NGN", period: "year" },
    images: [
      { id: "l3-1", url: "", alt: "Blue Ridge Studios, outside" },
      { id: "l3-2", url: "", alt: "Blue Ridge Studios, a room" },
      { id: "l3-3", url: "", alt: "Blue Ridge Studios, the compound" },
    ],
    amenities: ["Water", "Power", "Wi-Fi"],
    verified: false, // can't verify a place that isn't built yet
    contact: { contactType: "owner" }, // inspectionFee left undefined = "we don't know yet"
    paymentOptions: { acceptedPeriods: ["year"] },
    constructionProgress: 68,
    popularityScore: 72,
    insight: "68% built. Ready Nov 2026",
  },
  {
    id: "l4",
    name: "Sunrise Annex",
    kind: "expiring",
    status: "expiring-soon",
    roomType: "single",
    location: { area: "Old Market Side", distanceFromUniversityKm: 0.9 },
    pricing: { amount: 140_000, currency: "NGN", period: "year" },
    images: [
      { id: "l4-1", url: "", alt: "Sunrise Annex, outside" },
      { id: "l4-2", url: "", alt: "Sunrise Annex, a room" },
      { id: "l4-3", url: "", alt: "Sunrise Annex, the compound" },
    ],
    amenities: ["Water", "Power", "Security"],
    verified: true,
    verifiedChecks: ["water", "power"],
    rating: 4.5,
    reviewCount: 16,
    contact: { contactType: "owner", inspectionFee: null },
    paymentOptions: { acceptedPeriods: ["year", "semester"] },
    // Adjust this date forward if it's in the past by the time you're testing.
    expiresAt: "2026-11-30",
    popularityScore: 68,
    insight: "Current tenancy ends in a few days",
  },
  {
    id: "l5",
    name: "Oakview Lodge",
    kind: "rented",
    status: "rented",
    roomType: "self-contained",
    location: { area: "Main Gate Axis", distanceFromUniversityKm: 0.4 },
    pricing: { amount: 200_000, currency: "NGN", period: "year" },
    images: [
      { id: "l5-1", url: "", alt: "Oakview Lodge, outside" },
      { id: "l5-2", url: "", alt: "Oakview Lodge, a room" },
      { id: "l5-3", url: "", alt: "Oakview Lodge, the compound" },
    ],
    amenities: ["Water", "Power", "Security"],
    verified: true,
    verifiedChecks: ["water", "power", "in-person-visit"],
    rating: 4.4,
    reviewCount: 12,
    // Already rented, so the fee question doesn't really apply. null is more honest than
    // leaving it undefined (undefined would show "ask about fees," which doesn't make sense here).
    contact: { contactType: "owner", inspectionFee: null },
    paymentOptions: { acceptedPeriods: ["year"] },
    popularityScore: 60,
    insight: "Confirmed rented two days ago, so you can skip this trip",
  },
];