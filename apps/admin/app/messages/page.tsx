import MessagesInbox from "@/components/messages-inbox";

export default function MessagesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Student enquiries
        </p>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and reply to persistent student conversations about listings.
        </p>
      </header>
      <MessagesInbox />
    </div>
  );
}
