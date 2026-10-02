"use client";

// ============================================================================
// apps/admin/app/page.tsx
// The Listings page: the form on top, the saved listings below.
//
// This is where ListingForm and ListingsTable are mounted. After the form
// saves, we bump `refreshKey`, which makes the table fetch again.
// ============================================================================

import { useState } from "react";

import ListingForm from "@/components/listings-form";
import ListingsTable from "@/components/listings-table";

export default function ListingsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Add a listing</h1>
        <ListingForm onSaved={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Saved listings</h2>
        <ListingsTable refreshKey={refreshKey} />
      </section>
    </div>
  );
}