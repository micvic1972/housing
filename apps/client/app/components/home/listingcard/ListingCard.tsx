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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowUp,
  ArrowRight,
  Clock,
  HardHat,
  Heart,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import Link from "next/link";
import type { Listing } from "./types";
import { placeholderScene } from "./placeholder-scene";
import {
  getListingStatusLabel,
  isListingUnavailable,
} from "../../../lib/listing-status";
import { campusLabel } from "../../../config/campuses";
import { ROOM_LABELS } from "../../filter/listing-fields";
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
  const locationParts = [
    campusLabel(listing.location.campus) ?? listing.location.campus,
    listing.location.area,
    listing.location.landmark,
  ].filter((part): part is string => Boolean(part));
  const location = [...new Set(locationParts)].join(" · ");
  const amenities = listing.amenities.slice(0, 2).join(" · ");

  // Empty image records are API placeholders, not separate photos.
  const slides = useMemo(() => {
    const source = listing.images.filter((image) => image.url.trim());

    if (source.length === 0) {
      const fallback = placeholderScene(listing.id, isBuild, 0);
      return [
        {
          key: `${listing.id}-placeholder`,
          alt: `${listing.name} illustration`,
          src: fallback,
          fallback,
        },
      ];
    }
    return source.map((img, i) => ({
      key: img.id,
      alt: img.alt || listing.name,
      src: img.url,
      fallback: placeholderScene(listing.id, isBuild, i),
    }));
  }, [listing.id, listing.images, listing.name, isBuild]);

  const count = slides.length;

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

  function openCardFromContent(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("button, a, summary, [role='button']")
    ) {
      return;
    }
    onOpen?.(listing.id);
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

  return (
    <article
      className={`${styles.card} ${
        isListingUnavailable(listing) ? styles.unavailable : ""
      }`}
      onClick={openCardFromContent}
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
            </div>
          </details>
        </div>

        {location ? <p className={styles.sub}>{location}</p> : null}

        <p className={styles.type}>{ROOM_LABELS[listing.roomType]}</p>

        <p className={styles.price}>
          <b>{naira(listing.pricing.amount)}</b>
          <span> / {listing.pricing.period}</span>
        </p>

        {amenities ? <p className={styles.amenities}>{amenities}</p> : null}

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

        {signals[0] ? (
          <p className={`${styles.fact} ${styles[signals[0].tone]}`}>
            {signals[0].text}
          </p>
        ) : null}
      </div>
    </article>
  );
}