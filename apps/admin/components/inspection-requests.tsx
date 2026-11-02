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

type RequestStatus = InspectionRequest["status"];
type StatusFilter = "all" | RequestStatus;

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All requests" },
  { value: "requested", label: "Needs review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<RequestStatus, string> = {
  requested: "border-amber-300 bg-amber-50 text-amber-900",
  confirmed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  declined: "border-rose-300 bg-rose-50 text-rose-900",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
  completed: "border-sky-300 bg-sky-50 text-sky-900",
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleTimes, setRescheduleTimes] = useState<
    Record<string, string>
  >({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [minimumInspectionTime, setMinimumInspectionTime] = useState("");
  const visibleRequests =
    statusFilter === "all"
      ? requests
      : requests.filter((request) => request.status === statusFilter);
  const responseFor = (request: InspectionRequest) =>
    responses[request.id] ?? request.adminResponse ?? "";
  const hasResponse = (request: InspectionRequest) =>
    Boolean(responseFor(request).trim());
  const hasValidProposal = (requestId: string) => {
    const value = rescheduleTimes[requestId];
    return (
      Boolean(value && minimumInspectionTime) && value >= minimumInspectionTime
    );
  };

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
  return (
    <section className="space-y-5">
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Request queue</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {requests.length} {requests.length === 1 ? "request" : "requests"}
            {visibleRequests.length !== requests.length
              ? ` · ${visibleRequests.length} shown`
              : ""}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter inspection requests by status"
        >
          {filters.map((filter) => {
            const count =
              filter.value === "all"
                ? requests.length
                : requests.filter((request) => request.status === filter.value)
                    .length;
            const selected = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setStatusFilter(filter.value)}
                className={`min-h-10 rounded-full border px-3 text-sm font-medium ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {filter.label} <span>({count})</span>
              </button>
            );
          })}
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded border border-destructive p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
      {!ready ? <p role="status">Refreshing requests…</p> : null}
      {visibleRequests.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          {requests.length === 0
            ? "No inspection requests have been submitted."
            : `No ${filters.find((filter) => filter.value === statusFilter)?.label.toLowerCase()} to show.`}
        </p>
      ) : null}
      {visibleRequests.map((request) => (
        <article
          className="space-y-3 rounded-xl border p-4"
          key={request.id}
          aria-busy={busyId === request.id}
        >
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
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                statusStyles[request.status]
              }`}
            >
              {request.status === "requested" ? "Needs review" : request.status}
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
                aria-label={`Response to student for ${request.listing.name}`}
                aria-describedby={`response-help-${request.id}`}
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
              <span
                id={`response-help-${request.id}`}
                className="text-xs text-muted-foreground"
              >
                Required before confirming, declining, or proposing a time.
                {` ${responseFor(request).length}/1000 characters.`}
              </span>
            </label>
          ) : null}
          <div
            className="flex flex-wrap items-end gap-2 border-t pt-3"
            role="group"
            aria-label={`Actions for ${request.listing.name}`}
          >
            {request.status === "requested" ? (
              <>
                <button
                  type="button"
                  className="min-h-10 rounded-md bg-primary px-3 text-primary-foreground"
                  disabled={
                    busyId === request.id ||
                    Boolean(request.rescheduleProposedFor) ||
                    !hasResponse(request)
                  }
                  onClick={() =>
                    void update(request.id, {
                      status: "confirmed",
                      adminResponse: responseFor(request),
                    })
                  }
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border px-3"
                  disabled={busyId === request.id || !hasResponse(request)}
                  onClick={() =>
                    void update(request.id, {
                      status: "declined",
                      adminResponse: responseFor(request),
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
                <label className="flex min-h-10 flex-wrap items-center gap-2 text-sm">
                  <span>Propose a different time</span>
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
                    if (value && hasResponse(request)) {
                      void update(request.id, {
                        scheduledFor: new Date(value).toISOString(),
                        adminResponse: responseFor(request),
                      });
                    }
                  }}
                  disabled={
                    busyId === request.id ||
                    !hasResponse(request) ||
                    !hasValidProposal(request.id)
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
