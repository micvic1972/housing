"use client";

import Link from "next/link";
import { useAppAuth } from "../lib/app-auth";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import {
  isAccountDataVisible,
  isCurrentAccountRequest,
  type AccountScope,
} from "../lib/account-scope";

type AdminConversation = {
  id: string;
  studentId: string;
  updatedAt: string;
  listing: { id: string; name: string; area: string; campus: string | null };
  lastMessage: {
    body: string;
    createdAt: string;
    senderRole?: "student" | "admin";
  } | null;
  unreadCount: number;
};

function messageOf(body: unknown, fallback: string) {
  return typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesInbox() {
  const { isLoaded, isSignedIn, userId } = useAppAuth("admin");
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedForUserIdRef = useRef<string | null>(null);
  const lastUserId = useRef<string | null>(userId ?? null);
  const accountScope = useRef<AccountScope>({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
  });

  useLayoutEffect(() => {
    accountScope.current = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
    };
    const activeUserId = isLoaded && isSignedIn && userId ? userId : null;
    if (lastUserId.current !== activeUserId) {
      setConversations([]);
      setLoadedForUserId(null);
      loadedForUserIdRef.current = null;
      setError(null);
    }
    lastUserId.current = activeUserId;
  }, [isLoaded, isSignedIn, userId]);

  const load = useCallback(async () => {
    const requestUserId = userId;
    if (!isLoaded || !isSignedIn || !requestUserId) return;
    if (loadedForUserIdRef.current !== requestUserId) {
      setConversations([]);
      setLoadedForUserId(null);
      loadedForUserIdRef.current = null;
      setError(null);
    }
    try {
      const response = await fetch("/api/admin/conversations", {
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          messageOf(body, `Could not load messages (${response.status})`),
        );
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("data" in body) ||
        !Array.isArray(body.data)
      ) {
        throw new Error("Message inbox response is invalid.");
      }
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) return;
      setConversations(body.data as AdminConversation[]);
      loadedForUserIdRef.current = requestUserId;
      setLoadedForUserId(requestUserId);
      setError(null);
    } catch (loadError) {
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) return;
      loadedForUserIdRef.current = requestUserId;
      setLoadedForUserId(requestUserId);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load messages.",
      );
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    const timer = window.setTimeout(() => void load(), 0);
    const polling = window.setInterval(() => void load(), 10_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(polling);
    };
  }, [isLoaded, isSignedIn, load, userId]);

  const dataVisible = isAccountDataVisible(
    { isLoaded, isSignedIn: Boolean(isSignedIn), userId: userId ?? null },
    loadedForUserId,
  );
  const visibleConversations = dataVisible ? conversations : [];
  const visibleError = dataVisible ? error : null;

  if (
    (!isLoaded || (isSignedIn && !dataVisible)) &&
    visibleConversations.length === 0
  ) {
    return <p role="status">Loading messages…</p>;
  }
  if (visibleError && visibleConversations.length === 0) {
    return (
      <section className="space-y-3 rounded-lg border p-4" role="alert">
        <p>{visibleError}</p>
        <button
          className="rounded border px-3 py-2"
          onClick={() => void load()}
        >
          Retry
        </button>
      </section>
    );
  }
  if (visibleConversations.length === 0) {
    return (
      <section
        className="grid justify-items-center gap-2 rounded-xl border p-8 text-center"
        aria-label="Message inbox"
      >
        <MessageCircle
          className="text-muted-foreground"
          size={26}
          aria-hidden
        />
        <h2 className="font-semibold">No conversations yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Student enquiries about your listings will appear here. The inbox
          checks for new conversations automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="Student conversations">
      {visibleError ? (
        <p role="alert" className="rounded border p-3 text-sm">
          {visibleError}
          <button
            className="ml-3 font-semibold underline underline-offset-2"
            type="button"
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      ) : null}
      {visibleConversations.map((conversation) => (
        <Link
          href={`/messages/${encodeURIComponent(conversation.id)}`}
          key={conversation.id}
          className="group block rounded-xl border p-4 transition hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{conversation.listing.name}</h2>
              <p className="text-sm text-muted-foreground">
                {conversation.listing.area}
                {conversation.listing.campus
                  ? ` · ${conversation.listing.campus}`
                  : ""}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                Student account: {conversation.studentId}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 text-xs text-muted-foreground">
              {conversation.unreadCount ? (
                <span className="rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground">
                  {conversation.unreadCount} unread
                </span>
              ) : (
                <span>No unread messages</span>
              )}
              <time
                dateTime={
                  conversation.lastMessage?.createdAt ?? conversation.updatedAt
                }
              >
                {formatDate(
                  conversation.lastMessage?.createdAt ?? conversation.updatedAt,
                )}
              </time>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm">
              {conversation.lastMessage
                ? `${conversation.lastMessage.senderRole === "admin" ? "You" : "Student"}: ${conversation.lastMessage.body}`
                : "No messages yet"}
            </p>
            <ArrowUpRight
              className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              size={16}
              aria-hidden
            />
          </div>
        </Link>
      ))}
    </section>
  );
}
