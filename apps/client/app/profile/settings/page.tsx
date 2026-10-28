import Link from "next/link";
import { isClientClerkConfigured } from "../../lib/clerk-config";
import ProfileSettings from "./ProfileSettings";
import styles from "./page.module.css";

export default function ProfileSettingsPage() {
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
