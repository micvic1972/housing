"use client";

// Table of saved listings (GET /listings) with a Delete button on each row.
// `refreshKey` goes up after each save in the form, which makes this reload.

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = "/api/admin";

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

// The API now returns { data, meta } instead of a raw array.
type ListingsResponse = {
  data: Row[];
  meta: {
    count: number;
    collection: string;
    sort: string;
    search: string | null;
  };
};

export default function ListingsTable({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API}/listings`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((response: ListingsResponse) => {
        if (!cancelled) {
          setRows(response.data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load listings. Is the API running?");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Ask first, call the API, then drop the row from the screen.
  async function handleDelete(row: Row) {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;

    setDeletingId(row.id);

    try {
      const res = await fetch(`${API}/listings/${row.id}`, { method: "DELETE" });

      if (!res.ok && res.status !== 404) {
        throw new Error(String(res.status));
      }

      setRows((current) =>
        current ? current.filter((r) => r.id !== row.id) : current
      );
    } catch {
      window.alert("Could not delete. Is the API running?");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (rows === null) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No listings saved yet.</p>;
  }

  return (
    // overflow-x-auto lets the table scroll sideways on a phone
    // instead of pushing the whole page wider.
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Price (NGN)</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead className="text-right">Action</TableHead>
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

              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-11 md:min-h-8"
                  disabled={deletingId === r.id}
                  onClick={() => handleDelete(r)}
                >
                  {deletingId === r.id ? "Deleting..." : "Delete"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}