"use client";

// ============================================================================
// apps/admin/components/listing-form.tsx
// The admin form: type in one real listing and save it to the API.
//
// It sends the FLAT shape the database uses (area, priceAmount, ...), not the
// nested shape the client app uses. Blank fields are left out of the request
// on purpose, so the database keeps them as "not reported yet" (honest-gap rule).
//
// Dropdowns and checkboxes are kept in React state (not read from the form)
// because shadcn's Select and Checkbox are custom controls. "unset" in a
// dropdown means "not reported yet" and is turned into "leave it out" on save.
// ============================================================================

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Where the API lives. Comes from apps/admin/.env.local.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const KINDS = ["available", "construction", "expiring", "rented"];
const STATUSES = ["active", "coming-soon", "expiring-soon", "rented", "unavailable"];
const ROOM_TYPES = ["single", "self-contained", "shared", "studio", "one-bedroom", "two-bedroom"];
const PRICE_PERIODS = ["year", "semester", "month"];
const CONTACT_TYPES = ["owner", "agent", "university-partner"];
const CHECKS = ["water", "power", "security", "in-person-visit"];
const ACCEPTED_PERIODS = ["year", "session", "semester", "month"];

// The starting value of every dropdown.
const DEFAULT_SELECTS: Record<string, string> = {
  kind: "available",
  status: "active",
  roomType: "single",
  pricePeriod: "year",
  contactType: "unset",
  inspectionFeeStatus: "unknown",
  hasSecurityPost: "unset",
  isGatedCompound: "unset",
};

// One label above one control.
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// A dropdown. `options` are [value, label] pairs.
function Pick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-h-11 w-full md:min-h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Plain words -> [word, word] pairs.
const pairs = (list: string[]): [string, string][] => list.map((x) => [x, x]);

// Yes / No / Not reported yet.
const TRI: [string, string][] = [
  ["unset", "Not reported yet"],
  ["yes", "Yes"],
  ["no", "No"],
];

// A row of checkboxes that adds/removes words from a list.
function CheckGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-3">
      {options.map((o) => (
        <label key={o} className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
          <Checkbox
            checked={selected.includes(o)}
            onCheckedChange={(on) => onChange(on === true ? [...selected, o] : selected.filter((x) => x !== o))}
          />
          {o}
        </label>
      ))}
    </div>
  );
}

export default function ListingForm({ onSaved }: { onSaved?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sel, setSel] = useState<Record<string, string>>(DEFAULT_SELECTS);
  const [verified, setVerified] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);

  // Short helper so each dropdown is one line below.
  const pick = (key: string) => (v: string) => setSel((s) => ({ ...s, [key]: v }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    // Empty box = undefined = left out of the request.
    const text = (k: string) => {
      const v = String(fd.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    const num = (k: string) => {
      const v = text(k);
      return v === undefined ? undefined : Number(v);
    };
    const tri = (k: string) => (sel[k] === "yes" ? true : sel[k] === "no" ? false : undefined);

    const feeStatus = sel.inspectionFeeStatus;
    const expires = text("expiresAt");

    const payload = {
      name: text("name"),
      kind: sel.kind,
      status: sel.status,
      roomType: sel.roomType,
      area: text("area"),
      landmark: text("landmark"),
      distanceKm: num("distanceKm"),
      priceAmount: num("priceAmount"),
      priceCurrency: "NGN",
      pricePeriod: sel.pricePeriod,
      // "water, generator" typed in one box becomes a list.
      amenities: (text("amenities") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      verified,
      verifiedChecks: checks,
      rating: num("rating"),
      reviewCount: num("reviewCount"),
      contactType: sel.contactType === "unset" ? undefined : sel.contactType,
      inspectionFeeStatus: feeStatus,
      // Only send an amount when the fee is confirmed.
      inspectionFeeAmount: feeStatus === "confirmed" ? num("inspectionFeeAmount") : undefined,
      acceptedPeriods: periods,
      requiresUpfrontYears: num("requiresUpfrontYears"),
      hasSecurityPost: tri("hasSecurityPost"),
      isGatedCompound: tri("isGatedCompound"),
      popularityScore: num("popularityScore"),
      constructionProgress: num("constructionProgress"),
      // The date box gives "2026-12-31"; the database wants a full date-time.
      expiresAt: expires ? new Date(expires).toISOString() : undefined,
      insight: text("insight"),
    };

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: `Not saved: ${body.error ?? res.status}` });
      } else {
        setMessage({ ok: true, text: "Saved." });
        // Clear the boxes AND the state-based controls.
        form.reset();
        setSel(DEFAULT_SELECTS);
        setVerified(false);
        setChecks([]);
        setPeriods([]);
        onSaved?.();
      }
    } catch {
      // Usually means the API (port 4000) or Docker is not running.
      setMessage({ ok: false, text: "Could not reach the API. Is it running?" });
    } finally {
      setSaving(false);
    }
  }

  // Stops number boxes changing value when you scroll over them.
  const num16 = "min-h-11 text-base md:min-h-9 md:text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>The place</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name *">
            <Input name="name" required className={num16} />
          </Field>
          <Field label="Room type *">
            <Pick value={sel.roomType} onChange={pick("roomType")} options={pairs(ROOM_TYPES)} />
          </Field>
          <Field label="Kind *">
            <Pick value={sel.kind} onChange={pick("kind")} options={pairs(KINDS)} />
          </Field>
          <Field label="Status *">
            <Pick value={sel.status} onChange={pick("status")} options={pairs(STATUSES)} />
          </Field>
          <Field label="Area *">
            <Input name="area" required className={num16} />
          </Field>
          <Field label="Landmark">
            <Input name="landmark" className={num16} />
          </Field>
          <Field label="Distance from university (km)">
            <Input name="distanceKm" type="number" step="0.1" min="0" inputMode="decimal" className={num16} />
          </Field>
          <Field label="Amenities" hint="Separate with commas, e.g. water, generator, wifi">
            <Input name="amenities" className={num16} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price and payment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Price (NGN) *">
            <Input name="priceAmount" type="number" min="0" required inputMode="numeric" className={num16} />
          </Field>
          <Field label="Price is per *">
            <Pick value={sel.pricePeriod} onChange={pick("pricePeriod")} options={pairs(PRICE_PERIODS)} />
          </Field>
          <Field label="Requires how many years upfront?" hint="Leave blank if not reported yet">
            <Input name="requiresUpfrontYears" type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
          <Field label="Accepted payment periods">
            <CheckGroup options={ACCEPTED_PERIODS} selected={periods} onChange={setPeriods} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who you deal with</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Contact type">
            <Pick
              value={sel.contactType}
              onChange={pick("contactType")}
              options={[["unset", "Not reported yet"], ...pairs(CONTACT_TYPES)]}
            />
          </Field>
          <Field label="Inspection fee">
            <Pick
              value={sel.inspectionFeeStatus}
              onChange={pick("inspectionFeeStatus")}
              options={[
                ["unknown", "Not reported yet"],
                ["none", "Confirmed: no fee"],
                ["confirmed", "Confirmed: there is a fee"],
              ]}
            />
          </Field>
          <Field label="Inspection fee amount (NGN)" hint="Only used when you pick 'there is a fee'">
            <Input name="inspectionFeeAmount" type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trust and safety</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium md:min-h-0">
            <Checkbox checked={verified} onCheckedChange={(on) => setVerified(on === true)} />
            Verified by me
          </label>
          <Field label="Checks I confirmed">
            <CheckGroup options={CHECKS} selected={checks} onChange={setChecks} />
          </Field>
          <Field label="Has a security post?">
            <Pick value={sel.hasSecurityPost} onChange={pick("hasSecurityPost")} options={TRI} />
          </Field>
          <Field label="Gated compound?">
            <Pick value={sel.isGatedCompound} onChange={pick("isGatedCompound")} options={TRI} />
          </Field>
          <Field label="Rating (0 to 5)">
            <Input name="rating" type="number" step="0.1" min="0" max="5" inputMode="decimal" className={num16} />
          </Field>
          <Field label="Number of reviews">
            <Input name="reviewCount" type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Popularity score" hint="Feeds the Trending feed. Leave blank if unsure.">
            <Input name="popularityScore" type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
          <Field label="Construction progress (0 to 100)" hint="Only for 'construction'">
            <Input name="constructionProgress" type="number" min="0" max="100" inputMode="numeric" className={num16} />
          </Field>
          <Field label="Expires on" hint="Only for 'expiring'">
            <Input name="expiresAt" type="date" className={num16} />
          </Field>
          <Field label="Why this place? (one short, factual line)">
            <Input name="insight" className={num16} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={saving} className="min-h-11 text-base md:text-sm">
          {saving ? "Saving..." : "Save listing"}
        </Button>
        {message ? (
          <p className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>{message.text}</p>
        ) : null}
      </div>
    </form>
  );
}