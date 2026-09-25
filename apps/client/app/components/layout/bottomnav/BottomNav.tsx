"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, ClipboardList, User, MoreHorizontal, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavId } from "../../../config/nav-items";
import { cx } from "../../../lib/cx";
import base from "./BottomNav.module.css";
import tablet from "./BottomNav.tablet.module.css";

const ICONS: Record<NavId, LucideIcon> = {
  home: Home,
  map: Map,
  inspections: ClipboardList,
  profile: User,
  more: MoreHorizontal,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;

      // 🛠️ Give it a small 10px buffer so tiny accidental vibrations don't trigger it
      if (Math.abs(currentScrollY - lastScrollY.current) < 10) {
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling Down -> Hide the bottom bar [0.1]
        setIsVisible(false);
      } else {
        // Scrolling Up -> Show the bottom bar [0.1]
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    /* 🛠️ Applies an inline CSS variable or utility modifier class based on scroll direction */
    <nav 
      className={cx(base.bar, !isVisible ? base.barHidden : "")} 
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.id];
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cx(base.item, tablet.item)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} className={base.icon} />
            <span className={cx(base.label, tablet.label)}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}