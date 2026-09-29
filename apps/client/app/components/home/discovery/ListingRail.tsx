"use client";

// ============================================================================
// ListingRail
//
// One titled row of cards that scrolls sideways.
//
// Signifiers (Don Norman): a student must be able to SEE that this scrolls.
//   1. PEEK: the next card is always partly visible (done in the CSS width).
//   2. EDGE FADE: the side with more content fades out. This file only tracks
//      WHICH sides have more (data-left / data-right); the CSS draws the fade.
//   3. ARROWS: for mouse and trackpad users, who cannot swipe. Hidden on touch
//      devices (also in CSS).
//
// Hooks must run before any early return, so the "empty rail" check sits
// after all of them.
// ============================================================================

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing } from "../listingcard/types";
import { ListingCard } from "../listingcard/ListingCard";

import styles from "./ListingRail.module.css";

interface ListingRailProps {
  title: string;
  reason: string;
  listings: Listing[];

  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;

  /**
   * Optional content shown at the right side of the heading, after the
   * arrows. Not used yet; kept so a "See all" link can be added later
   * without changing the rail itself.
   */
  action?: ReactNode;
}

export default function ListingRail({
  title,
  reason,
  listings,
  saved,
  onToggleSave,
  onOpen,
  action,
}: ListingRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // A unique, valid id for the heading (titles contain spaces, ids must not).
  const headingId = useId();

  // Is there more to see on the left / on the right?
  // Starts as "no" on both, so the server and browser render the same HTML.
  const [edges, setEdges] = useState({ left: false, right: false });

  // Work out which sides have more content. The 2px margin ignores rounding.
  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;

    const left = el.scrollLeft > 2;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;

    // Only update state when something changed (scroll fires very often).
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);

  // While scrolling, check once per animation frame, not on every event.
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      updateEdges();
    });
  }, [updateEdges]);

  // Check when the rail first appears, when the number of cards changes, and
  // whenever the rail is resized (rotating a phone, resizing a window).
  useEffect(() => {
    updateEdges();

    const el = railRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateEdges, listings.length]);

  // Arrow buttons: move by most of one screenful of cards.
  function scrollByPage(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  /**
   * A section with no listings should not leave an empty rail
   * occupying space on the Home feed.
   */
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>

          <p className={styles.reason}>{reason}</p>
        </div>

        <div className={styles.controls}>
          {/* Shown only for mouse and trackpad devices (see the CSS). */}
          <button
            type="button"
            className={styles.arrow}
            aria-label={`Scroll ${title} left`}
            disabled={!edges.left}
            onClick={() => scrollByPage(-1)}
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label={`Scroll ${title} right`}
            disabled={!edges.right}
            onClick={() => scrollByPage(1)}
          >
            <ChevronRight size={20} aria-hidden />
          </button>

          {action ? <div className={styles.action}>{action}</div> : null}
        </div>
      </div>

      <div
        ref={railRef}
        className={styles.rail}
        role="list"
        aria-label={`${title} listings`}
        data-left={edges.left}
        data-right={edges.right}
        onScroll={handleScroll}
      >
        {listings.map((listing) => (
          <div className={styles.item} role="listitem" key={listing.id}>
            <ListingCard
              listing={listing}
              saved={saved.has(listing.id)}
              onToggleSave={onToggleSave}
              onOpen={onOpen}
            />
          </div>
        ))}
      </div>
    </section>
  );
}