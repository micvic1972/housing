"use client";

import { useCallback, useEffect, useState } from "react";

type InspectionRequest = {
  id: string;
  listingId: string;
  studentId: string;
  scheduledFor: string;
  rescheduleProposedFor: string | null;
  status: "requested" | "confirmed" | "declined" | "cancelled" | "completed";
  notes: string | null;
  adminResponse: string | null;
  createdAt: string;
  listing: { id: string; name: string; area: string; campus: string | null };
};

function localDateTime(value: string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function readableDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InspectionRequests() {
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleTimes, setRescheduleTimes] = useState<
    Record<string, string>
  >({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [minimumInspectionTime, setMinimumInspectionTime] = useState("");

  const load = useCallback(async () => {
    setReady(false);
    try {
      const response = await fetch("/api/admin/inspections", {
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : `Could not load inspection requests (${response.status})`;
        throw new Error(message);
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("data" in body) ||
        !Array.isArray(body.data)
      ) {
        throw new Error("Inspection response has an invalid shape.");
      }
      setRequests(body.data as InspectionRequest[]);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load inspection requests.",
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumInspectionTime(localDateTime(Date.now() + 30 * 60 * 1000));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function update(
    requestId: string,
    change: {
      status?: "confirmed" | "declined" | "completed";
      scheduledFor?: string;
      adminResponse?: string;
    },
  ) {
    setBusyId(requestId);
    try {
      const response = await fetch(
        `/api/admin/inspections/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(change),
        },
      );
      const body: unknown =
        response.status === 204 ? null : await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : `Could not update request (${response.status})`;
        throw new Error(message);
      }
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the inspection request.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!ready && requests.length === 0) {
    return <p role="status">Loading inspection requests…</p>;
  }
  if (error && requests.length === 0) {
    return (
      <section role="alert" className="space-y-3 rounded-lg border p-4">
        <p>{error}</p>
        <button
          className="rounded border px-3 py-2"
          onClick={() => void load()}
        >
          Retry
        </button>
      </section>
    );
  }
  if (requests.length === 0) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        No inspection requests have been submitted.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded border border-destructive p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
      {!ready ? <p role="status">Refreshing requests…</p> : null}
      {requests.map((request) => (
        <article className="space-y-3 rounded-xl border p-4" key={request.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{request.listing.name}</h2>
              <p className="text-sm text-muted-foreground">
                {request.listing.area}
                {request.listing.campus ? ` · ${request.listing.campus}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Student account: {request.studentId}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-sm capitalize">
              {request.status}
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Requested for</dt>
              <dd>{readableDate(request.scheduledFor)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{readableDate(request.createdAt)}</dd>
            </div>
            {request.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Student note</dt>
                <dd>{request.notes}</dd>
              </div>
            ) : null}
            {request.rescheduleProposedFor ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">
                  Proposed alternative time
                </dt>
                <dd>{readableDate(request.rescheduleProposedFor)}</dd>
              </div>
            ) : null}
            {request.adminResponse ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">
                  Last administrator response
                </dt>
                <dd>{request.adminResponse}</dd>
              </div>
            ) : null}
          </dl>
          {request.status === "requested" || request.status === "confirmed" ? (
            <label className="block space-y-1 text-sm">
              Response to student
              <textarea
                className="min-h-20 w-full rounded-md border bg-background p-2"
                maxLength={1000}
                value={responses[request.id] ?? request.adminResponse ?? ""}
                disabled={busyId === request.id}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setResponses((current) => ({
                    ...current,
                    [request.id]: value,
                  }));
                }}
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {request.status === "requested" ? (
              <>
                <button
                  type="button"
                  className="min-h-10 rounded-md bg-primary px-3 text-primary-foreground"
                  disabled={
                    busyId === request.id ||
                    Boolean(request.rescheduleProposedFor) ||
                    !(
                      responses[request.id] ??
                      request.adminResponse ??
                      ""
                    ).trim()
                  }
                  onClick={() =>
                    void update(request.id, {
                      status: "confirmed",
                      adminResponse:
                        responses[request.id] ?? request.adminResponse ?? "",
                    })
                  }
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border px-3"
                  disabled={
                    busyId === request.id ||
                    !(
                      responses[request.id] ??
                      request.adminResponse ??
                      ""
                    ).trim()
                  }
                  onClick={() =>
                    void update(request.id, {
                      status: "declined",
                      adminResponse:
                        responses[request.id] ?? request.adminResponse ?? "",
                    })
                  }
                >
                  Decline
                </button>
              </>
            ) : null}
            {request.status === "requested" ||
            request.status === "confirmed" ? (
              <>
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  Propose a different time
                  <input
                    type="datetime-local"
                    aria-label={`Reschedule ${request.listing.name}`}
                    min={minimumInspectionTime}
                    value={
                      rescheduleTimes[request.id] ??
                      localDateTime(
                        request.rescheduleProposedFor ?? request.scheduledFor,
                      )
                    }
                    disabled={busyId === request.id}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setRescheduleTimes((current) => ({
                        ...current,
                        [request.id]: value,
                      }));
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="min-h-10 rounded-md border px-3"
                  onClick={() => {
                    const value = rescheduleTimes[request.id];
                    if (
                      value &&
                      (
                        responses[request.id] ??
                        request.adminResponse ??
                        ""
                      ).trim()
                    ) {
                      void update(request.id, {
                        scheduledFor: new Date(value).toISOString(),
                        adminResponse:
                          responses[request.id] ?? request.adminResponse ?? "",
                      });
                    }
                  }}
                  disabled={
                    busyId === request.id ||
                    !(
                      responses[request.id] ??
                      request.adminResponse ??
                      ""
                    ).trim()
                  }
                >
                  Send time proposal
                </button>
                {request.status === "confirmed" &&
                !request.rescheduleProposedFor ? (
                  <button
                    type="button"
                    className="min-h-10 rounded-md border px-3"
                    disabled={busyId === request.id}
                    onClick={() =>
                      void update(request.id, { status: "completed" })
                    }
                  >
                    Mark completed
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
