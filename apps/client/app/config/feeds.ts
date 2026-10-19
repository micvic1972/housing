export type FeedId = "all" | "available" | "construction";

export interface FeedDef {
  id: FeedId;
  label: string;
}

export const FEEDS: FeedDef[] = [
  { id: "all", label: "All places" },
  { id: "available", label: "Available" },
  { id: "construction", label: "Under construction" },
];