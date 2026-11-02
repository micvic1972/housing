"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useMessaging, type Conversation } from "../../lib/messaging";
import { getRetryMessage, type RetryMessage } from "../../lib/message-retry";
import styles from "../page.module.css";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const retryMessage = useRef<RetryMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserId = useRef<string | null>(userId ?? null);
  const loadedForUserIdRef = useRef<string | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const { signedIn, openConversation, sendMessage } = useMessaging();
  const visibleConversation =
    isLoaded &&
    isSignedIn &&
    loadedForUserId === userId &&
    conversation?.id === params.conversationId
      ? conversation
      : null;
  const latestMessageId = visibleConversation?.messages.at(-1)?.id ?? null;

  useLayoutEffect(() => {
    if (lastUserId.current !== (userId ?? null) || !isSignedIn) {
      setConversation(null);
      setLoadedForUserId(null);
      loadedForUserIdRef.current = null;
      loadedConversationIdRef.current = null;
      setDraft("");
      setNotice(null);
      setSendError(null);
      setConnectionIssue(null);
      setSending(false);
      retryMessage.current = null;
      setLoading(true);
    }
    lastUserId.current = userId ?? null;
  }, [isSignedIn, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [latestMessageId, visibleConversation?.id]);

  useEffect(() => {
    let active = true;
    if (!isLoaded || !signedIn || !userId) return;
    const requestUserId = userId;
    const load = async () => {
      if (
        loadedForUserIdRef.current !== requestUserId ||
        loadedConversationIdRef.current !== params.conversationId
      ) {
        setConversation(null);
        setLoadedForUserId(null);
        loadedForUserIdRef.current = null;
        loadedConversationIdRef.current = null;
      }
      try {
        const result = await openConversation(params.conversationId);
        if (active && userId === requestUserId) {
          setConversation(result);
          loadedForUserIdRef.current = requestUserId;
          loadedConversationIdRef.current = params.conversationId;
          setLoadedForUserId(requestUserId);
          setConnectionIssue(null);
        }
      } catch (loadError) {
        if (active && userId === requestUserId) {
          setConnectionIssue(
            loadError instanceof Error
              ? loadError.message
              : "Could not reconnect to this conversation.",
          );
        }
      } finally {
        if (active && userId === requestUserId) setLoading(false);
      }
    };

    const initial = window.setTimeout(() => {
      setLoading(true);
      void load();
    }, 0);
    const polling = window.setInterval(() => void load(), 5_000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(polling);
    };
  }, [isLoaded, openConversation, params.conversationId, signedIn, userId]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!visibleConversation || !text || sending) return;
    const requestUserId = userId;
    if (!requestUserId) return;
    setSending(true);
    setSendError(null);
    retryMessage.current = getRetryMessage(retryMessage.current, text);
    try {
      const persisted = await sendMessage(
        visibleConversation.id,
        text,
        retryMessage.current.id,
      );
      if (lastUserId.current !== requestUserId) return;
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.some(
                (item) => item.id === persisted.id,
              )
                ? current.messages
                : [...current.messages, persisted],
            }
          : current,
      );
      setDraft("");
      retryMessage.current = null;
      setNotice("Message saved and sent to the property administrator.");
    } catch (sendFailure) {
      if (lastUserId.current === requestUserId) {
        setSendError(
          sendFailure instanceof Error
            ? sendFailure.message
            : "Message was not confirmed. Retry to safely check delivery.",
        );
      }
    } finally {
      if (lastUserId.current === requestUserId) setSending(false);
    }
  }

  async function retryConnection() {
    if (!userId) return;
    const requestUserId = userId;
    setLoading(true);
    try {
      const result = await openConversation(params.conversationId);
      if (lastUserId.current !== requestUserId) return;
      setConversation(result);
      loadedForUserIdRef.current = requestUserId;
      loadedConversationIdRef.current = params.conversationId;
      setLoadedForUserId(requestUserId);
      setConnectionIssue(null);
    } catch (loadError) {
      if (lastUserId.current === requestUserId) {
        setConnectionIssue(
          loadError instanceof Error
            ? loadError.message
            : "Could not reconnect to this conversation.",
        );
      }
    } finally {
      if (lastUserId.current === requestUserId) setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className={styles.page}>
        <p role="status">Checking your sign-in…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className={styles.page}>
        <section className={styles.empty}>
          <h1>Sign in to view this conversation</h1>
          <Link href="/sign-in?redirect_url=%2Fmessages">Sign in</Link>
        </section>
      </main>
    );
  }

  if (loading && !visibleConversation) {
    return (
      <main className={styles.page}>
        <p role="status">Loading conversation…</p>
      </main>
    );
  }

  if (!visibleConversation) {
    return (
      <main className={styles.page}>
        <section className={styles.empty} role="alert">
          <h1>Conversation unavailable</h1>
          <p>
            {connectionIssue ??
              "This conversation was not found or you do not have access."}
          </p>
          {connectionIssue ? (
            <button
              className={styles.backButton}
              type="button"
              onClick={() => void retryConnection()}
            >
              Retry connection
            </button>
          ) : null}
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
        <p className={styles.eyebrow}>Property conversation</p>
        <h1>{visibleConversation.listing.name}</h1>
        <p>{visibleConversation.listing.area}</p>
        <Link
          className={styles.listingLink}
          href={`/listings/${encodeURIComponent(visibleConversation.listing.id)}`}
        >
          View listing details
        </Link>
      </header>

      <div className={styles.prototypeNotice} role="note">
        Messages are saved to your account. This conversation refreshes
        automatically and reconnects when the service is available.
      </div>

      {connectionIssue ? (
        <p className={styles.error} role="alert">
          {connectionIssue}
          <button
            type="button"
            className={styles.inlineRetry}
            onClick={() => void retryConnection()}
          >
            Retry connection
          </button>
        </p>
      ) : null}

      {loading ? (
        <p role="status">
          Checking for new messages. This conversation refreshes automatically.
        </p>
      ) : null}
      <section
        className={styles.transcript}
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={loading}
        role="log"
      >
        {visibleConversation.messages.length === 0 ? (
          <p className={styles.transcriptEmpty}>
            No messages yet. Send a message to the property administrator.
          </p>
        ) : (
          visibleConversation.messages.map((message) => (
            <article
              className={`${styles.message} ${
                message.senderId === userId
                  ? styles.messageOwn
                  : styles.messageOther
              }`}
              key={message.id}
            >
              <span className={styles.messageSender}>
                {message.senderId === userId ? "You" : "Property administrator"}
              </span>
              <p>{message.body}</p>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString("en-NG")}
              </time>
              {message.senderId === userId ? (
                <span className={styles.readState}>
                  {message.readAt ? "Read" : "Sent"}
                </span>
              ) : null}
            </article>
          ))
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </section>
      <form
        className={styles.composer}
        onSubmit={submitMessage}
        aria-busy={sending}
      >
        <label htmlFor="draft-message">Write a message</label>
        <textarea
          id="draft-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={3}
          aria-describedby="draft-message-help"
          placeholder="Ask the property administrator about this place"
        />
        <div className={styles.composerFooter}>
          <span id="draft-message-help">{draft.length}/2000 characters</span>
          <button type="submit" disabled={!draft.trim() || sending}>
            <Send size={16} aria-hidden />
            {sending
              ? "Sending…"
              : sendError
                ? "Retry message"
                : "Send message"}
          </button>
        </div>
      </form>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {sendError ? (
        <p className={styles.error} role="alert">
          {sendError} Your draft is still here; retry to safely confirm
          delivery.
        </p>
      ) : null}
    </main>
  );
}
