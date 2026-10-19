import { SignIn } from "@clerk/nextjs";
import { clerkAdminIsConfigured } from "../../lib/admin-authorization";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary">Delta Housing</p>
          <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your Delta Housing administrator account to manage listings and photos.
          </p>
        </div>
        {clerkAdminIsConfigured() ? (
          <SignIn routing="hash" signUpUrl="/login" />
        ) : (
          <p className="text-sm text-destructive" role="alert">
            Clerk is not configured. Set the Clerk keys and administrator user
            ID on the server before signing in.
          </p>
        )}
      </section>
    </main>
  );
}
