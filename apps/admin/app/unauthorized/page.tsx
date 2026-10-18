import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center gap-4">
      <p className="text-sm font-semibold text-destructive">Access denied</p>
      <h1 className="text-2xl font-bold tracking-tight">
        Administrator access required
      </h1>
      <p className="text-sm text-muted-foreground">
        This signed-in account is not authorized to manage UniNest listings.
      </p>
      <Link className="text-sm font-medium text-primary underline" href="/login">
        Use another account
      </Link>
    </main>
  );
}
