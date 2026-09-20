"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, ClipboardList, User, MoreHorizontal, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavId } from "../../config/nav-items";
import styles from "./SideRail.module.css";

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

export default function SideRail() {
  const pathname = usePathname();

  return (
    <nav className={styles.rail} aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.id];
        return (
          <Link key={item.id} href={item.href} className={styles.item} aria-current={active ? "page" : undefined}>
            <Icon size={22} strokeWidth={active ? 2.3 : 1.8} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}