import Link from "next/link";
import {
  isClientClerkConfigured,
  isLocalDemoModeEnabled,
} from "../../lib/clerk-config";
import ProfileSettings from "./ProfileSettings";
import styles from "./page.module.css";

export default function ProfileSettingsPage() {
  if (isLocalDemoModeEnabled()) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>Demo settings</h1>
        </header>
        <p className={styles.notice}>
          Local demo mode is active. The student demo account can use the app
          without live Clerk configuration.
        </p>
        <Link className={styles.back} href="/profile">
          Back to profile
        </Link>
      </main>
    );
  }
  if (!isClientClerkConfigured()) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>Settings</h1>
        </header>
        <p className={styles.notice}>
          Configure Clerk to manage account settings.
        </p>
        <Link className={styles.back} href="/profile">
          Back to profile
        </Link>
      </main>
    );
  }
  return <ProfileSettings />;
}
