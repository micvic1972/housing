import Link from "next/link";
import { isClientClerkConfigured } from "../lib/clerk-config";
import ProfileContent from "./ProfileContent";
import styles from "./page.module.css";

export default function ProfilePage() {
  if (!isClientClerkConfigured()) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your space</p>
          <h1>Profile</h1>
          <p>Account details are unavailable until sign-in is configured.</p>
        </header>
        <section className={styles.message} role="status">
          <p>Set up Clerk to view an authenticated student profile.</p>
          <Link href="/sign-in">Go to sign in</Link>
        </section>
      </main>
    );
  }

  return <ProfileContent />;
}
