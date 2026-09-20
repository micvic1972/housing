"use client";

import { Search } from "lucide-react";
import { FEEDS, type FeedId } from "../../config/feeds";
import styles from "./DiscoveryTabs.module.css";

interface DiscoveryTabsProps {
  activeId: FeedId;
  onChange: (id: FeedId) => void;
  onSearchPress: () => void;
}

export default function DiscoveryTabs({ activeId, onChange, onSearchPress }: DiscoveryTabsProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.row}>
        <div className={styles.pill} role="tablist" aria-label="Discovery feeds">
          {FEEDS.map((feed) => {
            const active = feed.id === activeId;
            return (
              <button
                key={feed.id}
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