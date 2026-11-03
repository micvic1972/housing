"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiBase } from "./api-base";
import {
  getApiErrorMessage,
  getApiResponseError,
  readApiServerMessage,
} from "./api-errors";

export type InspectionRequest = {
  id: string;
  listingId: string;
  scheduledFor: string;
  rescheduleProposedFor: string | null;
  status: "requested" | "confirmed" | "declined" | "cancelled" | "completed";
  notes: string | null;
  adminResponse: string | null;
  createdAt: string;
  listing: { id: string; name: string; area: string; campus?: string | null };
};

type InspectionRequestsValue = {
  requests: InspectionRequest[];
  ready: boolean;
  signedIn: boolean;
  error: string | null;
  reload: () => void;
  createRequest: (
    listingId: string,
    scheduledFor: string,
    clientRequestId: string,
  ) => Promise<{ success: true } | { success: false; message: string }>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  acceptReschedule: (requestId: string) => Promise<boolean>;
  declineReschedule: (requestId: string) => Promise<boolean>;
};

const emptyValue: InspectionRequestsValue = {
  requests: [],
  ready: true,
  signedIn: false,
  error: null,
  reload: () => {},
  createRequest: async () => ({
    success: false,
    message: "Inspection requests are unavailable.",
  }),
  cancelRequest: async () => false,
  acceptReschedule: async () => false,
  declineReschedule: async () => false,
};
const InspectionRequestsContext =
  createContext<InspectionRequestsValue>(emptyValue);

export function InspectionRequestsProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <InspectionRequestsContext.Provider value={emptyValue}>
        {children}
      </InspectionRequestsContext.Provider>
    );
  }
  return (
    <AuthenticatedInspectionRequests>
      {children}
    </AuthenticatedInspectionRequests>
  );
}

function AuthenticatedInspectionRequests({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (!isLoaded) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError("Inspection requests took too long to load. Retry.");
      setLoadedForUser(userId);
      setLoading(false);
    }, 8_000);
    const timer = window.setTimeout(() => {
      if (!isSignedIn || !userId) {
        setRequests([]);
        setLoadedForUser(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      void (async () => {
        try {
          const token = await getToken();
          if (!token) {
            throw new Error(
              "Your session token is unavailable. Sign out and back in to load inspection requests.",
            );
          }
          const response = await fetch(`${apiBase()}/inspections`, {
            headers: { authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          });
          const body: unknown = await response.json();
          if (!response.ok) {
            throw new Error(
              getApiResponseError(
                response.status,
                readApiServerMessage(body),
                "Inspection requests failed",
              ),
            );
          }
          if (
            typeof body !== "object" ||
            body === null ||
            !("data" in body) ||
            !Array.isArray(body.data)
          ) {
            throw new Error("Inspection response has an invalid shape.");
          }
          if (!controller.signal.aborted) {
            setRequests(body.data as InspectionRequest[]);
            setLoadedForUser(userId);
            setError(null);
          }
        } catch (loadError) {
          if (!controller.signal.aborted) {
            setError(
              getApiErrorMessage(
                loadError,
                "Could not load inspection requests.",
              ),
            );
          }
        } finally {
          window.clearTimeout(timeout);
          if (!controller.signal.aborted) {
            setLoadedForUser(userId);
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [getToken, isLoaded, isSignedIn, userId, version]);

  const createRequest = useCallback(
    async (
      listingId: string,
      scheduledFor: string,
      clientRequestId: string,
    ): Promise<{ success: true } | { success: false; message: string }> => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error(
            "Your session token is unavailable. Sign out and back in to request an inspection.",
          );
        }
        const response = await fetch(`${apiBase()}/inspections`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            listingId,
            scheduledFor,
            clientRequestId,
          }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiResponseError(
              response.status,
              readApiServerMessage(body),
              "Inspection request failed",
            ),
          );
        }
        if (
          typeof body !== "object" ||
          body === null ||
          !("data" in body) ||
          typeof body.data !== "object" ||
          body.data === null ||
          !("id" in body.data) ||
          typeof body.data.id !== "string"
        ) {
          throw new Error(
            "Inspection response did not confirm a saved request.",
          );
        }
        reload();
        setError(null);
        return { success: true };
      } catch (requestError) {
        const message = getApiErrorMessage(
          requestError,
          "Could not submit the inspection request.",
        );
        setError(message);
        return { success: false, message };
      }
    },
    [getToken, reload],
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error(
            "Your session token is unavailable. Sign out and back in to cancel this request.",
          );
        }
        const response = await fetch(
          `${apiBase()}/inspections/${encodeURIComponent(requestId)}/cancel`,
          {
            method: "PATCH",
            headers: { authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          throw new Error(
            getApiResponseError(
              response.status,
              readApiServerMessage(body),
              "Cancellation failed",
            ),
          );
        }
        reload();
        setError(null);
        return true;
      } catch (cancelError) {
        setError(
          getApiErrorMessage(
            cancelError,
            "Could not cancel inspection request.",
          ),
        );
        return false;
      }
    },
    [getToken, reload],
  );

  const acceptReschedule = useCallback(
    async (requestId: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error(
            "Your session token is unavailable. Sign out and back in to accept this time.",
          );
        }
        const response = await fetch(
          `${apiBase()}/inspections/${encodeURIComponent(requestId)}/accept-reschedule`,
          {
            method: "PATCH",
            headers: { authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          throw new Error(
            getApiResponseError(
              response.status,
              readApiServerMessage(body),
              "Accepting the proposed time failed",
            ),
          );
        }
        reload();
        setError(null);
        return true;
      } catch (acceptError) {
        setError(
          getApiErrorMessage(
            acceptError,
            "Could not accept the proposed time.",
          ),
        );
        return false;
      }
    },
    [getToken, reload],
  );

  const declineReschedule = useCallback(
    async (requestId: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error(
            "Your session token is unavailable. Sign out and back in to decline this time.",
          );
        }
        const response = await fetch(
          `${apiBase()}/inspections/${encodeURIComponent(requestId)}/decline-reschedule`,
          {
            method: "PATCH",
            headers: { authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          throw new Error(
            getApiResponseError(
              response.status,
              readApiServerMessage(body),
              "Declining the proposed time failed",
            ),
          );
        }
        reload();
        setError(null);
        return true;
      } catch (declineError) {
        setError(
          getApiErrorMessage(
            declineError,
            "Could not decline the proposed time.",
          ),
        );
        return false;
      }
    },
    [getToken, reload],
  );

  const ready =
    isLoaded &&
    (!isSignedIn || (Boolean(userId) && loadedForUser === userId && !loading));
  const value = useMemo(
    () => ({
      requests,
      ready,
      signedIn: Boolean(isSignedIn),
      error,
      reload,
      createRequest,
      cancelRequest,
      acceptReschedule,
      declineReschedule,
    }),
    [
      requests,
      ready,
      isSignedIn,
      error,
      reload,
      createRequest,
      cancelRequest,
      acceptReschedule,
      declineReschedule,
    ],
  );

  return (
    <InspectionRequestsContext.Provider value={value}>
      {children}
    </InspectionRequestsContext.Provider>
  );
}

export function useInspectionRequests() {
  return useContext(InspectionRequestsContext);
}
