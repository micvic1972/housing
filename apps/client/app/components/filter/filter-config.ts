import type {
  BudgetBand,
  FilterFields,
  FilterKey,
  Filters,
} from "./filter-types";

/**
 * FILTER OPTIONS. To add a room type, an area or a budget band, edit the lists below.
 * The chips and the sheet update on their own.
 */

export const UNIVERSITY = "UNIDEL";

export const BUDGET_OPTIONS: ReadonlyArray<{
  value: BudgetBand;
  label: string;
  matches: (pricePerYear: number) => boolean;
}> = [
  { value: "lt", label: "Under ₦150,000", matches: (p) => p < 150_000 },
  { value: "mid", label: "₦150,000 to ₦220,000", matches: (p) => p >= 150_000 && p <= 220_000 },
  { value: "hi", label: "Above ₦220,000", matches: (p) => p > 220_000 },
];

export const ROOM_OPTIONS: readonly string[] = [
  "Self-contain",
  "Single room",
  "Shared room",
  "Studio",
  "1-bed flat",
];

export const AREA_OPTIONS: readonly string[] = [
  "Main Gate Axis",
  "Behind Campus",
  "Agbor Road",
  "Old Market Side",
];

/** Walking distance from the gate. Distance works as a second price tag for students. */
export const DISTANCE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0.5, label: "Within 0.5 km" },
  { value: 1, label: "Within 1 km" },
];

/**
 * The switches that live in the "More" tab. The More chip and the tab's dot
 * both use this list, so adding a switch here keeps them in step.
 */
export const MORE_FILTER_KEYS: readonly FilterKey[] = [
  "verified",
  "ownerOnly",
  "noFee",
  "lowUpfront",
  "gated",
  "hideRented",
];

export const EMPTY_FILTERS: Filters = {
  budget: null,
  room: null,
  area: null,
  maxKm: null,
  verified: false,
  ownerOnly: false,
  noFee: false,
  lowUpfront: false,
  gated: false,
  hideRented: false,
  q: "",
};

/** How many filters are switched on (useful for a badge). */
export function countActiveFilters(f: Filters): number {
  return [
    f.budget,
    f.room,
    f.area,
    f.maxKm,
    f.verified,
    f.ownerOnly,
    f.noFee,
    f.lowUpfront,
    f.gated,
    f.hideRented,
    f.q,
  ].filter(Boolean).length;
}

/** How many of the "More" switches are on. */
export function countMoreFilters(f: Filters): number {
  return MORE_FILTER_KEYS.filter((key) => Boolean(f[key])).length;
}

/**
 * Keep only the items that pass every active filter.
 *
 * `pick` tells the filters how to read YOUR item (see listing-fields.ts).
 *
 * Honest-gap rule: a filter only keeps places where the fact is CONFIRMED.
 * If a fact is unknown (undefined), the place is hidden while that filter is on.
 */
export function applyFilters<T>(items: readonly T[], f: Filters, pick: (item: T) => FilterFields): T[] {
  const band = f.budget ? BUDGET_OPTIONS.find((o) => o.value === f.budget) : undefined;
  const query = f.q.trim().toLowerCase();

  return items.filter((item) => {
    const x = pick(item);
    if (f.verified && !x.verified) return false;
    if (f.room && x.room !== f.room) return false;
    if (f.area && x.area !== f.area) return false;
    if (band && !band.matches(x.price)) return false;
    if (f.maxKm !== null && (x.km === undefined || x.km > f.maxKm)) return false;
    if (f.ownerOnly && !x.owner) return false;
    if (f.noFee && !x.noFee) return false;
    if (f.lowUpfront && !x.lowUpfront) return false;
    if (f.gated && !x.gated) return false;
    if (f.hideRented && !x.available) return false;
    if (query && !x.text.toLowerCase().includes(query)) return false;
    return true;
  });
}