import type { ReactNode } from "react";
import styles from "./AppShell.module.css";
import BottomNav from "./BottomNav";
import SideRail from "./SideRail";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.railSlot}>
        <SideRail />
      </div>
      <div className={styles.content}>{children}</div>
      <div className={styles.navSlot}>
        <BottomNav />
      </div>
    </div>
  );
}