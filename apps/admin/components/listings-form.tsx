"use client";

// Admin form: where you enter one real listing.
// It sends a FLAT payload to the API (POST /listings).

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Where the API lives. Comes from apps/admin/.env.local.
const API = "/api/admin";
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ListingFormValues = {
  id: string;
  name: string;
  kind: string;
  status: string;
  roomType: string;
  area: string;
  campus: string | null;
  landmark: string | null;
  distanceKm: number | null;
  priceAmount: number;
  priceCurrency: string;
  pricePeriod: string;
  amenities: string[];
  verified: boolean;
  verifiedChecks: string[];
  rating: number | null;
  reviewCount: number | null;
  contactType: string | null;
  inspectionFeeStatus: string;
  inspectionFeeAmount: number | null;
  acceptedPeriods: string[];
  requiresUpfrontYears: number | null;
  hasSecurityPost: boolean | null;
  isGatedCompound: boolean | null;
  popularityScore: number | null;
  constructionProgress: number | null;
  expiresAt: string | null;
  insight: string | null;
  images: { id: string; url: string; alt: string; position: number }[];
};

async function responseError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return `Request failed (${response.status})`;
}

function createdListingId(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }
  return null;
}

const KINDS = ["available", "construction", "expiring", "rented"];
const STATUSES = ["active", "coming-soon", "expiring-soon", "rented", "unavailable"];
const ROOM_TYPES = ["single", "self-contained", "shared", "studio", "one-bedroom", "two-bedroom"];
const PRICE_PERIODS = ["year", "semester", "month"];
const CONTACT_TYPES = ["owner", "agent", "university-partner"];
const CHECKS = ["water", "power", "security", "in-person-visit"];
const ACCEPTED_PERIODS = ["year", "session", "semester", "month"];

// The three UNIDEL campuses: [value saved in the database, label you see].
const CAMPUS_OPTIONS: [string, string][] = [
  ["unset", "Not reported yet"],
  ["alihame", "Alihame (main campus)"],
  ["owa-oyibu", "Owa-Oyibu"],
  ["owa-alero", "Owa-Alero"],
];

// The starting value of every dropdown.
const DEFAULT_SELECTS: Record<string, string> = {
  kind: "available",
  status: "active",
  roomType: "single",
  pricePeriod: "year",
  campus: "unset",
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

export default function ListingForm({
  initialListing,
  onSaved,
  onCancel,
}: {
  initialListing?: ListingFormValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const editing = initialListing !== undefined;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sel, setSel] = useState<Record<string, string>>(() =>
    initialListing
      ? {
          ...DEFAULT_SELECTS,
          kind: initialListing.kind,
          status: initialListing.status,
          roomType: initialListing.roomType,
          pricePeriod: initialListing.pricePeriod,
          campus: initialListing.campus ?? "unset",
          contactType: initialListing.contactType ?? "unset",
          inspectionFeeStatus: initialListing.inspectionFeeStatus,
          hasSecurityPost:
            initialListing.hasSecurityPost === null
              ? "unset"
              : initialListing.hasSecurityPost
                ? "yes"
                : "no",
          isGatedCompound:
            initialListing.isGatedCompound === null
              ? "unset"
              : initialListing.isGatedCompound
                ? "yes"
                : "no",
        }
      : DEFAULT_SELECTS,
  );
  const [verified, setVerified] = useState(initialListing?.verified ?? false);
  const [checks, setChecks] = useState<string[]>(
    initialListing?.verifiedChecks ?? [],
  );
  const [periods, setPeriods] = useState<string[]>(
    initialListing?.acceptedPeriods ?? [],
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pendingUpload, setPendingUpload] = useState<{
    listingId: string;
    files: File[];
  } | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Short helper so each dropdown is one line below.
  const pick = (key: string) => (v: string) => setSel((s) => ({ ...s, [key]: v }));

  async function sendImages(
    listingId: string,
    files: File[],
  ): Promise<string | null> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file, file.name));
      const response = await fetch(
        `${API}/listings/${encodeURIComponent(listingId)}/images`,
        { method: "POST", body: formData },
      );
      return response.ok ? null : await responseError(response);
    } catch {
      return "Could not reach image storage. Check the service and try again.";
    }
  }

  function resetForm(form?: HTMLFormElement) {
    form?.reset();
    setSel(DEFAULT_SELECTS);
    setVerified(false);
    setChecks([]);
    setPeriods([]);
    setImageFiles([]);
    setPendingUpload(null);
  }

  async function retryImageUpload() {
    if (!pendingUpload || uploadingImages) return;

    setUploadingImages(true);
    const error = await sendImages(
      pendingUpload.listingId,
      pendingUpload.files,
    );
    setUploadingImages(false);

    if (error) {
      setMessage({
        ok: false,
        text: `The listing was saved, but the photos are still pending: ${error}`,
      });
      return;
    }

    setMessage({ ok: true, text: "Listing and photos saved." });
    resetForm(formRef.current ?? undefined);
    onSaved?.();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (pendingUpload) {
      setMessage({
        ok: false,
        text: "Finish the pending photo upload before saving another listing.",
      });
      return;
    }
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
    const optional = <T,>(value: T | undefined) =>
      editing ? value ?? null : value;

    const feeStatus = sel.inspectionFeeStatus;
    const expires = text("expiresAt");

    const payload = {
      name: text("name"),
      kind: sel.kind,
      status: sel.status,
      roomType: sel.roomType,
      area: text("area"),
      // "unset" = left out, so the database keeps "not reported yet".
      campus: optional(sel.campus === "unset" ? undefined : sel.campus),
      landmark: optional(text("landmark")),
      distanceKm: optional(num("distanceKm")),
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
      rating: optional(num("rating")),
      reviewCount: optional(num("reviewCount")),
      contactType: optional(
        sel.contactType === "unset" ? undefined : sel.contactType,
      ),
      inspectionFeeStatus: feeStatus,
      // Only send an amount when the fee is confirmed.
      inspectionFeeAmount:
        feeStatus === "confirmed"
          ? optional(num("inspectionFeeAmount"))
          : editing
            ? null
            : undefined,
      acceptedPeriods: periods,
      requiresUpfrontYears: optional(num("requiresUpfrontYears")),
      hasSecurityPost: optional(tri("hasSecurityPost")),
      isGatedCompound: optional(tri("isGatedCompound")),
      popularityScore: optional(num("popularityScore")),
      constructionProgress: optional(num("constructionProgress")),
      // The date box gives "2026-12-31"; the database wants a full date-time.
      expiresAt: optional(expires ? new Date(expires).toISOString() : undefined),
      insight: optional(text("insight")),
    };

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        editing
          ? `${API}/listings/${encodeURIComponent(initialListing.id)}`
          : `${API}/listings`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        setMessage({ ok: false, text: `Not saved: ${await responseError(res)}` });
        return;
      }

      if (editing) {
        setMessage({ ok: true, text: "Listing updated." });
        onSaved?.();
        onCancel?.();
        return;
      }

      const created: unknown = await res.json();
      const listingId = createdListingId(created);
      if (!listingId) {
        setMessage({
          ok: false,
          text: "The listing was saved, but its ID was missing, so the photos could not be uploaded.",
        });
        onSaved?.();
        return;
      }
      onSaved?.();

      if (imageFiles.length > 0) {
        setPendingUpload({ listingId, files: imageFiles });
        setUploadingImages(true);
        const uploadError = await sendImages(listingId, imageFiles);
        setUploadingImages(false);
        if (uploadError) {
          setMessage({
            ok: false,
            text: `Listing saved, but photos are pending: ${uploadError}`,
          });
          return;
        }
        setMessage({
          ok: true,
          text: `Listing and ${imageFiles.length} photo${imageFiles.length === 1 ? "" : "s"} saved.`,
        });
      } else {
        setMessage({ ok: true, text: "Saved." });
      }
      resetForm(form);
    } catch {
      setMessage({ ok: false, text: "Could not reach the API. Is it running?" });
    } finally {
      setSaving(false);
    }
  }

  // Input sizing: 16px text on phones so iOS does not zoom in.
  const num16 = "min-h-11 text-base md:min-h-9 md:text-sm";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>The place</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name *">
            <Input name="name" defaultValue={initialListing?.name ?? ""} required className={num16} />
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
            <Input name="area" defaultValue={initialListing?.area ?? ""} required className={num16} />
          </Field>
          <Field label="Campus it is near" hint="Leave as 'Not reported yet' if you are not sure">
            <Pick value={sel.campus} onChange={pick("campus")} options={CAMPUS_OPTIONS} />
          </Field>
          <Field label="Landmark">
            <Input name="landmark" defaultValue={initialListing?.landmark ?? ""} className={num16} />
          </Field>
          <Field label="Distance from university (km)">
            <Input name="distanceKm" defaultValue={initialListing?.distanceKm ?? ""} type="number" step="0.1" min="0" inputMode="decimal" className={num16} />
          </Field>
          <Field label="Amenities" hint="Separate with commas, e.g. water, generator, wifi">
            <Input name="amenities" defaultValue={initialListing?.amenities.join(", ") ?? ""} className={num16} />
          </Field>
          {editing ? (
            <div className="flex flex-col gap-2 text-sm">
              <Label>Property photos</Label>
              <p className="text-muted-foreground">
                {initialListing.images.length} existing photo
                {initialListing.images.length === 1 ? "" : "s"}. Existing
                photos are preserved; photo editing is not available here.
              </p>
            </div>
          ) : (
            <Field
              label="Property photos"
              hint="JPEG, PNG, or WebP. Up to 8 photos, 5 MB each."
            >
              <input
                accept="image/jpeg,image/png,image/webp"
                className="min-h-11 w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:font-medium"
                disabled={pendingUpload !== null || uploadingImages}
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.currentTarget.files ?? []);
                  const tooLarge = selected.some(
                    (file) => file.size > MAX_IMAGE_BYTES,
                  );
                  if (selected.length > MAX_IMAGES || tooLarge) {
                    setImageFiles([]);
                    event.currentTarget.value = "";
                    setMessage({
                      ok: false,
                      text: `Choose up to ${MAX_IMAGES} photos, each no larger than 5 MB.`,
                    });
                    return;
                  }
                  setImageFiles(selected);
                  setMessage(null);
                }}
                type="file"
              />
            </Field>
          )}
          {imageFiles.length > 0 ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">
                {imageFiles.length} photo{imageFiles.length === 1 ? "" : "s"} selected
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {imageFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>
                    {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pendingUpload ? (
            <div className="md:col-span-2">
              <button
                className="min-h-11 rounded-md border px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
                disabled={uploadingImages}
                onClick={retryImageUpload}
                type="button"
              >
                {uploadingImages ? "Uploading photos…" : "Retry photo upload"}
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price and payment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Price (NGN) *">
            <Input name="priceAmount" defaultValue={initialListing?.priceAmount ?? ""} type="number" min="0" required inputMode="numeric" className={num16} />
          </Field>
          <Field label="Price is per *">
            <Pick value={sel.pricePeriod} onChange={pick("pricePeriod")} options={pairs(PRICE_PERIODS)} />
          </Field>
          <Field label="Requires how many years upfront?" hint="Leave blank if not reported yet">
            <Input name="requiresUpfrontYears" defaultValue={initialListing?.requiresUpfrontYears ?? ""} type="number" min="0" inputMode="numeric" className={num16} />
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
            <Input name="inspectionFeeAmount" defaultValue={initialListing?.inspectionFeeAmount ?? ""} type="number" min="0" inputMode="numeric" className={num16} />
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
            <Input name="rating" defaultValue={initialListing?.rating ?? ""} type="number" step="0.1" min="0" max="5" inputMode="decimal" className={num16} />
          </Field>
          <Field label="Number of reviews">
            <Input name="reviewCount" defaultValue={initialListing?.reviewCount ?? ""} type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Popularity score" hint="Feeds the Trending feed. Leave blank if unsure.">
            <Input name="popularityScore" defaultValue={initialListing?.popularityScore ?? ""} type="number" min="0" inputMode="numeric" className={num16} />
          </Field>
          <Field label="Construction progress (0 to 100)" hint="Only for 'construction'">
            <Input name="constructionProgress" defaultValue={initialListing?.constructionProgress ?? ""} type="number" min="0" max="100" inputMode="numeric" className={num16} />
          </Field>
          <Field label="Expires on" hint="Only for 'expiring'">
            <Input name="expiresAt" defaultValue={initialListing?.expiresAt?.slice(0, 10) ?? ""} type="date" className={num16} />
          </Field>
          <Field label="Why this place? (one short, factual line)">
            <Input name="insight" defaultValue={initialListing?.insight ?? ""} className={num16} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={saving} className="min-h-11 text-base md:text-sm">
            {saving ? (editing ? "Updating..." : "Saving...") : editing ? "Update listing" : "Save listing"}
          </Button>
          {editing && onCancel ? (
            <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
        {message ? (
          <p className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>{message.text}</p>
        ) : null}
      </div>
    </form>
  );
}