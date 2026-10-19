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
//   5. Photo and title open Quick View; dedicated links and the actions menu
//      open the shareable detail page without nesting interactive controls.
//
// HYDRATION RULE (unchanged): the server and browser must render the same
// HTML. So no Date.now(), no random values while rendering. The peek and the
// dots only run AFTER the page is in the browser (inside useEffect / events).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowRight,
  Clock,
  ExternalLink,
  HardHat,
  Heart,
  MoreHorizontal,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { Listing } from "./types";
import { placeholderScene } from "./placeholder-scene";
import {
  getListingStatusLabel,
  isListingUnavailable,
} from "../../../lib/listing-status";
import { shareListing } from "../../../lib/share-listing";
import styles from "./ListingCard.module.css";

type Props = {
  listing: Listing;
  saved?: boolean;
  savingDisabled?: boolean;
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
const PEEK_KEY = "delta-housing-peek-played";
let peekPlayed = false;

// ----------------------------------------------------------------------------
// Trust / payment signals: at most two, warnings first.
// ----------------------------------------------------------------------------

 export type Signal = {
  text: string;
  tone: "warn" | "good" | "neutral";
};

export function getSignals(l: Listing): Signal[] {
  if (isListingUnavailable(l)) return [];

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
  const text = getListingStatusLabel(l);
  if (!text) return null;

  const constructionProgress =
    l.kind === "construction" && l.constructionProgress != null
      ? `${l.constructionProgress}% built`
      : null;
  const label = constructionProgress ?? text;
  const icon =
    label === "Under construction" || constructionProgress
      ? "hat"
      : label === "Frees up soon"
        ? "clock"
        : null;

  return { text: label, icon };
}

// ----------------------------------------------------------------------------
// CARD
// ----------------------------------------------------------------------------

export function ListingCard({
  listing,
  saved,
  savingDisabled,
  onToggleSave,
  onOpen,
}: Props) {
  const signals = getSignals(listing);
  const chip = getPhotoChip(listing);
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
      fallback: placeholderScene(listing.id, isBuild, i),
    }));
  }, [listing.id, listing.images, listing.name, isBuild]);

  const count = slides.length;

  const cardRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // Which photo is showing (drives the active dot).
  const [active, setActive] = useState(0);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "copied" | "error"
  >("idle");
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (shareStatus === "idle") return;
    const timeout = window.setTimeout(() => setShareStatus("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  async function shareCurrentListing() {
    menuRef.current?.removeAttribute("open");
    try {
      const result = await shareListing(listing);
      if (result !== "cancelled") setShareStatus(result);
    } catch {
      setShareStatus("error");
    }
  }

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
        isListingUnavailable(listing) ? styles.unavailable : ""
      }`}
    >
      {/* ====================================================================
          PHOTO AREA
          ==================================================================== */}

      <div className={styles.media}>
        {/* Photo and title open Quick View; the explicit link opens the full page. */}
        <div
          ref={scrollerRef}
          className={styles.scroller}
          onScroll={handleScroll}
          role="button"
          tabIndex={0}
          aria-label={`Quick look at ${listing.name}`}
          onClick={() => onOpen?.(listing.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen?.(listing.id);
            }
          }}
        >
          {slides.map((s) => (
            <div key={s.key} className={styles.slide}>
              <img
                className={styles.img}
                src={s.src}
                alt={s.alt}
                loading="lazy"
                draggable={false}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = s.fallback;
                }}
              />
            </div>
          ))}
        </div>

        {/* These trust and carousel indicators are decorative, so their
            pointer-events: none styling lets swipes reach the photo strip. */}

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

        <button
          type="button"
          className={styles.quickLook}
          aria-label={`Quick look at ${listing.name}`}
          onClick={() => onOpen?.(listing.id)}
        >
          <ArrowUp size={16} />
          <span>Quick look</span>
        </button>
      </div>

      {/* ====================================================================
          SAVE / HEART (direct child of the card, highest layer)
          ==================================================================== */}

      <button
        type="button"
        className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
        disabled={savingDisabled}
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
            <button
              type="button"
              className={styles.open}
              onClick={() => onOpen?.(listing.id)}
            >
              {listing.name}
            </button>
          </h3>
          <details className={styles.menu} ref={menuRef}>
            <summary aria-label={`More actions for ${listing.name}`}>
              <MoreHorizontal size={19} aria-hidden />
            </summary>
            <div className={styles.menuPanel}>
              <button type="button" onClick={shareCurrentListing}>
                <Share2 size={15} aria-hidden />
                Share listing
              </button>
              <Link href={`/listings/${encodeURIComponent(listing.id)}`}>
                <ExternalLink size={15} aria-hidden />
                Open full listing
              </Link>
            </div>
          </details>
        </div>

        <p className={styles.sub}>
          {listing.location.area}
        </p>

        <p className={styles.price}>
          <b>{naira(listing.pricing.amount)}</b>
          <span> / {listing.pricing.period}</span>
        </p>

        <Link
          href={`/listings/${encodeURIComponent(listing.id)}`}
          className={styles.fullPage}
        >
          View full listing <ArrowRight size={15} aria-hidden />
        </Link>
        {shareStatus !== "idle" ? (
          <span
            className={styles.shareFeedback}
            role={shareStatus === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {shareStatus === "shared"
              ? "Share sheet opened."
              : shareStatus === "copied"
                ? "Link copied."
                : "Could not share this link."}
          </span>
        ) : null}

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