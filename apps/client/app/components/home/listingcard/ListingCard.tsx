"use client";

// ============================================================================
// This component's ONLY job: take ONE listing, show it as a card.
// It does not know about grids, pages, filters, or where the data came from.
// That separation is what lets you reuse this exact same card in a horizontal
// scrolling row later AND in a plain grid, without changing this file at all.
// ============================================================================

import {
  Heart,
  ShieldCheck,
  MapPin,
  Star,
  Wallet,
  HardHat,
  Clock,
  Check,
  UserRound,
  TriangleAlert,
} from "lucide-react";
import type { Listing } from "./types";
import styles from "./ListingCard.module.css";

type Props = {
  listing: Listing;
  /** Is this one currently saved/hearted? Comes from wherever "saved" state lives (see page.tsx). */
  saved?: boolean;
  /** Called when the heart is tapped. The card doesn't manage saved state itself. */
  onToggleSave?: (id: string) => void;
  /** Called when the card (or its main button) is tapped, to open the detail sheet. */
  onOpen?: (id: string) => void;
};

// ---- small helper functions used only inside this file ----

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

/**
 * How many days from right now until `iso`. This is a SNAPSHOT calculated once when the card
 * renders — it is NOT a live-ticking clock. A real live countdown is a small upgrade for later,
 * intentionally left out here to keep this file's first version simple.
 */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Builds the one line of text about WHO you're dealing with and whether inspecting costs money.
 * This is the single most important trust signal on the whole card — real students say agent
 * fees are one of the most common ways they get taken advantage of.
 */
function contactLine(listing: Listing): string | null {
  const c = listing.contact;
  if (!c) return null; // no contact info at all — show nothing rather than guess

  if (c.inspectionFee === undefined) {
    return "Ask about inspection fees before visiting"; // we genuinely don't know yet
  }
  if (c.inspectionFee === null) {
    // Confirmed: no fee. Word it slightly differently depending on who you're dealing with.
    return c.contactType === "agent"
      ? "Through an agent · No inspection fee"
      : c.contactType === "university-partner"
        ? "Arranged with the university · No inspection fee"
        : "Direct with the owner · No inspection fee";
  }
  // Confirmed: there IS a fee.
  return `Through an agent · ${naira(c.inspectionFee.amount)} to inspect`;
}

/** Picks the label, color, and icon for the small status pill, based on what kind of listing this is. */
function statusPill(listing: Listing) {
  switch (listing.kind) {
    case "available":
      return { label: "Available", tone: "soft" as const, icon: Check };
    case "construction":
      return { label: "Under construction", tone: "soft" as const, icon: HardHat };
    case "expiring":
      return { label: "Frees up soon", tone: "soft" as const, icon: Clock };
    case "rented":
      return { label: "Rented", tone: "muted" as const, icon: Check };
  }
}

// ---- the actual component ----

export function ListingCard({ listing, saved, onToggleSave, onOpen }: Props) {
  const line = contactLine(listing);
  const pill = statusPill(listing);
  const PillIcon = pill.icon;
  const upfrontYears = listing.paymentOptions?.requiresUpfrontYears;

  return (
    // Tapping ANYWHERE on the card opens the detail sheet.
    <article className={styles.card} onClick={() => onOpen?.(listing.id)}>
      {/* ---- photo area ---- */}
      <div className={styles.photo}>
        {/* Placeholder until real photo URLs exist. Swap this for a real <img> later. */}
        <div className={styles.placeholder} aria-hidden="true">
          <HardHat size={26} />
        </div>

        {listing.verified ? (
          <span className={styles.badge}>
            <ShieldCheck size={12} aria-hidden />
            Verified
          </span>
        ) : null}

        <button
          type="button"
          className={`${styles.heart} ${saved ? styles.heartOn : ""}`}
          aria-label={saved ? `Remove ${listing.name} from saved` : `Save ${listing.name}`}
          aria-pressed={!!saved}
          onClick={(e) => {
            // IMPORTANT: stop the click from also triggering the card's onOpen above.
            e.stopPropagation();
            onToggleSave?.(listing.id);
          }}
        >
          <Heart size={18} />
        </button>
      </div>

      {/* ---- text area ---- */}
      <div className={styles.body}>
        <div className={styles.row1}>
          <h3 className={styles.name}>{listing.name}</h3>
          {listing.rating ? (
            <span className={styles.rating}>
              <Star size={12} aria-hidden />
              {listing.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <div className={styles.sub}>
          <MapPin size={13} aria-hidden />
          {listing.location.area}
          {listing.location.distanceFromUniversityKm != null
            ? ` · ${listing.location.distanceFromUniversityKm} km from UNIDEL`
            : null}
        </div>

        {line ? (
          <div className={styles.trustLine}>
            <UserRound size={13} aria-hidden />
            {line}
          </div>
        ) : null}

        <div className={styles.priceRow}>
          <span className={styles.price}>
            {naira(listing.pricing.amount)}
            <small> / {listing.pricing.period}</small>
          </span>
          <span className={`${styles.pill} ${styles[pill.tone]}`}>
            <PillIcon size={13} aria-hidden />
            {pill.label}
          </span>
        </div>

        {upfrontYears ? (
          <div className={styles.warn}>
            <TriangleAlert size={14} aria-hidden />
            Asks for {upfrontYears} years upfront
          </div>
        ) : null}

        {listing.kind === "construction" && listing.constructionProgress != null ? (
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

        {listing.kind === "expiring" && listing.expiresAt ? (
          <div className={styles.countdown}>
            <Wallet size={13} aria-hidden />
            Frees up in {daysUntil(listing.expiresAt)} day
            {daysUntil(listing.expiresAt) === 1 ? "" : "s"}
          </div>
        ) : null}

        {listing.insight ? <p className={styles.insight}>{listing.insight}</p> : null}

        <button
          type="button"
          className={styles.action}
          onClick={(e) => {
            e.stopPropagation(); // same reason as the heart button above
            onOpen?.(listing.id);
          }}
        >
          {listing.kind === "construction"
            ? "Follow build"
            : listing.kind === "expiring"
              ? "Follow room"
              : listing.kind === "rented"
                ? "See similar places"
                : "View details"}
        </button>
      </div>
    </article>
  );
}