"use client";

// ============================================================================
// FilterSheet (Step 4)
//
// Tabs: Budget · Room · Area · More. Budget is first. One tab shows at a time
// so each view fits without scrolling (HousingAnywhere and VRBO put every
// filter in one long scroll, which makes people hunt).
//
// It reuses the BottomSheet shell from Step 2, so it automatically gets:
//   - a bottom sheet under 1024px, a centred modal at 1024px and wider
//   - the X, backdrop tap, Escape and drag-down close paths
//   - a footer that never scrolls away
//
// Filters apply the moment a student taps them. The footer shows how many
// places match RIGHT NOW ("Show 7 places"), so every tap gives feedback.
// Tapping a selected option again clears it.
// ============================================================================

import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import BottomSheet from "../ui/bottomsheet/BottomSheet";
import { LISTINGS } from "../home/listingcard/data";
import {
  AREA_OPTIONS,
  BUDGET_OPTIONS,
  ROOM_OPTIONS,
  applyFilters,
} from "./filter-config";
import type { SheetMode } from "./filter-types";
import { useFilters } from "./FilterProvider";
import { listingFilterFields } from "./listing-fields";
import styles from "./FilterSheet.module.css";

type TabId = "budget" | "room" | "area" | "more";

const TABS: { id: TabId; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "room", label: "Room" },
  { id: "area", label: "Area" },
  { id: "more", label: "More" },
];

// Which tab opens first depends on which chip the student tapped.
// The UNIDEL chip and the search icon ("uni" and "all") open on Budget.
function startTab(mode: SheetMode): TabId {
  return mode === "room" || mode === "area" || mode === "more" ? mode : "budget";
}

// ----------------------------------------------------------------------------
// The sheet itself: opens and closes, and owns the footer.
// ----------------------------------------------------------------------------

export function FilterSheet() {
  const { filters, sheetMode, closeSheet, clearFilters, activeCount } =
    useFilters();

  // Live count: the same filtering the feed uses, so they always agree.
  const count = applyFilters(LISTINGS, filters, listingFilterFields).length;

  const showLabel =
    count === 0
      ? "No places match"
      : count === 1
        ? "Show 1 place"
        : `Show ${count} places`;

  return (
    <BottomSheet
      open={sheetMode !== null}
      onClose={closeSheet}
      title="Filters"
      label="Filters"
      footer={
        <div className={styles.footerRow}>
          <button
            type="button"
            className={styles.clear}
            onClick={clearFilters}
            disabled={activeCount === 0}
          >
            Clear all
          </button>
          <button type="button" className={styles.show} onClick={closeSheet}>
            {showLabel}
          </button>
        </div>
      }
    >
      {/* BottomSheet only mounts its children while open, so FilterPanel starts
          fresh on the right tab every time the sheet opens. */}
      <FilterPanel mode={sheetMode ?? "budget"} />
    </BottomSheet>
  );
}

export default FilterSheet;

// ----------------------------------------------------------------------------
// One tappable option (a room type, an area, a budget band).
// ----------------------------------------------------------------------------

function Option({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.option} ${selected ? styles.optionOn : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ----------------------------------------------------------------------------
// The tabs and their content.
// ----------------------------------------------------------------------------

function FilterPanel({ mode }: { mode: SheetMode }) {
  const { filters, setFilter } = useFilters();
  const [tab, setTab] = useState<TabId>(() => startTab(mode));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();

  // A small dot on a tab means "a filter is on in here".
  const isOn: Record<TabId, boolean> = {
    budget: filters.budget !== null,
    room: filters.room !== null,
    area: filters.area !== null,
    more: filters.verified,
  };

  // Left / Right arrows move between tabs (same as the listing detail tabs).
  function onTabKeyDown(e: ReactKeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();

    const next =
      e.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;

    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      {/* Only the search icon opens the sheet in "all" mode. A proper search
          experience comes in its own step; this keeps the icon useful. */}
      {mode === "all" ? (
        <div className={styles.searchWrap}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search by name or area"
            aria-label="Search by name or area"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
        </div>
      ) : null}

      <div className={styles.tabs} role="tablist" aria-label="Filter groups">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`${styles.tab} ${tab === t.id ? styles.tabOn : ""}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {t.label}
            {isOn[t.id] ? (
              <>
                <span className={styles.dot} aria-hidden />
                <span className={styles.sr}>, filter on</span>
              </>
            ) : null}
          </button>
        ))}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id={`${uid}-panel-${tab}`}
        aria-labelledby={`${uid}-tab-${tab}`}
      >
        {tab === "budget" ? (
          <>
            <div className={styles.options}>
              {BUDGET_OPTIONS.map((o) => (
                <Option
                  key={o.value}
                  label={o.label}
                  selected={filters.budget === o.value}
                  onClick={() =>
                    setFilter("budget", filters.budget === o.value ? null : o.value)
                  }
                />
              ))}
            </div>
            <p className={styles.hint}>Rent per year. Tap again to clear.</p>
          </>
        ) : null}

        {tab === "room" ? (
          <>
            <div className={styles.options}>
              {ROOM_OPTIONS.map((r) => (
                <Option
                  key={r}
                  label={r}
                  selected={filters.room === r}
                  onClick={() => setFilter("room", filters.room === r ? null : r)}
                />
              ))}
            </div>
            <p className={styles.hint}>Tap again to clear.</p>
          </>
        ) : null}

        {tab === "area" ? (
          <>
            <div className={styles.options}>
              {AREA_OPTIONS.map((a) => (
                <Option
                  key={a}
                  label={a}
                  selected={filters.area === a}
                  onClick={() => setFilter("area", filters.area === a ? null : a)}
                />
              ))}
            </div>
            <p className={styles.hint}>Areas around UNIDEL. Tap again to clear.</p>
          </>
        ) : null}

        {tab === "more" ? (
          <button
            type="button"
            role="switch"
            aria-checked={filters.verified}
            className={styles.switchRow}
            onClick={() => setFilter("verified", !filters.verified)}
          >
            <span className={styles.switchText}>
              <b>Verified only</b>
              <span>Only places UniNest has verified</span>
            </span>
            <span
              className={`${styles.track} ${filters.verified ? styles.trackOn : ""}`}
              aria-hidden
            >
              <span className={styles.thumb} />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}