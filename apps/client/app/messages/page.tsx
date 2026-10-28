"use client";

import Link from "next/link";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { useListings } from "../lib/listings-provider";
import { useStudentActivity } from "../lib/student-activity";
import styles from "./page.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export default function MessagesPage() {
  const { listings, status } = useListings();
  const { conversations, ready, error } = useStudentActivity();
  const names = new Map(listings.map((listing) => [listing.id, listing.name]));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your conversations</p>
        <h1>Messages</h1>
        <p>Keep a local draft thread for a place you’re considering.</p>
      </header>

      <div className={styles.prototypeNotice} role="note">
        <MessageCircle size={18} aria-hidden />
        Local prototype · messages stay on this device and are not delivered.
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!ready || status === "loading" ? (
        <p className={styles.state} role="status">
          Loading conversations…
        </p>
      ) : null}
      {status === "error" ? (
        <p className={styles.state} role="alert">
          Listing context could not be loaded. Your locally saved threads remain
          on this device.
        </p>
      ) : null}

      {ready && !error && conversations.length === 0 ? (
        <section className={styles.empty} role="status">
          <span className={styles.emptyIcon} aria-hidden>
            <MessageCircle size={24} />
          </span>
          <h2>No local message threads yet</h2>
          <p>
            Open a listing and choose “Open local message demo” to create a
            thread. No property contact is represented or contacted.
          </p>
          <Link href="/">Browse places</Link>
        </section>
      ) : null}

      {ready && conversations.length > 0 ? (
        <section
          className={styles.inbox}
          aria-label="Local conversation threads"
        >
          <h2>Threads on this device</h2>
          {conversations
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((conversation) => {
              const latest = conversation.messages.at(-1);
              return (
                <Link
                  className={styles.thread}
                  href={`/messages/${encodeURIComponent(conversation.id)}`}
                  key={conversation.id}
                >
                  <span className={styles.threadIcon} aria-hidden>
                    <MessageCircle size={19} />
                  </span>
                  <span className={styles.threadContent}>
                    <strong>
                      {names.get(conversation.listingId) ??
                        "Listing no longer available"}
                    </strong>
                    <span>
                      {latest?.text ??
                        "No local message yet. Open to write a draft."}
                    </span>
                  </span>
                  <span className={styles.threadDate}>
                    {formatDate(latest?.createdAt ?? conversation.createdAt)}
                    <ArrowUpRight size={15} aria-hidden />
                  </span>
                </Link>
              );
            })}
        </section>
      ) : null}
    </main>
  );
}
