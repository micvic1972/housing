import type { Listing } from "../types/listing";

const DAY = 86_400_000;
const HOUR = 3_600_000;

// Ported 1:1 from the reference HTML mockup. Every listing here is
// fictional. endsAt is computed at load time so "frees up in" countdowns
// always start counting down live, just like the original mockup.
const now = Date.now();

export const MOCK_LISTINGS: Listing[] = [
  { id: "a1", seed: 1, name: "Amber Court Lodges", area: "Main Gate Axis", walk: 4, dist: 0.3, price: 220000, room: "Self-contain", fac: ["water", "power", "wifi", "security"], verified: true, vdate: "12 Sep", status: "AVAILABLE", rating: 4.9, pop: 96, kind: "standard", insight: "Shortest walk to campus among verified lodges" },
  { id: "a2", seed: 2, name: "Palm Nest Hostel", area: "Behind Campus", walk: 7, dist: 0.6, price: 150000, room: "Single room", fac: ["water", "power", "security"], verified: true, vdate: "9 Sep", status: "ALMOST_FULL", left: 3, rating: 4.8, pop: 91, kind: "standard", insight: "Rooms here are filling fast this week" },
  { id: "a3", seed: 3, name: "Blue Ridge Studios", area: "Agbor Road", walk: 9, dist: 0.8, price: 260000, room: "Studio", fac: ["water", "power", "wifi", "security"], verified: false, status: "COMING_SOON", pop: 88, kind: "construction", progress: 68, ready: "Nov 2026", insight: "Follow the build and hear the moment rooms open" },
  { id: "a4", seed: 4, name: "Campus Edge Suites", area: "Main Gate Axis", walk: 3, dist: 0.2, price: 280000, room: "Self-contain", fac: ["water", "power", "wifi", "security"], verified: true, vdate: "2 Sep", status: "FREEING_SOON", rating: 4.6, pop: 84, kind: "expiring", endsAt: now + 9 * DAY + 3 * HOUR, insight: "Closest to the gate, and a room frees up soon" },
  { id: "a5", seed: 5, name: "Greenview Rooms", area: "Old Market Side", walk: 11, dist: 1.1, price: 120000, room: "Shared room", fac: ["water", "power"], verified: true, vdate: "5 Sep", status: "AVAILABLE", rating: 5.0, pop: 79, kind: "standard", insight: "Best value among five-star places" },
  { id: "a6", seed: 6, name: "Harmony Court", area: "Behind Campus", walk: 6, dist: 0.5, price: 190000, room: "Self-contain", fac: ["water", "power", "security"], verified: false, status: "COMING_SOON", pop: 72, kind: "construction", progress: 35, ready: "Jan 2027", insight: "Early followers see room plans first" },
  { id: "a7", seed: 7, name: "Sunrise Annex", area: "Old Market Side", walk: 10, dist: 0.9, price: 140000, room: "Single room", fac: ["water", "power", "security"], verified: true, vdate: "28 Aug", status: "FREEING_SOON", rating: 4.5, pop: 68, kind: "expiring", endsAt: now + 2 * DAY + 14 * HOUR, insight: "Current tenancy ends in a few days" },
  { id: "a8", seed: 8, name: "Meridian Flats", area: "Agbor Road", walk: 8, dist: 0.7, price: 240000, room: "1-bed flat", fac: ["water", "power", "wifi"], verified: true, vdate: "10 Sep", status: "AVAILABLE", rating: 4.7, pop: 75, kind: "standard", insight: "Quiet street with steady reviews" },
  { id: "a9", seed: 9, name: "Oakview Lodge", area: "Main Gate Axis", walk: 5, dist: 0.4, price: 200000, room: "Self-contain", fac: ["water", "power", "security"], verified: true, vdate: "1 Sep", status: "FULL", rating: 4.4, pop: 60, kind: "rented", insight: "Confirmed rented two days ago, so you can skip this trip" },
];