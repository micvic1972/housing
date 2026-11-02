"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiBase } from "./api-base";
import {
  isAccountDataVisible,
  isCurrentAccountRequest,
  type AccountScope,
} from "./account-scope";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "student" | "admin";
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  listingId: string;
  studentId: string;
  assignedAdminId: string | null;
  updatedAt: string;
  listing: { id: string; name: string; area: string; campus: string | null };
  lastMessage: Message | null;
  unreadCount: number;
};

export type Conversation = ConversationSummary & { messages: Message[] };

type MessagingValue = {
  conversations: ConversationSummary[];
  ready: boolean;
  signedIn: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  openConversation: (id: string) => Promise<Conversation>;
  createConversation: (listingId: string) => Promise<string>;
  sendMessage: (
    id: string,
    text: string,
    clientMessageId: string,
  ) => Promise<Message>;
};

const MessagingContext = createContext<MessagingValue | null>(null);

function readError(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}

function readData<T>(body: unknown, fallback: string): T {
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new Error(fallback);
  }
  return body.data as T;
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const accountScope = useRef<AccountScope>({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
  });

  useLayoutEffect(() => {
    loadedUserIdRef.current = loadedUserId;
  }, [loadedUserId]);

  useLayoutEffect(() => {
    accountScope.current = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
    };
  }, [isLoaded, isSignedIn, userId]);

  const authorizedFetch = useCallback(
    async (path: string, requestUserId: string, init?: RequestInit) => {
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        throw new Error("Sign in again to use messages.");
      }
      const token = await getToken();
      if (
        !token ||
        !isCurrentAccountRequest(accountScope.current, requestUserId)
      ) {
        throw new Error("Sign in again to use messages.");
      }
      return fetch(`${apiBase()}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
    },
    [getToken],
  );

  const refresh = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
      setConversations([]);
      loadedUserIdRef.current = null;
      setLoadedUserId(null);
      setReady(true);
      setError(null);
      return;
    }
    const requestUserId = userId;
    if (loadedUserIdRef.current !== requestUserId) {
      setConversations([]);
      setLoadedUserId(null);
      loadedUserIdRef.current = null;
      setReady(false);
      setError(null);
    }

    try {
      const response = await authorizedFetch("/conversations", requestUserId);
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readError(body, `Messages failed (${response.status})`),
        );
      }
      const data = readData<ConversationSummary[]>(
        body,
        "Message inbox response is invalid.",
      );
      if (!Array.isArray(data))
        throw new Error("Message inbox response is invalid.");
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        return;
      }
      setConversations(data);
      loadedUserIdRef.current = requestUserId;
      setLoadedUserId(requestUserId);
      setError(null);
    } catch (loadError) {
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        return;
      }
      loadedUserIdRef.current = requestUserId;
      setLoadedUserId(requestUserId);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load messages.",
      );
      throw loadError;
    } finally {
      if (isCurrentAccountRequest(accountScope.current, requestUserId)) {
        setReady(true);
      }
    }
  }, [authorizedFetch, isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !userId) return;
    const timer = window.setTimeout(() => {
      void refresh().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, refresh, userId]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Sign in again to use messages.");
      const requestUserId = userId;
      const response = await authorizedFetch(
        `/conversations/${encodeURIComponent(id)}`,
        requestUserId,
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readError(body, `Conversation failed (${response.status})`),
        );
      }
      const conversation = readData<Conversation>(
        body,
        "Conversation response is invalid.",
      );
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        throw new Error("Account changed while loading this conversation.");
      }
      await refresh().catch(() => undefined);
      return conversation;
    },
    [authorizedFetch, refresh, userId],
  );

  const createConversation = useCallback(
    async (listingId: string) => {
      if (!userId) throw new Error("Sign in again to use messages.");
      const requestUserId = userId;
      const response = await authorizedFetch("/conversations", requestUserId, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readError(body, `Could not start conversation (${response.status})`),
        );
      }
      const conversation = readData<{ id: string }>(
        body,
        "Conversation response is invalid.",
      );
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        throw new Error("Account changed while creating this conversation.");
      }
      await refresh().catch(() => undefined);
      return conversation.id;
    },
    [authorizedFetch, refresh, userId],
  );

  const sendMessage = useCallback(
    async (id: string, text: string, clientMessageId: string) => {
      if (!userId) throw new Error("Sign in again to use messages.");
      const requestUserId = userId;
      const response = await authorizedFetch(
        `/conversations/${encodeURIComponent(id)}/messages`,
        requestUserId,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            body: text,
            clientMessageId,
          }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readError(body, `Could not send message (${response.status})`),
        );
      }
      const message = readData<Message>(body, "Message response is invalid.");
      if (!isCurrentAccountRequest(accountScope.current, requestUserId)) {
        throw new Error("Account changed while sending this message.");
      }
      await refresh().catch(() => undefined);
      return message;
    },
    [authorizedFetch, refresh, userId],
  );

  const value = useMemo(() => {
    const dataVisible = isAccountDataVisible(
      { isLoaded, isSignedIn: Boolean(isSignedIn), userId: userId ?? null },
      loadedUserId,
    );
    return {
      conversations: dataVisible ? conversations : [],
      ready: isLoaded && (!isSignedIn || (dataVisible && ready)),
      signedIn: Boolean(isSignedIn),
      error: dataVisible ? error : null,
      refresh,
      openConversation,
      createConversation,
      sendMessage,
    };
  }, [
    conversations,
    isLoaded,
    ready,
    isSignedIn,
    error,
    loadedUserId,
    refresh,
    openConversation,
    createConversation,
    sendMessage,
    userId,
  ]);

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging(): MessagingValue {
  const context = useContext(MessagingContext);
  if (!context)
    throw new Error("useMessaging must be used inside MessagingProvider");
  return context;
}
