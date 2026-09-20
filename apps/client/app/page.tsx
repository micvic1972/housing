"use client";

import { useState } from "react";
import DiscoveryTabs from "./components/home/DiscoveryTabs";
import type { FeedId } from "../../config/feeds";

const SWATCHES = ["--bg", "--surface", "--primary", "--primary-soft", "--verified", "--border", "--urgent"];

export default function Page() {
  const [activeId, setActiveId] = useState<FeedId>("for-you");

  return (
    <>
      <DiscoveryTabs
        activeId={activeId}
        onChange={setActiveId}
        onSearchPress={() => alert("Filters sheet comes later")}
      />
      <main className="probe">
        {/* unchanged probe content from Step 1 */}
      </main>
    </>
  );
}