"use client";

// ============================================================================
// FilterSheet
//
// Tabs: Budget · Room · Area · More. Budget is first. One tab shows at a time
// so each view fits without a long scroll.
//
//   Area tab: areas are drawn from currently loaded listing records.
//   More tab: six on/off switches in four groups, each answering one of the
//             student's jobs (trust, payment, safety, availability).
//
// It reuses the BottomSheet shell, so it is a bottom sheet under 1024px and a
// centred modal at 1024px and wider, with the X, backdrop, Escape and
// drag-down close paths and a footer that never scrolls away.
//
// Filters apply the moment a student taps them. The footer shows how many
// places match RIGHT NOW ("Show 7 places"). Tapping a selected option again
// clears it.
// ============================================================================

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import BottomSheet from "../ui/bottomsheet/BottomSheet";
import { useListings } from "../../lib/listings-provider";
import { CAMPUSES } from "../../config/campuses";
import { BUDGET_OPTIONS, countMoreFilters } from "./filter-config";
import type { SheetMode } from "./filter-types";
import { useFilters } from "./FilterProvider";
import { ROOM_LABELS } from "./listing-fields";
import styles from "./FilterSheet.module.css";

type TabId = "campus" | "budget" | "room" | "area" | "amenities" | "more";

const TABS: { id: TabId; label: string }[] = [
  { id: "campus", label: "Campus" },
  { id: "budget", label: "Budget" },
  { id: "room", label: "Room" },
  { id: "area", label: "Area" },
  { id: "amenities", label: "Amenities" },
  { id: "more", label: "More" },
];

// The switches in the More tab, grouped by the question they answer.
// To add a switch: add its key to Filters (filter-types.ts), then add a row here.
type MoreKey = "ownerOnly" | "noFee" | "lowUpfront" | "gated" | "hideRented";

const MORE_GROUPS: {
  title: string;
  items: { key: MoreKey; title: string; hint: string }[];
}[] = [
  {
    title: "Trust",
    items: [
      {
        key: "ownerOnly",
        title: "Owner, not an agent",
        hint: "You deal directly with the owner",
      },
    ],
  },
  {
    title: "Payment",
    items: [
      {
        key: "noFee",
        title: "Confirmed no inspection fee",
        hint: "Hides places that charge, or where it is not confirmed",
      },
      {
        key: "lowUpfront",
        title: "One year or less upfront",
        hint: "Hides places asking for more, or not reported",
      },
    ],
  },
  {
    title: "Safety",
    items: [
      {
        key: "gated",
        title: "Gated compound",
        hint: "Hides places not confirmed as gated",
      },
    ],
  },
  {
    title: "Availability",
    items: [
      {
        key: "hideRented",
        title: "Hide rented places",
        hint: "Only places you can still get",
      },
    ],
  },
];

// Which tab opens first depends on which chip the student tapped.
function startTab(mode: SheetMode): TabId {
  return mode === "campus" ||
    mode === "room" ||
    mode === "area" ||
    mode === "amenities" ||
    mode === "more"
    ? mode
    : "budget";
}

// ----------------------------------------------------------------------------
// The sheet itself: opens and closes, and owns the footer.
// ----------------------------------------------------------------------------

export function FilterSheet() {
  const {
    sheetMode,
    closeSheet,
    clearFilters,
    activeCount,
    campusPreferenceError,
  } = useFilters();

  // Live count: the same filtering the feed uses, so they always agree.
  const { discoveryCount, discoveryStatus, reload } = useListings();
  const count = discoveryCount;

  const showLabel =
    discoveryStatus === "loading"
      ? "Loading places…"
      : discoveryStatus === "error"
        ? "Try loading again"
        : count === 0
          ? "No places match"
          : count === 1
            ? "Show 1 place"
            : `Show ${count} places`;

  return (
    <BottomSheet
      open={sheetMode !== null && sheetMode !== "all"}
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
          <button
            type="button"
            className={styles.show}
            disabled={discoveryStatus === "loading"}
            onClick={discoveryStatus === "error" ? reload : closeSheet}
          >
            {showLabel}
          </button>
        </div>
      }
    >
      {campusPreferenceError ? (
        <p className={styles.preferenceError} role="alert">
          {campusPreferenceError}
        </p>
      ) : null}
      {/* BottomSheet only mounts its children while open, so FilterPanel starts
          fresh on the right tab every time the sheet opens. */}
      <FilterPanel mode={sheetMode ?? "budget"} />
    </BottomSheet>
  );
}

export default FilterSheet;

// ----------------------------------------------------------------------------
// One tappable option (a room type, an area, or a budget band).
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
// One on/off row in the More tab.
// ----------------------------------------------------------------------------

function SwitchRow({
  title,
  hint,
  on,
  onToggle,
}: {
  title: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={styles.switchRow}
      onClick={onToggle}
    >
      <span className={styles.switchText}>
        <b>{title}</b>
        <span>{hint}</span>
      </span>
      <span
        className={`${styles.track} ${on ? styles.trackOn : ""}`}
        aria-hidden
      >
        <span className={styles.thumb} />
      </span>
    </button>
  );
}

// ----------------------------------------------------------------------------
// The tabs and their content.
// ----------------------------------------------------------------------------

function FilterPanel({ mode }: { mode: SheetMode }) {
  const { filters, setFilter, setCampusPreference } = useFilters();
  const { listings } = useListings();
  const [tab, setTab] = useState<TabId>(() => startTab(mode));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const uid = useId();

  // A small dot on a tab means "a filter is on in here".
  const isOn: Record<TabId, boolean> = {
    campus: filters.campus !== null,
    budget: filters.budget !== null,
    room: filters.room !== null,
    area: filters.area !== null,
    amenities: filters.amenities.length > 0,
    more: countMoreFilters(filters) > 0,
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
        {tab === "campus" ? (
          <>
            <p className={styles.hint}>
              Filter by a campus explicitly recorded on each listing. This is a
              manual preference, not a course-to-campus recommendation.
            </p>
            <div className={styles.options}>
              {CAMPUSES.map((campus) => (
                <Option
                  key={campus.id}
                  label={campus.label}
                  selected={filters.campus === campus.id}
                  onClick={() =>
                    setCampusPreference(
                      filters.campus === campus.id ? null : campus.id,
                    )
                  }
                />
              ))}
            </div>
          </>
        ) : null}

        {tab === "budget" ? (
          <>
            <div className={styles.options}>
              {BUDGET_OPTIONS.map((o) => (
                <Option
                  key={o.value}
                  label={o.label}
                  selected={filters.budget === o.value}
                  onClick={() =>
                    setFilter(
                      "budget",
                      filters.budget === o.value ? null : o.value,
                    )
                  }
                />
              ))}
            </div>
            <p className={styles.hint}>
              Based on the listed amount. Check each listing’s pricing period.
            </p>
          </>
        ) : null}

        {tab === "room" ? (
          <>
            <div className={styles.options}>
              {[
                ...new Set(
                  listings.map((listing) => ROOM_LABELS[listing.roomType]),
                ),
              ]
                .filter(Boolean)
                .map((r) => (
                  <Option
                    key={r}
                    label={r}
                    selected={filters.room === r}
                    onClick={() =>
                      setFilter("room", filters.room === r ? null : r)
                    }
                  />
                ))}
            </div>
            <p className={styles.hint}>Tap again to clear.</p>
          </>
        ) : null}

        {tab === "area" ? (
          <>
            <h3 className={styles.groupTitle}>Area</h3>
            <div className={styles.options}>
              {[...new Set(listings.map((listing) => listing.location.area))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map((a) => (
                  <Option
                    key={a}
                    label={a}
                    selected={filters.area === a}
                    onClick={() =>
                      setFilter("area", filters.area === a ? null : a)
                    }
                  />
                ))}
            </div>
            <p className={styles.hint}>Tap again to clear.</p>
          </>
        ) : null}

        {tab === "amenities" ? (
          <>
            <h3 className={styles.groupTitle}>Amenities</h3>
            <div className={styles.options}>
              {[...new Set(listings.flatMap((listing) => listing.amenities))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .map((amenity) => (
                  <Option
                    key={amenity}
                    label={amenity}
                    selected={filters.amenities.includes(amenity)}
                    onClick={() =>
                      setFilter(
                        "amenities",
                        filters.amenities.includes(amenity)
                          ? filters.amenities.filter((item) => item !== amenity)
                          : [...filters.amenities, amenity],
                      )
                    }
                  />
                ))}
            </div>
            <p className={styles.hint}>
              Listings must include every selected amenity.
            </p>
          </>
        ) : null}

        {tab === "more" ? (
          <>
            {MORE_GROUPS.map((group) => (
              <section key={group.title} className={styles.group}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                {group.items.map((item) => (
                  <SwitchRow
                    key={item.key}
                    title={item.title}
                    hint={item.hint}
                    on={filters[item.key]}
                    onToggle={() => setFilter(item.key, !filters[item.key])}
                  />
                ))}
              </section>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
