"use client";

import { useEffect, useState } from "react";
import ListingForm, { type ListingFormValues } from "./listings-form";

const API = "/api/admin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isListingFormValues(value: unknown): value is ListingFormValues {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.kind === "string" &&
    typeof value.status === "string" &&
    typeof value.roomType === "string" &&
    typeof value.area === "string" &&
    isNullableString(value.campus) &&
    isNullableString(value.landmark) &&
    isNullableNumber(value.distanceKm) &&
    typeof value.priceAmount === "number" &&
    typeof value.priceCurrency === "string" &&
    typeof value.pricePeriod === "string" &&
    isStringArray(value.amenities) &&
    typeof value.verified === "boolean" &&
    isStringArray(value.verifiedChecks) &&
    isNullableNumber(value.rating) &&
    isNullableNumber(value.reviewCount) &&
    isNullableString(value.contactType) &&
    typeof value.inspectionFeeStatus === "string" &&
    isNullableNumber(value.inspectionFeeAmount) &&
    isStringArray(value.acceptedPeriods) &&
    isNullableNumber(value.requiresUpfrontYears) &&
    (value.hasSecurityPost === null ||
      typeof value.hasSecurityPost === "boolean") &&
    (value.isGatedCompound === null ||
      typeof value.isGatedCompound === "boolean") &&
    isNullableNumber(value.popularityScore) &&
    isNullableNumber(value.constructionProgress) &&
    isNullableString(value.expiresAt) &&
    isNullableString(value.insight) &&
    Array.isArray(value.images) &&
    value.images.every(
      (image) =>
        isRecord(image) &&
        typeof image.id === "string" &&
        typeof image.url === "string" &&
        typeof image.alt === "string" &&
        typeof image.position === "number",
    )
  );
}

async function getError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    return `Request failed (${response.status})`;
  }
  return `Request failed (${response.status})`;
}

export default function EditListingForm({
  id,
  onSaved,
  onCancel,
}: {
  id: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [listing, setListing] = useState<ListingFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/listings/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await getError(response));
        }
        return (await response.json()) as unknown;
      })
      .then((body: unknown) => {
        if (!isRecord(body) || !isListingFormValues(body.data)) {
          throw new Error("The listing response is invalid.");
        }
        if (!controller.signal.aborted) {
          setListing(body.data);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load this listing.",
          );
        }
      });

    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <button
          className="self-start text-sm underline"
          onClick={onCancel}
          type="button"
        >
          Back to listings
        </button>
      </div>
    );
  }

  if (!listing) {
    return <p className="text-sm text-muted-foreground">Loading listing…</p>;
  }

  return (
    <ListingForm
      key={listing.id}
      initialListing={listing}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}
