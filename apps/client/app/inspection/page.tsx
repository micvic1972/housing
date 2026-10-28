"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, Clock3, ExternalLink } from "lucide-react";
import { useListings } from "../lib/listings-provider";
import {
  useStudentActivity,
  type LocalInspection,
} from "../lib/student-activity";
import styles from "./page.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function InspectionCard({
  inspection,
  listingName,
  onCancel,
}: {
  inspection: LocalInspection;
  listingName: string;
  onCancel?: () => void;
}) {
  const statusLabel =
    inspection.status[0].toUpperCase() + inspection.status.slice(1);

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.status} ${styles[inspection.status]}`}>
          {statusLabel}
        </span>
        <span className={styles.requestDate}>
          <Clock3 size={14} aria-hidden />
          Requested {formatDate(inspection.requestedAt)}
        </span>
      </div>
      <h3>{listingName}</h3>
      <p className={styles.cardNote}>
        {inspection.status === "requested"
          ? "Saved locally as a demo request. No property contact has received it, and no appointment is confirmed."
          : inspection.status === "confirmed"
            ? "This appointment is marked confirmed in the local activity record."
            : "This local demo request is no longer active."}
      </p>
      <div className={styles.cardActions}>
        {inspection.listingId ? (
          <Link
            className={styles.secondaryAction}
            href={`/listings/${encodeURIComponent(inspection.listingId)}`}
          >
            <ExternalLink size={15} aria-hidden />
            View listing
          </Link>
        ) : null}
        {onCancel ? (
          <button
            className={styles.cancelAction}
            type="button"
            onClick={onCancel}
          >
            Cancel demo request
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function InspectionPage() {
  const { listings, status, reload } = useListings();
  const { inspections, ready, error, cancelInspection } = useStudentActivity();
  const listingNames = useMemo(
    () => new Map(listings.map((listing) => [listing.id, listing.name])),
    [listings],
  );
  const pending = inspections.filter((item) => item.status === "requested");
  const upcoming = inspections.filter((item) => item.status === "confirmed");
  const past = inspections.filter(
    (item) => item.status === "completed" || item.status === "cancelled",
  );

  function group(
    title: string,
    description: string,
    entries: LocalInspection[],
  ) {
    return (
      <section className={styles.group} aria-label={title}>
        <div className={styles.groupHeading}>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <span>{entries.length}</span>
        </div>
        {entries.length ? (
          <div className={styles.cards}>
            {entries.map((inspection) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                listingName={
                  listingNames.get(inspection.listingId) ??
                  "Listing no longer available"
                }
                onCancel={
                  inspection.status === "requested"
                    ? () => cancelInspection(inspection.id)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Nothing here yet.</p>
        )}
      </section>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your visits</p>
        <h1>Inspections</h1>
        <p>
          Track your local demo requests. A request is not sent to the property
          contact and does not mean an appointment is confirmed.
        </p>
      </header>

      <div className={styles.prototypeNotice} role="note">
        <CalendarDays size={18} aria-hidden />
        Prototype only · activity is saved in this browser and is not synced.
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!ready || status === "loading" ? (
        <p className={styles.state} role="status">
          Loading inspection activity…
        </p>
      ) : null}
      {status === "error" ? (
        <section className={styles.state} role="alert">
          <p>
            Listings could not be loaded; property names may be unavailable.
          </p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </section>
      ) : null}
      {ready ? (
        <div className={styles.groups}>
          {group(
            "Pending requests",
            "Waiting for a real contact; not confirmed.",
            pending,
          )}
          {group(
            "Upcoming",
            "Only confirmed appointment records appear here.",
            upcoming,
          )}
          {group(
            "Past activity",
            "Completed or cancelled local requests.",
            past,
          )}
        </div>
      ) : null}
      <Link className={styles.browseLink} href="/">
        Browse accommodation
      </Link>
    </main>
  );
}
