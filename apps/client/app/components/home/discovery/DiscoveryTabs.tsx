"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { FEEDS, type FeedId } from "../../../config/feeds";
import { smoothScrollTo } from "../../../lib/smoothScrollTo";
import { cx } from "../../../lib/cx";
import base from "./DiscoveryTabs.module.css";
import desktop from "./DiscoveryTabs.desktop.module.css";

interface DiscoveryTabsProps {
  defaultId?: FeedId;
  onChange?: (id: FeedId) => void;
  onSearchPress?: () => void;
}

export default function DiscoveryTabs({ defaultId = "for-you", onChange, onSearchPress }: DiscoveryTabsProps) {
  const [activeId, setActiveId] = useState<FeedId>(defaultId);
  const pillRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function selectTab(id: FeedId) {
    setActiveId(id);
    onChange?.(id);

    const pill = pillRef.current;
    const tab = tabRefs.current[id];
    if (!pill || !tab) return;

    const target = tab.offsetLeft - (pill.clientWidth - tab.offsetWidth) / 2;
    const max = pill.scrollWidth - pill.clientWidth;
    smoothScrollTo(pill, Math.max(0, Math.min(target, max)));
  }

  return (
    <header className={base.topbar}>
      <div className={cx(base.row, desktop.row)}>
        <div className={base.pill} role="tablist" aria-label="Discovery feeds" ref={pillRef}>
          {FEEDS.map((feed) => {
            const active = feed.id === activeId;
            return (
              <button
                key={feed.id}
                type="button"
                role="tab"
                ref={(node) => {
                  tabRefs.current[feed.id] = node;
                }}
                className={cx(base.tab, desktop.tab)}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(feed.id)}
              >
                {feed.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={cx(base.searchBtn, desktop.searchBtn)}
          aria-label="Search and filter"
          onClick={onSearchPress}
        >
          <Search size={19} />
        </button>
      </div>
    </header>
  );
}