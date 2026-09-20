"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { FEEDS, type FeedId } from "../../config/feeds";
import styles from "./DiscoveryTabs.module.css";

interface DiscoveryTabsProps {
  activeId: FeedId;
  onChange: (id: FeedId) => void;
  onSearchPress: () => void;
}

export default function DiscoveryTabs({ activeId, onChange, onSearchPress }: DiscoveryTabsProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = () => {
    const el = tabRefs.current[activeId];
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };

  // Recompute on tab change and on resize, so the glass glides to the
  // right spot even if the pill's width changes (e.g. rotating the phone).
  useLayoutEffect(measure, [activeId]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId]);

  return (
    <header className={styles.topbar}>
      <div className={styles.row}>
        <div className={styles.pill} role="tablist" aria-label="Discovery feeds" ref={pillRef}>
          <span
            className={styles.thumb}
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
            aria-hidden="true"
          />
          {FEEDS.map((feed) => {
            const active = feed.id === activeId;
            return (
              <button
                key={feed.id}
                ref={(node) => {
                  tabRefs.current[feed.id] = node;
                }}
                role="tab"
                className={styles.tab}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(feed.id)}
              >
                {feed.label}
              </button>
            );
          })}
        </div>
        <button className={styles.searchBtn} aria-label="Search and filter" onClick={onSearchPress}>
          <Search size={19} />
        </button>
      </div>
    </header>
  );
}