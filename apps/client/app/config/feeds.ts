export type FeedId = "for-you" | "trending" | "five-star" | "under-construction" | "close-to-expire";

export interface FeedDef {
  id: FeedId;
  label: string;
}

// Display order only. Each feed's filtering/sorting logic comes later,
// once the data layer exists.
export const FEEDS: FeedDef[] = [
  { id: "for-you", label: "For You" },
  { id: "five-star", label: "Five Star" },
  { id: "trending", label: "Trending" },
  { id: "under-construction", label: "Under Construction" },
  { id: "close-to-expire", label: "Close to Expire" },
];