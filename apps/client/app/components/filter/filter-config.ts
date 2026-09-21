import type { BudgetBand, FilterFields, Filters } from "./filter-types";

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

export const EMPTY_FILTERS: Filters = {
  budget: null,
  room: null,
  area: null,
  verified: false,
  q: "",
};

/** How many filters are switched on (useful for a badge). */
export function countActiveFilters(f: Filters): number {
  return [f.budget, f.room, f.area, f.verified, f.q].filter(Boolean).length;
}

/**
 * Keep only the items that pass every active filter.
 *
 * `pick` tells the filters how to read YOUR item. Example for a listing with these fields:
 *   const pick = (a: Accommodation): FilterFields => ({
 *     price: a.pricePerYear,
 *     room: a.roomType,
 *     area: a.area,
 *     verified: a.verified,
 *     text: `${a.name} ${a.area}`,
 *   });
 *   const shown = applyFilters(items, filters, pick);
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
    if (query && !x.text.toLowerCase().includes(query)) return false;
    return true;
  });
}