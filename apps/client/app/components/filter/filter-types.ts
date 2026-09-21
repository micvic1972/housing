/** Shared types for the filter feature. No imports, so anything can use them. */

export type BudgetBand = "lt" | "mid" | "hi";

/** What the student has chosen. `null` / `false` / "" means "not filtering by this". */
export type Filters = {
  budget: BudgetBand | null;
  room: string | null;
  area: string | null;
  verified: boolean;
  /** Free-text search over name and area. */
  q: string;
};

export type FilterKey = keyof Filters;

/** Which part of the sheet is open. "all" also shows the search box and every group. */
export type SheetMode = "all" | "uni" | "budget" | "room" | "area" | "more";

/**
 * The only fields the filters need from a listing.
 * Your listing type can be shaped any way you like: you teach the filters how to read it
 * with one small "pick" function (see filter-config.ts).
 */
export type FilterFields = {
  price: number;
  room: string;
  area: string;
  verified: boolean;
  /** Text the search box looks inside, e.g. `${name} ${area}`. */
  text: string;
};