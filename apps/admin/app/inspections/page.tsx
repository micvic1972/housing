import InspectionRequests from "@/components/inspection-requests";

export default function InspectionRequestsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Student visits
        </p>
        <h1 className="text-2xl font-semibold">Inspection requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review, confirm, decline, complete, or reschedule real requests.
        </p>
      </header>
      <InspectionRequests />
    </div>
  );
}
