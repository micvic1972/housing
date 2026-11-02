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

export type InspectionStatus =
  "requested" | "confirmed" | "completed" | "cancelled";

export type LocalInspection = {
  id: string;
  listingId: string;
  status: InspectionStatus;
  requestedAt: string;
};

type StudentActivityContextValue = {
  inspections: LocalInspection[];
  ready: boolean;
  error: string | null;
  requestInspection: (listingId: string) => boolean;
  cancelInspection: (inspectionId: string) => boolean;
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

function createId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure random IDs are not available in this browser.");
  }
  return globalThis.crypto.randomUUID();
}

export function StudentActivityProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<LocalInspection[]>([]);
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
            !parsed.inspections.every(isInspection)
          ) {
            throw new Error("Stored student activity is invalid.");
          }
          setInspections(parsed.inspections);
        }
      } catch {
        setError("Local demo activity could not be read from this device.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const save = useCallback((nextInspections: LocalInspection[]) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ inspections: nextInspections }),
      );
    } catch {
      setError("Local demo activity could not be saved on this device.");
      return false;
    }
    setInspections(nextInspections);
    setError(null);
    return true;
  }, []);

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
        return save(next);
      } catch {
        setError("Could not create a local demo inspection request.");
        return false;
      }
    },
    [inspections, ready, save],
  );

  const cancelInspection = useCallback(
    (inspectionId: string) => {
      if (!ready) return false;
      const next = inspections.map((inspection) =>
        inspection.id === inspectionId && inspection.status === "requested"
          ? { ...inspection, status: "cancelled" as const }
          : inspection,
      );
      return save(next);
    },
    [inspections, ready, save],
  );

  const value = useMemo(
    () => ({
      inspections,
      ready,
      error,
      requestInspection,
      cancelInspection,
    }),
    [inspections, ready, error, requestInspection, cancelInspection],
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
