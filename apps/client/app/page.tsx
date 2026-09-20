"use client";

import DiscoveryTabs from "./components/home/discovery/DiscoveryTabs";

const SWATCHES = ["--bg", "--surface", "--primary", "--primary-soft", "--verified", "--border", "--urgent"];

export default function Page() {
  return (
    <>
      <DiscoveryTabs onSearchPress={() => alert("Filters sheet comes later")} />
      <main className="probe">
        {/* unchanged probe content from Step 1 */}
      </main>
    </>
  );
}