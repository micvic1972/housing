import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import {
  isClientClerkConfigured,
  isLocalDemoModeEnabled,
} from "../../lib/clerk-config";
import styles from "./AuthPage.module.css";

interface AuthPageProps {
  mode: "sign-in" | "sign-up";
}

export default function AuthPage({ mode }: AuthPageProps) {
  const configured = isClientClerkConfigured();
  const demoMode = isLocalDemoModeEnabled();
  const isSignIn = mode === "sign-in";

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <Link href="/" className={styles.brand}>
          Delta Housing
        </Link>
        <h1 className={styles.title}>
          {isSignIn ? "Welcome back" : "Create your account"}
        </h1>
        <p className={styles.description}>
          {isSignIn
            ? "Sign in to continue to your student tools."
            : "Create an account to use inspections, messages, and your profile."}
        </p>

        {demoMode ? (
          <div className={styles.setup} role="status">
            <strong>Local demo mode is active.</strong>
            <span>
              This environment is using the built-in sample student account so the
              product can be exercised without production Clerk credentials.
            </span>
          </div>
        ) : !configured ? (
          <div className={styles.setup} role="status">
            <strong>Sign-in is not configured for this app.</strong>
            <span>
              Configure matching Clerk keys for this environment. Production
              deployments must use keys from the Clerk Production instance.
            </span>
          </div>
        ) : isSignIn ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: styles.clerkRoot,
                cardBox: styles.clerkCardBox,
                card: styles.clerkCard,
              },
            }}
          />
        ) : (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: styles.clerkRoot,
                cardBox: styles.clerkCardBox,
                card: styles.clerkCard,
              },
            }}
          />
        )}
      </section>
    </main>
  );
}
