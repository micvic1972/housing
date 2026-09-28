"use client";

// ============================================================================
// ListingCard — ONE listing, shown the way Airbnb shows it: photo first, a few
// short lines of text, no box, no button. The card's only job is to EARN A TAP.
// The detail sheet's job (next step) is to close the decision.
//
// Fluid width on purpose: this card doesn't know whether it sits in a sideways
// rail or a grid. Whatever wraps it decides the width.
// ============================================================================

import { Heart, ShieldCheck, Star, HardHat, Clock } from "lucide-react";
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

/** Whole days from now until `iso` (a snapshot at render time, not a live clock). */
function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

type Signal = { text: string; tone: "warn" | "good" | "neutral" };

/**
 * The trust facts students told us matter most: does LOOKING cost money, and are you being
 * forced to pay years upfront. We show at most TWO, warnings first — a card that shows everything
 * shows nothing. Everything else lives in the detail sheet.
 */
function getSignals(l: Listing): Signal[] {
  if (l.kind === "rented") return [];
  const out: Signal[] = [];
  const fee = l.contact?.inspectionFee;
  const years = l.paymentOptions?.requiresUpfrontYears;

  if (fee) out.push({ text: `${naira(fee.amount)} to inspect`, tone: "warn" });
  if (years) out.push({ text: `${years} yrs upfront`, tone: "warn" });
  if (fee === null) out.push({ text: "No inspection fee", tone: "good" });
  else if (fee === undefined && l.contact) out.push({ text: "Fee not confirmed", tone: "neutral" });

  return out.slice(0, 2);
}

/** The small glass chip on the photo — only for listings whose STATE matters at a glance. */
function getPhotoChip(l: Listing): { text: string; icon: "hat" | "clock" | null } | null {
  switch (l.kind) {
    case "construction":
      return { text: l.constructionProgress != null ? `${l.constructionProgress}% built` : "Under construction", icon: "hat" };
    case "expiring": {
      if (!l.expiresAt) return { text: "Frees up soon", icon: "clock" };
      const d = daysUntil(l.expiresAt);
      return { text: `Opens in ${d} day${d === 1 ? "" : "s"}`, icon: "clock" };
    }
    case "rented":
      return { text: "Rented", icon: null };
    default:
      return null;
  }
}

export function ListingCard({ listing, saved, onToggleSave, onOpen }: Props) {
  const signals = getSignals(listing);
  const chip = getPhotoChip(listing);
  const km = listing.location.distanceFromUniversityKm;

  return (
    <article className={`${styles.card} ${listing.kind === "rented" ? styles.rented : ""}`}>
      <div className={styles.media}>
        {/* Real photo the moment one exists; otherwise a generated illustration. */}
        <img
          className={styles.img}
          src={listing.images?.[0]?.url || placeholderScene(listing.id, listing.kind === "construction")}
          alt=""
          loading="lazy"
          draggable={false}
        />

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

        {/* Construction progress as a thin line along the photo's bottom edge. */}
        {listing.kind === "construction" && listing.constructionProgress != null ? (
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Construction progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={listing.constructionProgress}
          >
            <i style={{ width: `${listing.constructionProgress}%` }} />
          </div>
        ) : null}
      </div>

      {/* The heart is a direct child of the card (NOT inside the photo box) so it always sits
          above the tap-anywhere layer. Nested inside the photo box it gets trapped underneath. */}
      <button
        type="button"
        className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
        aria-label={saved ? `Remove ${listing.name} from saved` : `Save ${listing.name}`}
        aria-pressed={!!saved}
        onClick={() => onToggleSave?.(listing.id)}
      >
        <span>
          <Heart size={16} />
        </span>
      </button>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>
            {/* The name is the real, keyboard-reachable button. Its ::after stretches over the
                whole card, so tapping anywhere opens it — without nesting buttons inside buttons. */}
            <button type="button" className={styles.open} onClick={() => onOpen?.(listing.id)}>
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
              <span key={s.text} className={`${styles.signal} ${styles[s.tone]}`}>
                {s.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}