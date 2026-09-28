"use client";

// ============================================================================
// ListingCard
//
// This is the discovery card.
// Its job is to give the student enough information to decide:
// "Is this place worth opening?"
//
// IMPORTANT:
// This component must render the SAME HTML on the server and browser.
// That means we avoid values that change while rendering, such as Date.now()
// and dynamically-generated image strings.
// ============================================================================

import { Heart, ShieldCheck, Star, HardHat, Clock } from "lucide-react";
import type { Listing } from "./types";
import styles from "./ListingCard.module.css";

type Props = {
  listing: Listing;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  onOpen?: (id: string) => void;
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

// ============================================================================
// TEMPORARY STABLE PLACEHOLDER
//
// Until real listing photos exist, we use one fixed SVG image.
//
// The previous version generated the SVG during rendering. Even though the
// generator was intended to be deterministic, the browser reported that the
// server and client produced different image src attributes.
//
// A fixed value removes that entire class of hydration mismatch.
// When real listing photos are connected, this placeholder disappears.
// ============================================================================

const PLACEHOLDER_SCENE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="hsl(220,55%,16%)"/>
          <stop offset="1" stop-color="hsl(220,58%,32%)"/>
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="url(#g)"/>

      <circle
        cx="320"
        cy="45"
        r="16"
        fill="hsl(220,85%,84%)"
        opacity=".85"
      />

      <rect
        x="85"
        y="54"
        width="230"
        height="156"
        rx="4"
        fill="hsl(220,36%,20%)"
      />

      <rect x="100" y="64" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="150" y="64" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>
      <rect x="200" y="64" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="250" y="64" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>

      <rect x="100" y="108" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>
      <rect x="150" y="108" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="200" y="108" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="250" y="108" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>

      <rect x="100" y="152" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="150" y="152" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>
      <rect x="200" y="152" width="34" height="28" rx="3" fill="hsl(220,85%,84%)"/>
      <rect x="250" y="152" width="34" height="28" rx="3" fill="hsl(220,32%,29%)"/>

      <rect
        y="210"
        width="400"
        height="90"
        fill="hsl(220,42%,10%)"
      />
    </svg>
  `);

// ============================================================================
// Trust / payment signals
//
// We intentionally show only a small number of important facts on the card.
// The full explanation belongs in the Quick View sheet later.
// ============================================================================

type Signal = {
  text: string;
  tone: "warn" | "good" | "neutral";
};

function getSignals(l: Listing): Signal[] {
  if (l.kind === "rented") return [];

  const out: Signal[] = [];

  const fee = l.contact?.inspectionFee;
  const years = l.paymentOptions?.requiresUpfrontYears;

  if (fee) {
    out.push({
      text: `${naira(fee.amount)} to inspect`,
      tone: "warn",
    });
  }

  if (years) {
    out.push({
      text: `${years} yrs upfront`,
      tone: "warn",
    });
  }

  if (fee === null) {
    out.push({
      text: "No inspection fee",
      tone: "good",
    });
  } else if (fee === undefined && l.contact) {
    out.push({
      text: "Fee not confirmed",
      tone: "neutral",
    });
  }

  return out.slice(0, 2);
}

// ============================================================================
// State chip
//
// This tells the student what is special about the listing without requiring
// them to open it.
// ============================================================================

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
      // IMPORTANT:
      // We deliberately don't calculate "Opens in X days" here.
      // Date.now() changes between server render and browser hydration.
      // "Frees up soon" communicates the same important state without
      // introducing a hydration mismatch.
      return {
        text: "Frees up soon",
        icon: "clock",
      };

    case "rented":
      return {
        text: "Rented",
        icon: null,
      };

    default:
      return null;
  }
}

// ============================================================================
// CARD
// ============================================================================

export function ListingCard({
  listing,
  saved,
  onToggleSave,
  onOpen,
}: Props) {
  const signals = getSignals(listing);
  const chip = getPhotoChip(listing);
  const km = listing.location.distanceFromUniversityKm;

  // If the listing eventually has real photos, use the real photo.
  // Otherwise use our stable placeholder.
  const imageSrc = listing.images?.[0]?.url || PLACEHOLDER_SCENE;

  return (
    <article
      className={`${styles.card} ${
        listing.kind === "rented" ? styles.rented : ""
      }`}
    >
      {/* ====================================================================
          PHOTO
          ==================================================================== */}

      <div className={styles.media}>
        <img
          className={styles.img}
          src={imageSrc}
          alt=""
          loading="lazy"
          draggable={false}
        />

        {/* Verified status */}
        {listing.verified ? (
          <span className={styles.verified}>
            <ShieldCheck size={12} aria-hidden />
            Verified
          </span>
        ) : null}

        {/* Construction / availability / rented state */}
        {chip ? (
          <span className={styles.chip}>
            {chip.icon === "hat" ? (
              <HardHat size={12} aria-hidden />
            ) : null}

            {chip.icon === "clock" ? (
              <Clock size={12} aria-hidden />
            ) : null}

            {chip.text}
          </span>
        ) : null}

        {/* Construction progress */}
        {listing.kind === "construction" &&
        listing.constructionProgress != null ? (
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Construction progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={listing.constructionProgress}
          >
            <i
              style={{
                width: `${listing.constructionProgress}%`,
              }}
            />
          </div>
        ) : null}
      </div>

      {/* ====================================================================
          SAVE / HEART
          ==================================================================== */}

      <button
        type="button"
        className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
        aria-label={
          saved
            ? `Remove ${listing.name} from saved`
            : `Save ${listing.name}`
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
            {/* The listing name is the actual keyboard-accessible button.
                CSS can stretch its clickable area across the card. */}
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