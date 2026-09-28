/** Shared types for the filter feature. No imports, so anything can use them. */

export type BudgetBand = "lt" | "mid" | "hi";

/** What the student has chosen. `null` / `false` / "" means "not filtering by this". */
export type Filters = {
  budget: BudgetBand | null;
  room: string | null;
  area: string | null;
  /** Furthest walk from the gate, in km. null = any distance. */
  maxKm: number | null;
  verified: boolean;
  /** Only places where you deal with the owner, not an agent. */
  ownerOnly: boolean;
  /** Only places where "no inspection fee" is CONFIRMED. */
  noFee: boolean;
  /** Only places asking one year or less upfront. */
  lowUpfront: boolean;
  /** Only places confirmed as a gated compound. */
  gated: boolean;
  /** Hide places that are already rented. */
  hideRented: boolean;
  /** Free-text search over name and area. */
  q: string;
};

export type FilterKey = keyof Filters;

/** Which part of the sheet is open. "all" also shows the search box and every group. */
export type SheetMode = "all" | "uni" | "budget" | "room" | "area" | "more";

/**
 * The only fields the filters need from a listing.
 * Your listing type can be shaped any way you like: you teach the filters how to read it
 * with one small "pick" function (see listing-fields.ts).
 *
 * The optional fields follow the honest-gap rule: leave one out (undefined) when the fact
 * is unknown, and a filter for it will NOT match that place. Only confirmed facts match.
 */
export type FilterFields = {
  price: number;
  room: string;
  area: string;
  verified: boolean;
  /** Text the search box looks inside, e.g. `${name} ${area}`. */
  text: string;
  /** Walk from the gate in km. undefined = unknown. */
  km?: number;
  /** true only when "no inspection fee" is confirmed. */
  noFee?: boolean;
  /** true only when you deal directly with the owner. */
  owner?: boolean;
  /** true only when one year or less upfront is confirmed. */
  lowUpfront?: boolean;
  /** true only when a gated compound is confirmed. */
  gated?: boolean;
  /** false when the place is already rented. */
  available?: boolean;
};