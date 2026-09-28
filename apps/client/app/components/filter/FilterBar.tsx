"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { BUDGET_OPTIONS, UNIVERSITY, countMoreFilters } from "./filter-config";
import type { SheetMode } from "./filter-types";
import { useFilters } from "./FilterProvider";
import styles from "./FilterBar.module.css";

/**
 * The compact row of filter chips under the tabs: UNIDEL | Budget | Room type | Area | More.
 * It scrolls sideways on small phones (with the scrollbar hidden) and never takes more than one row.
 * Tapping a chip opens the FilterSheet on that group.
 */
export function FilterBar() {
  const { filters, sheetMode, openSheet } = useFilters();
  const budgetLabel = BUDGET_OPTIONS.find((o) => o.value === filters.budget)?.label;

  // Area chip: an area name wins; otherwise a walking distance; otherwise "Area".
  const areaLabel =
    filters.area ?? (filters.maxKm !== null ? `Within ${filters.maxKm} km` : "Area");
  const areaActive = filters.area !== null || filters.maxKm !== null;

  // More chip: shows how many of its switches are on.
  const moreCount = countMoreFilters(filters);
  const moreLabel = moreCount > 0 ? `More · ${moreCount}` : "More";

  return (
    <div className={styles.bar} role="group" aria-label="Quick filters">
      <Chip label={UNIVERSITY} mode="uni" fixed current={sheetMode} onOpen={openSheet} />
      <Chip label={budgetLabel ?? "Budget"} mode="budget" active={Boolean(budgetLabel)} current={sheetMode} onOpen={openSheet} />
      <Chip label={filters.room ?? "Room type"} mode="room" active={Boolean(filters.room)} current={sheetMode} onOpen={openSheet} />
      <Chip label={areaLabel} mode="area" active={areaActive} current={sheetMode} onOpen={openSheet} />
      <Chip label={moreLabel} mode="more" active={moreCount > 0} current={sheetMode} onOpen={openSheet} icon />
    </div>
  );
}

type ChipProps = {
  label: string;
  mode: SheetMode;
  current: SheetMode | null;
  onOpen: (mode: SheetMode) => void;
  active?: boolean;
  fixed?: boolean;
  icon?: boolean;
};

function Chip({ label, mode, current, onOpen, active, fixed, icon }: ChipProps) {
  return (
    <button
      type="button"
      className={[styles.chip, active && styles.active, fixed && styles.fixed].filter(Boolean).join(" ")}
      aria-haspopup="dialog"
      aria-expanded={current === mode}
      onClick={() => onOpen(mode)}
    >
      {label}
      {icon ? <SlidersHorizontal size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
    </button>
  );
}