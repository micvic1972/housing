import styles from "./comingsoon.module.css";

interface ComingSoonProps {
  title: string;
  body?: string;
}

// Shared stub for every route that doesn't have real content yet.
// Keeps every unfinished page on-theme, so navigating to it never
// flashes an unstyled default screen.
export default function ComingSoon({
  title,
  body = "This page is coming soon.",
}: ComingSoonProps) {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
    </main>
  );
}
