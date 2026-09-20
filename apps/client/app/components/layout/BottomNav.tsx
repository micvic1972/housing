"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, ClipboardList, User, MoreHorizontal, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavId } from "../../config/nav-items";
import styles from "./BottomNav.module.css";

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
  const activeItem = NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0];
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = () => {
    const el = itemRefs.current[activeItem.id];
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };

  useLayoutEffect(measure, [activeItem.id]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeItem.id]);

  return (
    <nav className={styles.bar} aria-label="Primary">
      <span
        className={styles.thumb}
        style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        aria-hidden="true"
      />
      {NAV_ITEMS.map((item) => {
        const active = item.id === activeItem.id;
        const Icon = ICONS[item.id];
        return (
          <Link
            key={item.id}
            href={item.href}
            ref={(node) => {
              itemRefs.current[item.id] = node;
            }}
            className={styles.item}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.3 : 1.8} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}