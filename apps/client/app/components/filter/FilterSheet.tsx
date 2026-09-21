"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { AREA_OPTIONS, BUDGET_OPTIONS, ROOM_OPTIONS, UNIVERSITY } from "./filter-config";
import type { Filters, SheetMode } from "./filter-types";
import { useFilters } from "./FilterProvider";
import styles from "./FilterSheet.module.css";

const TITLES: Record<SheetMode, string> = {
  all: "Search and filter",
  uni: "University",
  budget: "Budget per year",
  room: "Room type",
  area: "Area",
  more: "More filters",
};

type Props = {
  /** How many places match right now. Shown on the button: "Show 4 places". */
  resultCount?: number;
};

/**
 * The bottom sheet where filters are chosen. It slides up on phones and appears as a centred
 * card on laptops. Built on the browser's native <dialog>, so Escape, tapping outside, focus
 * trapping and returning focus all work without extra code.
 *
 * Opened by the chips (one group) or by the search icon in the tabs ("all": search box + every group).
 * Render it once, next to the feed.
 */
export function FilterSheet({ resultCount }: Props) {
  const { filters, setFilter, clearFilters, sheetMode, closeSheet } = useFilters();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState(filters.q);

  // Open and close the native dialog when the shared state changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (sheetMode && !dialog.open) dialog.showModal();
    if (!sheetMode && dialog.open) dialog.close();
  }, [sheetMode]);

  // Stop the page behind from scrolling while the sheet is open.
  useEffect(() => {
    if (!sheetMode) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetMode]);

  // Search as the student types, but wait a moment so the list does not jump on every letter.
  useEffect(() => {
    if (query.trim() === filters.q) return;
    const id = setTimeout(() => setFilter("q", query.trim()), 250);
    return () => clearTimeout(id);
  }, [query, filters.q, setFilter]);

  // If the search text is cleared from somewhere else, clear the box too.
  useEffect(() => {
    setQuery((prev) => (prev.trim() === filters.q ? prev : filters.q));
  }, [filters.q]);

  const showBudget = sheetMode === "all" || sheetMode === "budget";
  const showRoom = sheetMode === "all" || sheetMode === "room";
  const showArea = sheetMode === "all" || sheetMode === "area";
  const showMore = sheetMode === "all" || sheetMode === "more";

  /** Pick a value. In single-group mode the sheet closes; in "all" mode it stays open. */
  function choose<K extends "budget" | "room" | "area">(key: K, value: Filters[K]) {
    setFilter(key, value);
    if (sheetMode !== "all") closeSheet();
  }

  function toggleVerified() {
    setFilter("verified", !filters.verified);
    if (sheetMode !== "all") closeSheet();
  }

  function clearAll() {
    setQuery("");
    clearFilters();
  }

  const applyLabel =
    resultCount === undefined
      ? "Show results"
      : `Show ${resultCount} ${resultCount === 1 ? "place" : "places"}`;

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={closeSheet}
      onClick={(e) => {
        // A tap on the dimmed area behind the sheet lands on the <dialog> itself.
        if (e.target === e.currentTarget) closeSheet();
      }}
    >
      {sheetMode ? (
        <>
          <div className={styles.grab} aria-hidden />
          <div className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {TITLES[sheetMode]}
            </h2>
            <button type="button" className={styles.close} onClick={closeSheet} aria-label="Close">
              <X size={22} aria-hidden />
            </button>
          </div>

          <div className={styles.body}>
            {sheetMode === "all" ? (
              <label className={styles.search}>
                <Search size={19} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search by name or area"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-label="Search places"
                />
              </label>
            ) : null}

            {sheetMode === "uni" ? (
              <>
                <div className={styles.options}>
                  <Option label={UNIVERSITY} pressed onClick={closeSheet} />
                </div>
                <p className={styles.note}>More universities arrive after launch.</p>
              </>
            ) : null}

            {showBudget ? (
              <Group title="Budget per year">
                <Option label="Any" pressed={!filters.budget} onClick={() => choose("budget", null)} />
                {BUDGET_OPTIONS.map((o) => (
                  <Option key={o.value} label={o.label} pressed={filters.budget === o.value} onClick={() => choose("budget", o.value)} />
                ))}
              </Group>
            ) : null}

            {showRoom ? (
              <Group title="Room type">
                <Option label="Any" pressed={!filters.room} onClick={() => choose("room", null)} />
                {ROOM_OPTIONS.map((r) => (
                  <Option key={r} label={r} pressed={filters.room === r} onClick={() => choose("room", r)} />
                ))}
              </Group>
            ) : null}

            {showArea ? (
              <Group title="Area">
                <Option label="Any" pressed={!filters.area} onClick={() => choose("area", null)} />
                {AREA_OPTIONS.map((a) => (
                  <Option key={a} label={a} pressed={filters.area === a} onClick={() => choose("area", a)} />
                ))}
              </Group>
            ) : null}

            {showMore ? (
              <Group title="Trust">
                <Option
                  label="Verified only"
                  icon={<ShieldCheck size={16} aria-hidden />}
                  pressed={filters.verified}
                  onClick={toggleVerified}
                />
              </Group>
            ) : null}
          </div>

          <div className={styles.foot}>
            <button type="button" className={styles.clear} onClick={clearAll}>
              Clear all
            </button>
            <button type="button" className={styles.apply} onClick={closeSheet}>
              {applyLabel}
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <div className={styles.options}>{children}</div>
    </section>
  );
}

function Option({
  label,
  pressed,
  onClick,
  icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button type="button" className={styles.option} aria-pressed={pressed} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}