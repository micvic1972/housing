import styles from "./comingsoon.module.css";

interface ComingSoonProps {
  title: string;
}

// Shared stub for every route that doesn't have real content yet.
// Keeps every unfinished page on-theme, so navigating to it never
// flashes an unstyled default screen.
export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>This page is coming soon.</p>
    </main>
  );
}
