"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

import { FEEDS, type FeedId } from "../../../config/feeds";
import { useFilters } from "../../../components/filter/FilterProvider";
import { cx } from "../../../lib/cx";

import base from "./DiscoveryTabs.module.css";
import desktop from "./DiscoveryTabs.desktop.module.css";

interface DiscoveryTabsProps {
  activeId: FeedId;
  onChange: (id: FeedId) => void;
}

export default function DiscoveryTabs({
  activeId,
  onChange,
}: DiscoveryTabsProps) {
  const { openSheet } = useFilters();

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function centerTab(id: FeedId) {
    const tab = tabRefs.current[id];
    if (!tab) return;
    tab.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  function selectTab(id: FeedId) {
    onChange(id);
    requestAnimationFrame(() => {
      centerTab(id);
    });
  }

  return (
    <header className={base.topbar}>
      <div className={cx(base.row, desktop.row)}>
        <div
          className={base.pill}
          role="tablist"
          aria-label="Discovery feeds"
          aria-orientation="horizontal"
        >
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
                onClick={() => {
                  selectTab(feed.id);
                }}
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
          aria-haspopup="dialog"
          onClick={() => openSheet("all")}
        >
          <Search size={19} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}