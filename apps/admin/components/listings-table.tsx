"use client";

// ============================================================================
// apps/admin/components/listings-table.tsx
// A simple table of every listing saved so far, read from GET /listings.
//
// `refreshKey` is a number the page bumps after each save. When it changes,
// this table fetches again, so a new listing appears without a page reload.
// ============================================================================

import { useEffect, useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Only the columns this table shows.
type Row = {
  id: string;
  name: string;
  area: string;
  kind: string;
  priceAmount: number;
  pricePeriod: string;
  verified: boolean;
};

export default function ListingsTable({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/listings`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Row[]) => {
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load listings. Is the API running?");
      });
    // If the page changes before the answer arrives, ignore the answer.
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (rows === null) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No listings saved yet.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Price (NGN)</TableHead>
          <TableHead>Verified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>{r.area}</TableCell>
            <TableCell>{r.kind}</TableCell>
            <TableCell>
              {r.priceAmount.toLocaleString("en-NG")} / {r.pricePeriod}
            </TableCell>
            <TableCell>{r.verified ? "Yes" : "No"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}