"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { useMessaging } from "../lib/messaging";
import styles from "./page.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const { conversations, ready, signedIn, error, refresh } = useMessaging();

  useEffect(() => {
    if (!signedIn) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refresh, signedIn]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your conversations</p>
        <h1>Messages</h1>
        <p>Messages are stored with your account and linked to each listing.</p>
      </header>

      <div className={styles.prototypeNotice} role="note">
        <MessageCircle size={18} aria-hidden />
        New messages are saved by the product service. Inbox updates check for
        new messages every few seconds and recover when your connection returns.
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? (
        <p className={styles.state} role="status">
          Loading conversations…
        </p>
      ) : null}
      {error ? (
        <button
          className={styles.backButton}
          type="button"
          onClick={() => void refresh().catch(() => undefined)}
        >
          Retry loading messages
        </button>
      ) : null}

      {ready && !signedIn ? (
        <section className={styles.empty} role="status">
          <h2>Sign in to view your messages</h2>
          <p>
            Conversations are private to the student account that started them.
          </p>
          <Link href="/sign-in?redirect_url=%2Fmessages">Sign in</Link>
        </section>
      ) : null}

      {ready && signedIn && !error && conversations.length === 0 ? (
        <section className={styles.empty} role="status">
          <span className={styles.emptyIcon} aria-hidden>
            <MessageCircle size={24} />
          </span>
          <h2>No conversations yet</h2>
          <p>
            Open a listing and message the property administrator to start a
            private conversation.
          </p>
          <Link href="/">Browse places</Link>
        </section>
      ) : null}

      {ready && signedIn && conversations.length > 0 ? (
        <section className={styles.inbox} aria-label="Conversations">
          <h2>Your conversations</h2>
          {conversations
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((conversation) => {
              const latest = conversation.lastMessage;
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
                    <strong>{conversation.listing.name}</strong>
                    <span>
                      {latest
                        ? `${latest.senderRole === "student" ? "You" : "Property administrator"}: ${latest.body}`
                        : "No messages yet. Send the first message."}
                    </span>
                  </span>
                  <span className={styles.threadDate}>
                    {conversation.unreadCount > 0 ? (
                      <span className={styles.unreadBadge}>
                        {conversation.unreadCount} unread
                      </span>
                    ) : null}
                    <time
                      dateTime={latest?.createdAt ?? conversation.updatedAt}
                    >
                      {formatDate(latest?.createdAt ?? conversation.updatedAt)}
                    </time>
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
