"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, Send } from "lucide-react";
import { getRetryMessage, type RetryMessage } from "../lib/message-retry";
import {
  isCurrentAccountRequest,
  type AccountScope,
} from "../lib/account-scope";

type Message = {
  id: string;
  senderId: string;
  senderRole: "student" | "admin";
  body: string;
  readAt: string | null;
  createdAt: string;
};

type Conversation = {
  id: string;
  studentId: string;
  assignedAdminId: string | null;
  listing: { id: string; name: string; area: string; campus: string | null };
  messages: Message[];
};

function errorOf(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

export default function ConversationView({
  conversationId,
}: {
  conversationId: string;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const retryMessage = useRef<RetryMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loadedForUserIdRef = useRef<string | null>(null);
  const loadedConversationIdRef = useRef<string | null>(null);
  const accountScope = useRef<AccountScope>({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
  });
  const lastUserId = useRef<string | null>(userId ?? null);
  const visibleConversation =
    isLoaded &&
    isSignedIn &&
    loadedForUserId === userId &&
    conversation?.id === conversationId
      ? conversation
      : null;
  const latestMessageId = visibleConversation?.messages.at(-1)?.id ?? null;

  useLayoutEffect(() => {
    accountScope.current = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
    };
  }, [isLoaded, isSignedIn, userId]);

  useLayoutEffect(() => {
    if (lastUserId.current !== (userId ?? null) || !isSignedIn) {
      setConversation(null);
      setLoadedForUserId(null);
      loadedForUserIdRef.current = null;
      loadedConversationIdRef.current = null;
      setDraft("");
      setNotice(null);
      setError(null);
      setSendError(null);
      setSending(false);
      retryMessage.current = null;
      setLoading(true);
    }
    lastUserId.current = userId ?? null;
  }, [isSignedIn, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [latestMessageId, visibleConversation?.id]);

  const load = useCallback(async () => {
    const requestUserId = userId;
    if (!isLoaded || !isSignedIn || !requestUserId) return;
    if (
      loadedForUserIdRef.current !== requestUserId ||
      loadedConversationIdRef.current !== conversationId
    ) {
      setConversation(null);
      setLoadedForUserId(null);
      loadedForUserIdRef.current = null;
      loadedConversationIdRef.current = null;
    }
    const response = await fetch(
      `/api/admin/conversations/${encodeURIComponent(conversationId)}`,
      { cache: "no-store" },
    );
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        errorOf(body, `Could not load conversation (${response.status})`),
      );
    }
    if (
      typeof body !== "object" ||
      body === null ||
      !("data" in body) ||
      typeof body.data !== "object" ||
      body.data === null
    ) {
      throw new Error("Conversation response is invalid.");
    }
    if (!isCurrentAccountRequest(accountScope.current, requestUserId)) return;
    setConversation(body.data as Conversation);
    loadedForUserIdRef.current = requestUserId;
    loadedConversationIdRef.current = conversationId;
    setLoadedForUserId(requestUserId);
    setError(null);
  }, [conversationId, isLoaded, isSignedIn, userId]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    void load()
      .catch((loadError: unknown) => {
        if (userId && isCurrentAccountRequest(accountScope.current, userId)) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not reconnect to this conversation.",
          );
        }
      })
      .finally(() => {
        if (userId && isCurrentAccountRequest(accountScope.current, userId)) {
          setLoading(false);
        }
      });
  }, [load, userId]);

  useEffect(() => {
    let active = true;
    if (!isLoaded) return;
    if (!isSignedIn || !userId) return;
    const refresh = async () => {
      try {
        await load();
      } catch (loadError) {
        if (active && isCurrentAccountRequest(accountScope.current, userId)) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not reconnect to this conversation.",
          );
        }
      } finally {
        if (active && isCurrentAccountRequest(accountScope.current, userId)) {
          setLoading(false);
        }
      }
    };
    const initial = window.setTimeout(() => {
      setLoading(true);
      void refresh();
    }, 0);
    const polling = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(polling);
    };
  }, [isLoaded, isSignedIn, load, userId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!visibleConversation || !text || sending) return;
    const requestUserId = userId;
    if (!requestUserId) return;
    retryMessage.current = getRetryMessage(retryMessage.current, text);
    setSending(true);
    setSendError(null);
    try {
      const response = await fetch(
        `/api/admin/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            body: text,
            clientMessageId: retryMessage.current.id,
          }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          errorOf(body, `Could not send message (${response.status})`),
        );
      }
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        throw new Error("Account changed while sending this reply.");
      }
      setDraft("");
      retryMessage.current = null;
      setSendError(null);
      setNotice("Message saved and sent to the student.");
      try {
        await load();
      } catch {
        if (isCurrentAccountRequest(accountScope.current, requestUserId)) {
          setError(
            "Message was saved, but the latest conversation could not be refreshed.",
          );
        }
      }
    } catch (sendError) {
      if (isCurrentAccountRequest(accountScope.current, requestUserId)) {
        setSendError(
          sendError instanceof Error
            ? sendError.message
            : "Message was not confirmed.",
        );
      }
    } finally {
      if (isCurrentAccountRequest(accountScope.current, requestUserId)) {
        setSending(false);
      }
    }
  }

  if (loading && !visibleConversation)
    return <p role="status">Loading conversation…</p>;
  if (!visibleConversation) {
    return (
      <section className="space-y-3 rounded-lg border p-4" role="alert">
        <p>{error ?? "Conversation not found or access denied."}</p>
        {error ? (
          <button
            className="w-fit rounded-md border px-3 py-2 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
            onClick={retryLoad}
          >
            Retry connection
          </button>
        ) : null}
        <Link
          className="inline-flex min-h-10 items-center gap-2 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/messages"
        >
          <ArrowLeft size={16} aria-hidden /> Back to messages
        </Link>
      </section>
    );
  }

  return (
    <>
      <Link
        className="inline-flex min-h-10 items-center gap-2 text-sm underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href="/messages"
      >
        <ArrowLeft size={16} aria-hidden /> All messages
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Student conversation
        </p>
        <h1 className="text-2xl font-semibold">
          {visibleConversation.listing.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {visibleConversation.listing.area}
          {visibleConversation.listing.campus
            ? ` · ${visibleConversation.listing.campus}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Student account: {visibleConversation.studentId}
          {visibleConversation.assignedAdminId
            ? ` · Assigned administrator: ${visibleConversation.assignedAdminId}`
            : " · Unassigned"}
        </p>
      </header>

      {error ? (
        <p
          className="rounded border border-destructive p-3 text-sm"
          role="alert"
        >
          {error}
          <button type="button" className="ml-3 underline" onClick={retryLoad}>
            Retry
          </button>
        </p>
      ) : null}
      {loading ? (
        <p role="status">
          Checking for new messages. This conversation refreshes automatically.
        </p>
      ) : null}
      <section
        className="grid max-h-[min(64vh,42rem)] min-h-48 content-start gap-3 overflow-y-auto overscroll-contain rounded-xl border p-4"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={loading}
        role="log"
      >
        {visibleConversation.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Send a reply to start the conversation.
          </p>
        ) : (
          visibleConversation.messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[85%] rounded-xl border p-3 ${
                message.senderRole === "admin"
                  ? "ml-auto rounded-br-sm bg-primary/10"
                  : "mr-auto rounded-bl-sm bg-muted/50"
              }`}
            >
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {message.senderRole === "admin" ? "You" : "Student"}
              </span>
              <p className="whitespace-pre-wrap break-words text-sm">
                {message.body}
              </p>
              <time
                className="mt-2 block text-xs text-muted-foreground"
                dateTime={message.createdAt}
              >
                {new Date(message.createdAt).toLocaleString("en-NG")}
              </time>
              {message.senderRole === "admin" ? (
                <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                  {message.readAt ? "Read" : "Sent"}
                </span>
              ) : null}
            </article>
          ))
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </section>
      <form
        ref={formRef}
        className="space-y-3 rounded-xl border p-4"
        onSubmit={submit}
        aria-busy={sending}
      >
        <label className="block space-y-2 text-sm font-medium" htmlFor="reply">
          Reply to student
          <textarea
            id="reply"
            className="min-h-28 w-full rounded-md border bg-background p-3 font-normal"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            maxLength={2000}
            aria-describedby="reply-help"
            placeholder="Write a response about this listing"
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span id="reply-help">{draft.length}/2000 characters</span>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            disabled={!draft.trim() || sending}
            type="submit"
          >
            <Send size={16} aria-hidden />
            {sending ? "Sending…" : sendError ? "Retry reply" : "Send reply"}
          </button>
        </div>
      </form>
      {sendError ? (
        <p className="text-sm text-destructive" role="alert">
          {sendError} Your draft is still here. Retry to safely confirm
          delivery.
          <button
            className="ml-2 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
          >
            Retry reply
          </button>
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
    </>
  );
}
