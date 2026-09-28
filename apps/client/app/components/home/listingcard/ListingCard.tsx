"use client";

// ============================================================================
// ListingCard v3
//
// The discovery card. Its job: give the student enough to decide
// "is this place worth opening?"
//
// What is new in v3:
//   1. The photo is a sideways swipe carousel (CSS scroll-snap, no library).
//   2. Dots show which photo you are on.
//   3. A small up-arrow in a glass circle says "tap to open a quick look".
//   4. The FIRST card the student sees plays a one-time "peek": its photos
//      slide left a little and back, teaching that the photo can be swiped.
//   5. Layering: the photo sits ABOVE the stretched name overlay, so swipes
//      reach the carousel. Tapping the photo (a click, which a swipe does not
//      produce) opens the sheet. The name button is still the keyboard and
//      screen-reader way to open.
//
// HYDRATION RULE (unchanged): the server and browser must render the same
// HTML. So no Date.now(), no random values while rendering. The peek and the
// dots only run AFTER the page is in the browser (inside useEffect / events).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Clock,
  HardHat,
  Heart,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Listing } from "./types";
import { placeholderScene } from "./placeholder-scene";
import styles from "./ListingCard.module.css";

type Props = {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  onOpen?: (id: string) => void;
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

// ----------------------------------------------------------------------------
// One-time peek bookkeeping.
//
// `peekPlayed` lives at module level, so all cards share it: once ANY card has
// peeked, no other card will. sessionStorage makes it survive a page reload
// within the same tab (wrapped in try/catch because private modes can block it).
// ----------------------------------------------------------------------------
const PEEK_KEY = "uninest-peek-played";
let peekPlayed = false;

// ----------------------------------------------------------------------------
// Trust / payment signals: at most two, warnings first.
// ----------------------------------------------------------------------------

 export type Signal = {
  text: string;
  tone: "warn" | "good" | "neutral";
};

export function getSignals(l: Listing): Signal[] {
  if (l.kind === "rented") return [];

  const out: Signal[] = [];

  const fee = l.contact?.inspectionFee;
  const years = l.paymentOptions?.requiresUpfrontYears;

  if (fee) {
    out.push({ text: `${naira(fee.amount)} to inspect`, tone: "warn" });
  }

  if (years) {
    out.push({ text: `${years} yrs upfront`, tone: "warn" });
  }

  if (fee === null) {
    out.push({ text: "No inspection fee", tone: "good" });
  } else if (fee === undefined && l.contact) {
    out.push({ text: "Fee not confirmed", tone: "neutral" });
  }

  return out.slice(0, 2);
}

// ----------------------------------------------------------------------------
// State chip on the photo (bottom-left).
// ----------------------------------------------------------------------------

function getPhotoChip(
  l: Listing,
): { text: string; icon: "hat" | "clock" | null } | null {
  switch (l.kind) {
    case "construction":
      return {
        text:
          l.constructionProgress != null
            ? `${l.constructionProgress}% built`
            : "Under construction",
        icon: "hat",
      };

    case "expiring":
      // We don't calculate "Opens in N days" here: Date.now() differs between
      // server and browser and would break hydration. A live countdown comes later.
      return { text: "Frees up soon", icon: "clock" };

    case "rented":
      return { text: "Rented", icon: null };

    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// CARD
// ----------------------------------------------------------------------------

export function ListingCard({
  listing,
  saved,
  onToggleSave,
  onOpen,
}: Props) {
  const signals = getSignals(listing);
  const chip = getPhotoChip(listing);
  const km = listing.location.distanceFromUniversityKm;
  const isBuild = listing.kind === "construction";

  // Build the list of photos to show. If a photo has a real url, use it;
  // otherwise draw the placeholder for that photo position (0, 1, 2).
  // If a listing somehow has no images at all, we still show one placeholder.
  const slides = useMemo(() => {
    const source =
      listing.images && listing.images.length > 0
        ? listing.images
        : [{ id: `${listing.id}-ph`, url: "", alt: listing.name }];

    return source.map((img, i) => ({
      key: img.id,
      alt: img.alt,
      src: img.url || placeholderScene(listing.id, isBuild, i),
    }));
  }, [listing.id, listing.images, listing.name, isBuild]);

  const count = slides.length;

  const cardRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // Which photo is showing (drives the active dot).
  const [active, setActive] = useState(0);

  // --------------------------------------------------------------------------
  // Dots follow the scroll position.
  // Scroll events fire many times per frame, so we only work once per frame
  // (requestAnimationFrame) and only update state when the photo number changes.
  // --------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;

      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActive(Math.min(Math.max(index, 0), count - 1));
    });
  }, [count]);

  // Stop any pending animation frame if the card leaves the page.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // The one-time peek.
  // Plays on the first card that becomes at least 60% visible. Skipped when
  // there is only one photo, when it already played this session, or when the
  // person prefers reduced motion.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (count < 2 || peekPlayed) return;

    try {
      if (sessionStorage.getItem(PEEK_KEY) === "1") {
        peekPlayed = true;
        return;
      }
    } catch {
      // storage blocked: fine, the module flag still limits it to once per load
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          observer.disconnect();

          // Another card may have peeked while we were waiting.
          if (peekPlayed) return;
          peekPlayed = true;
          try {
            sessionStorage.setItem(PEEK_KEY, "1");
          } catch {
            // ignore
          }

          // Slide every photo left ~34px and back over 1.2s. Because photos
          // sit side by side, the next photo slides into view at the edge.
          const imgs = scrollerRef.current?.querySelectorAll("img");
          imgs?.forEach((img) => {
            img.animate(
              [
                { transform: "translateX(0)", offset: 0 },
                { transform: "translateX(-34px)", offset: 0.4 },
                { transform: "translateX(-34px)", offset: 0.55 },
                { transform: "translateX(0)", offset: 1 },
              ],
              { duration: 1200, easing: "ease-in-out" },
            );
          });
          return;
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [count]);

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${
        listing.kind === "rented" ? styles.rented : ""
      }`}
    >
      {/* ====================================================================
          PHOTO AREA (sits above the stretched name overlay)
          ==================================================================== */}

      <div className={styles.media}>
        {/* The swipeable strip. A click here (a tap, NOT a swipe) opens the
            sheet. Keyboard users use the name button below instead. */}
        <div
          ref={scrollerRef}
          className={styles.scroller}
          onScroll={handleScroll}
          onClick={() => onOpen?.(listing.id)}
        >
          {slides.map((s) => (
            <div key={s.key} className={styles.slide}>
              <img
                className={styles.img}
                src={s.src}
                alt={s.alt}
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Everything below is decoration on top of the photo. None of it is
            tappable, so pointer-events: none (in CSS) lets swipes and taps
            pass straight through to the strip underneath. */}

        {listing.verified ? (
          <span className={styles.verified}>
            <ShieldCheck size={12} aria-hidden />
            Verified
          </span>
        ) : null}

        {chip ? (
          <span className={styles.chip}>
            {chip.icon === "hat" ? <HardHat size={12} aria-hidden /> : null}
            {chip.icon === "clock" ? <Clock size={12} aria-hidden /> : null}
            {chip.text}
          </span>
        ) : null}

        {isBuild && listing.constructionProgress != null ? (
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="Construction progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={listing.constructionProgress}
          >
            <i style={{ width: `${listing.constructionProgress}%` }} />
          </div>
        ) : null}

        {/* Dots: only when there is more than one photo. */}
        {count > 1 ? (
          <div className={styles.dots} aria-hidden>
            {slides.map((s, i) => (
              <span
                key={s.key}
                className={`${styles.dot} ${i === active ? styles.dotOn : ""}`}
              />
            ))}
          </div>
        ) : null}

        {/* Up-arrow: points up because the sheet rises from below. */}
        <span className={styles.arrow} aria-hidden>
          <ArrowUp size={16} />
        </span>
      </div>

      {/* ====================================================================
          SAVE / HEART (direct child of the card, highest layer)
          ==================================================================== */}

      <button
        type="button"
        className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
        aria-label={
          saved ? `Remove ${listing.name} from saved` : `Save ${listing.name}`
        }
        aria-pressed={!!saved}
        onClick={() => onToggleSave?.(listing.id)}
      >
        <span>
          <Heart size={16} />
        </span>
      </button>

      {/* ====================================================================
          CARD INFORMATION
          ==================================================================== */}

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>
            {/* The real, keyboard-accessible button. CSS stretches its tap
                area over the card, but the photo and heart sit above it. */}
            <button
              type="button"
              className={styles.open}
              onClick={() => onOpen?.(listing.id)}
            >
              {listing.name}
            </button>
          </h3>

          {listing.rating ? (
            <span className={styles.rating}>
              <Star size={12} aria-hidden />
              {listing.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <p className={styles.sub}>
          {km != null ? `${km} km · ` : ""}
          {listing.location.area}
        </p>

        <p className={styles.price}>
          <b>{naira(listing.pricing.amount)}</b>
          <span> / {listing.pricing.period}</span>
        </p>

        {signals.length > 0 ? (
          <div className={styles.signals}>
            {signals.map((s) => (
              <span
                key={s.text}
                className={`${styles.signal} ${styles[s.tone]}`}
              >
                {s.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}