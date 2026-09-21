// Static option lists for the filter sheet. Kept separate from mock listing
// data since these represent filter choices, not listings themselves.
export const ROOM_TYPES = ["Self-contain", "Single room", "Shared room", "Studio", "1-bed flat"] as const;
export const AREAS = ["Main Gate Axis", "Behind Campus", "Old Market Side", "Agbor Road"] as const;
export const BUDGET_RANGES = [
  { label: "Any budget", value: "any" },
  { label: "Under ₦150,000", value: "under-150" },
  { label: "₦150,000 – ₦250,000", value: "150-250" },
  { label: "Above ₦250,000", value: "above-250" },
] as const;

export interface FilterState {
  query: string;
  budget: string;
  roomType: string | null;
  area: string | null;
  verifiedOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  budget: "any",
  roomType: null,
  area: null,
  verifiedOnly: false,
};