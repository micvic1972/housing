import type { Listing } from "../components/home/listingcard/types";

export const LISTINGS: Listing[] = [
  {
    id: "un-001",
    name: "Green View Residence",

    kind: "available",
    status: "active",

    propertyType: "self-contained",
    roomType: "self-contained",

    location: {
      area: "Ekewan",
      landmark: "Near UNIDEL",
      distanceFromUniversityKm: 1.2,
    },

    pricing: {
      amount: 180_000,
      currency: "NGN",
      period: "year",
    },

    images: [
      {
        id: "un-001-1",
        url: "/images/listings/green-view-1.jpg",
        alt: "Green View Residence exterior",
      },
      {
        id: "un-001-2",
        url: "/images/listings/green-view-2.jpg",
        alt: "Green View Residence room",
      },
    ],

    amenities: [
      "Water",
      "Security",
      "Prepaid meter",
      "Parking",
    ],

    verified: true,

    rating: 4.8,
    reviewCount: 32,

    popularityScore: 92,
    recommendationScore: 95,

    summary: "Popular student accommodation close to UNIDEL.",
  },

  {
    id: "un-002",
    name: "Campus View Lodge",

    kind: "available",
    status: "active",

    propertyType: "hostel",
    roomType: "single",

    location: {
      area: "Ekenwan",
      landmark: "University axis",
      distanceFromUniversityKm: 0.8,
    },

    pricing: {
      amount: 150_000,
      currency: "NGN",
      period: "year",
    },

    images: [
      {
        id: "un-002-1",
        url: "/images/listings/campus-view-1.jpg",
        alt: "Campus View Lodge exterior",
      },
    ],

    amenities: [
      "Water",
      "Security",
      "Wi-Fi",
    ],

    verified: true,

    rating: 4.6,
    reviewCount: 21,

    popularityScore: 88,
    recommendationScore: 90,

    summary: "Affordable option within easy reach of campus.",
  },

  {
    id: "un-003",
    name: "Royal Heights",

    kind: "available",
    status: "active",

    propertyType: "apartment",
    roomType: "one-bedroom",

    location: {
      area: "Ekewan",
      distanceFromUniversityKm: 1.7,
    },

    pricing: {
      amount: 220_000,
      currency: "NGN",
      period: "year",
    },

    images: [
      {
        id: "un-003-1",
        url: "/images/listings/royal-heights-1.jpg",
        alt: "Royal Heights apartment",
      },
    ],

    amenities: [
      "Water",
      "Security",
      "Parking",
      "Prepaid meter",
    ],

    verified: true,

    rating: 4.9,
    reviewCount: 48,

    popularityScore: 96,
    recommendationScore: 94,

    summary: "Highly rated accommodation with modern facilities.",
  },

  {
    id: "un-004",
    name: "Future Heights",

    kind: "construction",
    status: "coming-soon",

    propertyType: "apartment",
    roomType: "self-contained",

    location: {
      area: "Near UNIDEL",
      distanceFromUniversityKm: 2.1,
    },

    pricing: {
      amount: 200_000,
      currency: "NGN",
      period: "year",
    },

    images: [
      {
        id: "un-004-1",
        url: "/images/listings/future-heights-1.jpg",
        alt: "Future Heights construction project",
      },
    ],

    amenities: [
      "Water",
      "Security",
      "Parking",
    ],

    verified: true,

    popularityScore: 72,
    recommendationScore: 76,

    constructionProgress: 68,

    summary: "New accommodation currently under construction.",
  },

  {
    id: "un-005",
    name: "Student Haven",

    kind: "expiring",
    status: "expiring-soon",

    propertyType: "hostel",
    roomType: "shared",

    location: {
      area: "Ekewan",
      distanceFromUniversityKm: 1.4,
    },

    pricing: {
      amount: 135_000,
      currency: "NGN",
      period: "year",
    },

    images: [
      {
        id: "un-005-1",
        url: "/images/listings/student-haven-1.jpg",
        alt: "Student Haven accommodation",
      },
    ],

    amenities: [
      "Water",
      "Security",
      "Electricity",
    ],

    verified: true,

    rating: 4.4,
    reviewCount: 16,

    popularityScore: 80,
    recommendationScore: 83,

    expiresAt: "2026-10-15",

    summary: "A room becoming available soon.",
  },
];

