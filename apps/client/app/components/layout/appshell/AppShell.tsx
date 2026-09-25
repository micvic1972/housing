"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import styles from "./AppShell.module.css";
import BottomNav from "../bottomnav/BottomNav";
import SideRail from "../siderail/SideRail";

export default function AppShell({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function updateScrollDirection() {
      const currentScrollY = window.scrollY;

      // Ignore tiny vibrations
      if (Math.abs(currentScrollY - lastScrollY.current) < 15) {
        ticking.current = false;
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsVisible(false); // Scrolling down -> Hide nav slot [0.1]
      } else {
        setIsVisible(true);  // Scrolling up -> Show nav slot [0.1]
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    }

    function handleScroll() {
      if (!ticking.current) {
        // 🛠️ RequestAnimationFrame forces the phone's GPU to sync the animation frame perfectly
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navSlotClassName = isVisible 
    ? styles.navSlot 
    : `${styles.navSlot} ${styles.navSlotHidden}`;

  return (
    <div className={styles.shell}>
      <div className={styles.railSlot}>
        <SideRail />
      </div>
      <div className={styles.content}>{children}</div>
      <div className={navSlotClassName}>
        <BottomNav />
      </div>
    </div>
  );
}