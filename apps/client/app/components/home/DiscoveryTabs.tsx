"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { FEEDS, type FeedId } from "../../config/feeds";
import styles from "./DiscoveryTabs.module.css";

interface DiscoveryTabsProps {
  defaultId?: FeedId;
  onChange?: (id: FeedId) => void;
  onSearchPress?: () => void;
}

// Owns its own active-tab state — a tap can never fail to register
// because of something broken elsewhere in the page. Once the data layer
// exists and Home needs to filter listings by feed, wire onChange to that.
export default function DiscoveryTabs({ defaultId = "for-you", onChange, onSearchPress }: DiscoveryTabsProps) {
  const [activeId, setActiveId] = useState<FeedId>(defaultId);

  function selectTab(id: FeedId) {
    setActiveId(id);
    onChange?.(id);
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.row}>
        <div className={styles.pill} role="tablist" aria-label="Discovery feeds">
          {FEEDS.map((feed) => {
            const active = feed.id === activeId;
            return (
              <button
                key={feed.id}
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(feed.id)}
              >
                {feed.label}
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.searchBtn} aria-label="Search and filter" onClick={onSearchPress}>
          <Search size={19} />
        </button>
      </div>
    </header>
  );
}