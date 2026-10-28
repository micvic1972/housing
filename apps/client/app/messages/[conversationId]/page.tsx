"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useListings } from "../../lib/listings-provider";
import { useStudentActivity } from "../../lib/student-activity";
import styles from "../page.module.css";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const { listings } = useListings();
  const { conversations, ready, error, sendMessage } = useStudentActivity();
  const conversation = conversations.find(
    (item) => item.id === params.conversationId,
  );
  const listing = useMemo(
    () => listings.find((item) => item.id === conversation?.listingId) ?? null,
    [conversation?.listingId, listings],
  );

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation) return;
    if (sendMessage(conversation.id, draft)) {
      setDraft("");
      setNotice("Saved as a local draft message. It was not delivered.");
    } else {
      setNotice("The draft message could not be saved on this device.");
    }
  }

  if (!ready) {
    return (
      <main className={styles.page}>
        <p role="status">Loading local thread…</p>
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className={styles.page}>
        <section className={styles.empty}>
          <h1>Thread not found</h1>
          <p>This local conversation may have been cleared from this device.</p>
          <Link href="/messages">Back to messages</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/messages">
        <ArrowLeft size={17} aria-hidden />
        All messages
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Local demo thread</p>
        <h1>{listing?.name ?? "Listing no longer available"}</h1>
        {listing ? (
          <Link
            className={styles.listingLink}
            href={`/listings/${encodeURIComponent(listing.id)}`}
          >
            View listing details
          </Link>
        ) : null}
      </header>

      <div className={styles.prototypeNotice} role="note">
        This is a local prototype thread. There is no landlord account and
        messages are not sent or delivered.
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.transcript} aria-label="Local draft messages">
        {conversation.messages.length === 0 ? (
          <p className={styles.transcriptEmpty}>
            No messages yet. You can draft a note below; it remains on this
            device only.
          </p>
        ) : (
          conversation.messages.map((message) => (
            <article className={styles.message} key={message.id}>
              <p>{message.text}</p>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString("en-NG")}
              </time>
            </article>
          ))
        )}
      </section>

      <form className={styles.composer} onSubmit={submitMessage}>
        <label htmlFor="draft-message">Write a local draft</label>
        <textarea
          id="draft-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Write a note for your own prototype thread"
        />
        <div className={styles.composerFooter}>
          <span>{draft.length}/2000 · not delivered</span>
          <button type="submit" disabled={!draft.trim()}>
            <Send size={16} aria-hidden />
            Save draft
          </button>
        </div>
      </form>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      <button
        className={styles.backButton}
        type="button"
        onClick={() => router.push("/messages")}
      >
        Back to inbox
      </button>
    </main>
  );
}
