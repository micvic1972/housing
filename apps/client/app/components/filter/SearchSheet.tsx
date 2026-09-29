"use client";

// ============================================================================
// SearchSheet
//
// Opens when the student taps the search icon (DiscoveryTabs calls
// openSheet("all")). It is built on the same BottomSheet shell as everything
// else, so the close paths and the laptop-modal behaviour are identical.
//
// Three states, so the sheet is never blank:
//   1. Nothing typed  -> tap-to-search suggestions (area names)
//   2. Typed, matches -> compact result rows (photo, name, distance, price)
//   3. Typed, none    -> an honest empty state with a "Clear search" button
//
// It searches through filters.q, the SAME text the feed already filters by,
// and it uses the SAME applyFilters + listingFilterFields, so the rows here
// always agree with the feed and with "Show N places" in the Filters sheet.
//
// Tapping a row does not navigate anywhere. It calls onOpenListing(id), and
// page.tsx (which owns openId) opens the Quick look. Card = closed lid,
// sheet = opened drawer: same listing, never a new page.
// ============================================================================

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import BottomSheet from "../ui/bottomsheet/BottomSheet";
import { LISTINGS } from "../home/listingcard/data";
import { placeholderScene } from "../home/listingcard/placeholder-scene";
import type { Listing } from "../home/listingcard/types";
import { AREA_OPTIONS, applyFilters } from "./filter-config";
import { useFilters } from "./FilterProvider";
import { listingFilterFields } from "./listing-fields";
import styles from "./SearchSheet.module.css";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

// A short status word for places that are not simply "available".
// Honest-gap rule: a rented or unfinished place must not look bookable.
const STATUS_TEXT: Partial<Record<Listing["kind"], string>> = {
  construction: "Under construction",
  expiring: "Frees up soon",
  rented: "Rented",
};

interface SearchSheetProps {
  /** Called with a listing id when a student taps a result row. */
  onOpenListing: (id: string) => void;
}

// ----------------------------------------------------------------------------
// The sheet: opens only in "all" mode (the search icon). Chips open the
// FilterSheet instead.
// ----------------------------------------------------------------------------

export function SearchSheet({ onOpenListing }: SearchSheetProps) {
  const { filters, setFilter, sheetMode, closeSheet } = useFilters();

  const query = filters.q.trim();

  // Same filtering the feed uses, so numbers and rows always agree.
  const results = applyFilters(LISTINGS, filters, listingFilterFields);

  function openResult(id: string) {
    // The search was used to FIND one place. Clear the text so the feed
    // behind the sheet is not silently left filtered.
    setFilter("q", "");
    closeSheet();
    onOpenListing(id);
  }

  const showLabel =
    results.length === 1 ? "Show 1 place" : `Show ${results.length} places`;

  return (
    <BottomSheet
      open={sheetMode === "all"}
      onClose={closeSheet}
      title="Search"
      label="Search"
      footer={
        // Only when there is something to show. "Show N places" keeps the
        // search on the feed; tapping a row instead opens that one place.
        query && results.length > 0 ? (
          <button type="button" className={styles.show} onClick={closeSheet}>
            {showLabel}
          </button>
        ) : undefined
      }
    >
      {/* BottomSheet only mounts children while open, so the panel starts
          fresh (and re-runs its focus effect) every time. */}
      <SearchPanel
        query={query}
        raw={filters.q}
        results={results}
        onChange={(v) => setFilter("q", v)}
        onOpenResult={openResult}
      />
    </BottomSheet>
  );
}

export default SearchSheet;

// ----------------------------------------------------------------------------
// The content inside the sheet.
// ----------------------------------------------------------------------------

function SearchPanel({
  query,
  raw,
  results,
  onChange,
  onOpenResult,
}: {
  query: string;
  raw: string;
  results: Listing[];
  onChange: (value: string) => void;
  onOpenResult: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Laptop (mouse): put the cursor in the box straight away.
  // Phone: do NOT, because the keyboard would cover half the sheet and hide
  // the suggestions. Phone students tap a suggestion or the box themselves.
  // requestAnimationFrame waits until BottomSheet has finished moving focus
  // to itself, otherwise it would steal focus back from the input.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={styles.wrap}>
      {/* Search box. font-size is 16px+ in the CSS so iOS does not zoom. */}
      <div className={styles.box}>
        <Search size={18} className={styles.boxIcon} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Search by name or area"
          aria-label="Search by name or area"
          enterKeyHint="search"
          autoComplete="off"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          // Enter = "I'm done typing": hide the keyboard so results are visible.
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {raw ? (
          <button
            type="button"
            className={styles.clearX}
            aria-label="Clear search text"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
          >
            <X size={18} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* STATE 1: nothing typed. Suggestions, so the sheet is never blank. */}
      {!query ? (
        <>
          <h3 className={styles.groupTitle}>Try an area</h3>
          <div className={styles.chips}>
            {AREA_OPTIONS.map((area) => (
              <button
                key={area}
                type="button"
                className={styles.chip}
                onClick={() => onChange(area)}
              >
                {area}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            Or type a place name. Results appear as you type.
          </p>
        </>
      ) : null}

      {/* STATE 2: typed, and something matches. */}
      {query && results.length > 0 ? (
        <>
          {/* aria-live so screen readers hear the count change as you type. */}
          <p className={styles.count} aria-live="polite">
            {results.length === 1 ? "1 place" : `${results.length} places`}
          </p>
          <ul className={styles.list}>
            {results.map((l) => (
              <li key={l.id}>
                <ResultRow listing={l} onOpen={onOpenResult} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* STATE 3: typed, nothing matches. Say so plainly and offer a way out. */}
      {query && results.length === 0 ? (
        <div className={styles.empty} aria-live="polite">
          <p className={styles.emptyTitle}>No places match “{query}”</p>
          <p className={styles.hint}>
            Check the spelling, or try an area name.
          </p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => onChange("")}
          >
            Clear search
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------------
// One compact result row: small photo, name, distance + area, price.
// The whole row is ONE button, so it is easy to tap and easy for keyboards.
// ----------------------------------------------------------------------------

function ResultRow({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const km = listing.location.distanceFromUniversityKm;
  const status = STATUS_TEXT[listing.kind];

  // Same rule as the card: a real photo if there is a url, else the
  // placeholder for photo position 0.
  const first = listing.images?.[0];
  const src =
    first?.url || placeholderScene(listing.id, listing.kind === "construction", 0);

  return (
    <button
      type="button"
      className={styles.row}
      onClick={() => onOpen(listing.id)}
    >
      <img className={styles.thumb} src={src} alt="" draggable={false} />

      <span className={styles.text}>
        <span className={styles.name}>{listing.name}</span>
        <span className={styles.meta}>
          {km != null ? `${km} km · ` : ""}
          {listing.location.area}
          {status ? ` · ${status}` : ""}
        </span>
      </span>

      <span className={styles.price}>
        <b>{naira(listing.pricing.amount)}</b>
        <span> / {listing.pricing.period}</span>
      </span>
    </button>
  );
}