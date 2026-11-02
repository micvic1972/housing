"use client";

import Link from "next/link";
import { CalendarDays, Clock3, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  useInspectionRequests,
  type InspectionRequest,
} from "../lib/inspection-requests";
import styles from "./page.module.css";

const statusLabels: Record<InspectionRequest["status"], string> = {
  requested: "Pending review",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

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
  busy,
}: {
  inspection: ReturnType<typeof useInspectionRequests>["requests"][number];
  onCancel?: () => void;
  onAcceptProposal?: () => void;
  onDeclineProposal?: () => void;
  busy: boolean;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.status} ${styles[inspection.status]}`}>
          {statusLabels[inspection.status]}
        </span>
        <span className={styles.requestDate}>
          <Clock3 size={14} aria-hidden />
          Requested {formatDate(inspection.createdAt)}
        </span>
      </div>
      <h3>{inspection.listing.name}</h3>
      <p className={styles.requestDate}>
        {inspection.status === "requested" ? "Requested time" : "Visit time"}:{" "}
        {formatDate(inspection.scheduledFor, true)}
      </p>
      {inspection.rescheduleProposedFor ? (
        <div className={styles.proposal}>
          <p>
            New time suggested:{" "}
            <strong>
              {formatDate(inspection.rescheduleProposedFor, true)}
            </strong>
          </p>
          <p>
            Accept the suggestion to confirm the new time, or keep the current
            time.
          </p>
        </div>
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
            ? "This visit is confirmed."
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
            disabled={busy}
          >
            {busy ? "Updating…" : "Cancel request"}
          </button>
        ) : null}
        {onAcceptProposal ? (
          <button
            className={styles.primaryAction}
            type="button"
            onClick={onAcceptProposal}
            disabled={busy}
          >
            {busy ? "Updating…" : "Accept proposed time"}
          </button>
        ) : null}
        {onDeclineProposal ? (
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={onDeclineProposal}
            disabled={busy}
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = inspections.filter((item) => item.status === "requested");
  const upcoming = inspections.filter((item) => item.status === "confirmed");
  const past = inspections.filter(
    (item) =>
      item.status === "completed" ||
      item.status === "cancelled" ||
      item.status === "declined",
  );

  async function runAction(requestId: string, action: () => Promise<boolean>) {
    setBusyId(requestId);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  }

  function group(
    title: string,
    description: string,
    entries: InspectionRequest[],
  ) {
    const headingId = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;
    return (
      <section className={styles.group} aria-labelledby={headingId}>
        <div className={styles.groupHeading}>
          <div>
            <h2 id={headingId}>{title}</h2>
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
                    ? () =>
                        void runAction(inspection.id, () =>
                          cancelRequest(inspection.id),
                        )
                    : undefined
                }
                onAcceptProposal={
                  inspection.rescheduleProposedFor &&
                  (inspection.status === "requested" ||
                    inspection.status === "confirmed")
                    ? () =>
                        void runAction(inspection.id, () =>
                          acceptReschedule(inspection.id),
                        )
                    : undefined
                }
                onDeclineProposal={
                  inspection.rescheduleProposedFor &&
                  (inspection.status === "requested" ||
                    inspection.status === "confirmed")
                    ? () =>
                        void runAction(inspection.id, () =>
                          declineReschedule(inspection.id),
                        )
                    : undefined
                }
                busy={busyId === inspection.id}
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

      {!ready ? (
        <p className={styles.state} role="status">
          Loading inspection requests…
        </p>
      ) : null}
      {error ? (
        <section className={styles.state} role="alert" aria-live="assertive">
          <p>{error}</p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </section>
      ) : null}
      {ready && !signedIn ? (
        <section className={styles.empty} role="status">
          <p>Sign in to see inspection requests connected to your account.</p>
          <Link href="/sign-in?redirect_url=%2Finspection">Sign in</Link>
        </section>
      ) : null}
      {ready && signedIn && (!error || inspections.length > 0) ? (
        <div className={styles.groups}>
          {group(
            "Pending requests",
            "Awaiting a response. These times are not confirmed.",
            pending,
          )}
          {group(
            "Upcoming",
            "Confirmed visits. Check the date and time before you go.",
            upcoming,
          )}
          {group(
            "Past activity",
            "A record of declined, completed, and cancelled requests.",
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
