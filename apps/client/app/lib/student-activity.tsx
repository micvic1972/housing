"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "delta-housing.student-activity-demo.v1";
const MAX_MESSAGE_LENGTH = 2000;

export type InspectionStatus =
  "requested" | "confirmed" | "completed" | "cancelled";

export type LocalInspection = {
  id: string;
  listingId: string;
  status: InspectionStatus;
  requestedAt: string;
};

export type LocalMessage = {
  id: string;
  text: string;
  createdAt: string;
};

export type LocalConversation = {
  id: string;
  listingId: string;
  createdAt: string;
  messages: LocalMessage[];
};

type StudentActivityContextValue = {
  inspections: LocalInspection[];
  conversations: LocalConversation[];
  ready: boolean;
  error: string | null;
  requestInspection: (listingId: string) => boolean;
  cancelInspection: (inspectionId: string) => boolean;
  startConversation: (listingId: string) => string | null;
  sendMessage: (conversationId: string, text: string) => boolean;
};

const StudentActivityContext =
  createContext<StudentActivityContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInspection(value: unknown): value is LocalInspection {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.listingId === "string" &&
    typeof value.requestedAt === "string" &&
    ["requested", "confirmed", "completed", "cancelled"].includes(
      String(value.status),
    )
  );
}

function isMessage(value: unknown): value is LocalMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.createdAt === "string"
  );
}

function isConversation(value: unknown): value is LocalConversation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.listingId === "string" &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function createId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure random IDs are not available in this browser.");
  }
  return globalThis.crypto.randomUUID();
}

export function StudentActivityProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<LocalInspection[]>([]);
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (
            !isRecord(parsed) ||
            !Array.isArray(parsed.inspections) ||
            !parsed.inspections.every(isInspection) ||
            !Array.isArray(parsed.conversations) ||
            !parsed.conversations.every(isConversation)
          ) {
            throw new Error("Stored student activity is invalid.");
          }
          setInspections(parsed.inspections);
          setConversations(parsed.conversations);
        }
      } catch {
        setError("Local demo activity could not be read from this device.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const save = useCallback(
    (
      nextInspections: LocalInspection[],
      nextConversations: LocalConversation[],
    ) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            inspections: nextInspections,
            conversations: nextConversations,
          }),
        );
      } catch {
        setError("Local demo activity could not be saved on this device.");
        return false;
      }
      setInspections(nextInspections);
      setConversations(nextConversations);
      setError(null);
      return true;
    },
    [],
  );

  const requestInspection = useCallback(
    (listingId: string) => {
      if (!ready) return false;
      const existing = inspections.some(
        (inspection) =>
          inspection.listingId === listingId &&
          (inspection.status === "requested" ||
            inspection.status === "confirmed"),
      );
      if (existing) return true;

      try {
        const next = [
          ...inspections,
          {
            id: createId(),
            listingId,
            status: "requested" as const,
            requestedAt: new Date().toISOString(),
          },
        ];
        return save(next, conversations);
      } catch {
        setError("Could not create a local demo inspection request.");
        return false;
      }
    },
    [conversations, inspections, ready, save],
  );

  const cancelInspection = useCallback(
    (inspectionId: string) => {
      if (!ready) return false;
      const next = inspections.map((inspection) =>
        inspection.id === inspectionId && inspection.status === "requested"
          ? { ...inspection, status: "cancelled" as const }
          : inspection,
      );
      return save(next, conversations);
    },
    [conversations, inspections, ready, save],
  );

  const startConversation = useCallback(
    (listingId: string) => {
      if (!ready) return null;
      const existing = conversations.find(
        (conversation) => conversation.listingId === listingId,
      );
      if (existing) return existing.id;

      try {
        const id = createId();
        const next = [
          ...conversations,
          {
            id,
            listingId,
            createdAt: new Date().toISOString(),
            messages: [],
          },
        ];
        return save(inspections, next) ? id : null;
      } catch {
        setError("Could not create a local demo conversation.");
        return null;
      }
    },
    [conversations, inspections, ready, save],
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      const trimmed = text.trim();
      if (!ready || !trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
        return false;
      }
      try {
        const conversationExists = conversations.some(
          (conversation) => conversation.id === conversationId,
        );
        if (!conversationExists) return false;
        const now = new Date().toISOString();
        const next = conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  { id: createId(), text: trimmed, createdAt: now },
                ],
              }
            : conversation,
        );
        return save(inspections, next);
      } catch {
        setError("Could not add a message to this local demo conversation.");
        return false;
      }
    },
    [conversations, inspections, ready, save],
  );

  const value = useMemo(
    () => ({
      inspections,
      conversations,
      ready,
      error,
      requestInspection,
      cancelInspection,
      startConversation,
      sendMessage,
    }),
    [
      inspections,
      conversations,
      ready,
      error,
      requestInspection,
      cancelInspection,
      startConversation,
      sendMessage,
    ],
  );

  return (
    <StudentActivityContext.Provider value={value}>
      {children}
    </StudentActivityContext.Provider>
  );
}

export function useStudentActivity(): StudentActivityContextValue {
  const context = useContext(StudentActivityContext);
  if (!context) {
    throw new Error(
      "useStudentActivity must be used inside StudentActivityProvider",
    );
  }
  return context;
}
