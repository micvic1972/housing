"use client";

import {
  Heart,
  Star,
  MapPin,
  Footprints,
  Shield,
  Sparkles,
  Clock,
  HardHat,
  Check,
  X as XIcon,
} from "lucide-react";

import type { Listing } from "../../../types/listing";
import { FACILITIES } from "../../../config/facilities";
import { placeholderScene } from "../../../lib/placeholderscene";

import styles from "./ListingCard.module.css";

interface ListingCardProps {
  listing: Listing;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onOpen: (id: string) => void;
}

function naira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function StatusPill({ listing }: { listing: Listing }) {
  switch (listing.status) {
    case "AVAILABLE":
      return (
        <span className={styles.pill}>
          <Check size={13} aria-hidden="true" />
          Available
        </span>
      );

    case "ALMOST_FULL":
      return (
        <span className={`${styles.pill} ${styles.pillWarn}`}>
          <Clock size={13} aria-hidden="true" />
          {listing.left} rooms left
        </span>
      );

    case "COMING_SOON":
      return (
        <span className={styles.pill}>
          <HardHat size={13} aria-hidden="true" />
          Under construction
        </span>
      );

    case "FREEING_SOON":
      return (
        <span className={`${styles.pill} ${styles.pillWarn}`}>
          <Clock size={13} aria-hidden="true" />
          Frees up soon
        </span>
      );

    default:
      return (
        <span className={`${styles.pill} ${styles.pillOff}`}>
          <XIcon size={13} aria-hidden="true" />
          Rented
        </span>
      );
  }
}

export default function ListingCard({
  listing,
  saved,
  onToggleSave,
  onOpen,
}: ListingCardProps) {
  function handleCardKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.target !== e.currentTarget) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(listing.id);
    }
  }

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-label={`View ${listing.name}`}
      onClick={() => onOpen(listing.id)}
      onKeyDown={handleCardKeyDown}
    >
      <div className={styles.media}>
        <img
          src={placeholderScene(
            listing.seed,
            0,
            listing.kind === "construction"
          )}
          alt={`Illustration of ${listing.name}`}
          className={styles.photo}
          draggable={false}
        />

        {listing.kind === "rented" ? (
          <span className={`${styles.badge} ${styles.badgeOff}`}>
            <XIcon size={13} aria-hidden="true" />
            Rented
          </span>
        ) : listing.verified ? (
          <span className={styles.badge}>
            <Shield size={13} aria-hidden="true" />
            Verified
          </span>
        ) : null}

        <button
          type="button"
          className={`${styles.heart} ${
            saved ? styles.heartOn : ""
          }`}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${listing.name} from saved`
              : `Save ${listing.name}`
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(listing.id);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          <Heart
            size={19}
            fill={saved ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>

        <span className={styles.walk}>
          <Footprints size={13} aria-hidden="true" />
          {listing.walk} min walk
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{listing.name}</h3>

          {listing.rating ? (
            <span className={styles.rating}>
              <Star
                size={13}
                fill="currentColor"
                aria-hidden="true"
              />
              {listing.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <div className={styles.loc}>
          <MapPin size={14} aria-hidden="true" />
          <span>
            {listing.area}, {listing.dist} km from UNIDEL
          </span>
        </div>

        <div className={styles.priceRow}>
          <div className={styles.price}>
            {naira(listing.price)}
            <small>
              {listing.kind === "construction"
                ? " / year expected"
                : " / year"}
            </small>
          </div>

          <StatusPill listing={listing} />
        </div>

        {listing.kind === "construction" ? (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>
              <span>
                <HardHat size={14} aria-hidden="true" />
                {listing.progress}% built
              </span>

              <b>Ready {listing.ready}</b>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${listing.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className={styles.tags}>
          <span className={styles.tag}>{listing.room}</span>

          {listing.fac.map((f) => {
            const meta = FACILITIES[f];
            const Icon = meta.icon;

            return (
              <span key={f} className={styles.tag}>
                <Icon size={14} aria-hidden="true" />
                {meta.label}
              </span>
            );
          })}
        </div>

        {listing.verified && listing.vdate ? (
          <div className={styles.verifiedLine}>
            <Shield size={14} aria-hidden="true" />
            Visited and verified {listing.vdate}
          </div>
        ) : null}

        <div className={styles.insight}>
          <Sparkles size={14} aria-hidden="true" />
          {listing.insight}
        </div>
      </div>
    </article>
  );
}