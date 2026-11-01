"use client";

import Link from "next/link";
import { CalendarDays, Clock3, ExternalLink } from "lucide-react";
import {
  useInspectionRequests,
  type InspectionRequest,
} from "../lib/inspection-requests";
import styles from "./page.module.css";

function formatDate(value: string, includeTime = false): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
      });
}

function InspectionCard({
  inspection,
  onCancel,
  onAcceptProposal,
  onDeclineProposal,
}: {
  inspection: ReturnType<typeof useInspectionRequests>["requests"][number];
  onCancel?: () => void;
  onAcceptProposal?: () => void;
  onDeclineProposal?: () => void;
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
          Requested {formatDate(inspection.createdAt)}
        </span>
      </div>
      <h3>{inspection.listing.name}</h3>
      <p className={styles.requestDate}>
        Requested visit: {formatDate(inspection.scheduledFor, true)}
      </p>
      {inspection.rescheduleProposedFor ? (
        <p className={styles.requestDate}>
          Proposed alternative:{" "}
          {formatDate(inspection.rescheduleProposedFor, true)}
        </p>
      ) : null}
      {inspection.adminResponse ? (
        <p className={styles.cardNote}>
          Administrator response: {inspection.adminResponse}
        </p>
      ) : null}
      <p className={styles.cardNote}>
        {inspection.status === "requested"
          ? "Sent for review. The requested time is not confirmed yet."
          : inspection.status === "confirmed"
            ? "The requested visit has been confirmed."
            : inspection.status === "declined"
              ? "The requested visit was declined."
              : inspection.status === "completed"
                ? "The inspection has been marked complete."
                : "This inspection request is no longer active."}
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
            Cancel request
          </button>
        ) : null}
        {onAcceptProposal ? (
          <button
            className={styles.cancelAction}
            type="button"
            onClick={onAcceptProposal}
          >
            Accept proposed time
          </button>
        ) : null}
        {onDeclineProposal ? (
          <button
            className={styles.cancelAction}
            type="button"
            onClick={onDeclineProposal}
          >
            Keep original time
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function InspectionPage() {
  const {
    requests: inspections,
    ready,
    signedIn,
    error,
    reload,
    cancelRequest,
    acceptReschedule,
    declineReschedule,
  } = useInspectionRequests();
  const pending = inspections.filter((item) => item.status === "requested");
  const upcoming = inspections.filter((item) => item.status === "confirmed");
  const past = inspections.filter(
    (item) =>
      item.status === "completed" ||
      item.status === "cancelled" ||
      item.status === "declined",
  );

  function group(
    title: string,
    description: string,
    entries: InspectionRequest[],
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
                onCancel={
                  inspection.status === "requested"
                    ? () => void cancelRequest(inspection.id)
                    : undefined
                }
                onAcceptProposal={
                  inspection.rescheduleProposedFor
                    ? () => void acceptReschedule(inspection.id)
                    : undefined
                }
                onDeclineProposal={
                  inspection.rescheduleProposedFor
                    ? () => void declineReschedule(inspection.id)
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
          Track requests submitted for administrator review and confirmed
          visits.
        </p>
      </header>

      <div className={styles.prototypeNotice} role="note">
        <CalendarDays size={18} aria-hidden />
        Requests are saved to your account. Wait for confirmation before
        visiting.
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? (
        <p className={styles.state} role="status">
          Loading inspection requests…
        </p>
      ) : null}
      {error ? (
        <section className={styles.state} role="alert">
          <p>Inspection requests could not be loaded.</p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </section>
      ) : null}
      {ready && !signedIn ? (
        <section className={styles.empty} role="status">
          <p>Sign in to see requests connected to your account.</p>
          <Link href="/sign-in?redirect_url=%2Finspection">Sign in</Link>
        </section>
      ) : null}
      {ready && signedIn && !error ? (
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
            "Declined, completed, or cancelled requests.",
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
