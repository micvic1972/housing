// Middleware: checks a listing BEFORE the controller saves it.
// If anything is wrong it answers 400 with a clear message and stops.

import type { FastifyReply, FastifyRequest } from "fastify";

const KINDS = ["available", "construction", "expiring", "rented"];
const STATUSES = ["active", "coming-soon", "expiring-soon", "rented", "unavailable"];
const ROOM_TYPES = ["single", "self-contained", "shared", "studio", "one-bedroom", "two-bedroom"];
const PRICE_PERIODS = ["year", "semester", "month"];
const CONTACT_TYPES = ["owner", "agent", "university-partner"];
const CHECKS = ["water", "power", "security", "in-person-visit"];
const ACCEPTED_PERIODS = ["year", "session", "semester", "month"];
const FEE_STATUSES = ["unknown", "none", "confirmed"];
// The three UNIDEL campuses a listing can be near.
const CAMPUSES = ["alihame", "owa-oyibu", "owa-alero"];

// The only fields a listing may contain. Anything else is refused.
const ALLOWED_KEYS = new Set([
  "name", "kind", "status", "roomType", "area", "campus", "landmark", "distanceKm",
  "priceAmount", "priceCurrency", "pricePeriod", "amenities", "verified",
  "verifiedChecks", "rating", "reviewCount", "contactType",
  "inspectionFeeStatus", "inspectionFeeAmount", "acceptedPeriods",
  "requiresUpfrontYears", "hasSecurityPost", "isGatedCompound",
  "popularityScore", "constructionProgress", "expiresAt", "insight",
]);

export async function validateListing(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reply.code(400).send({ error: "Send the listing as a JSON object" });
  }

  const b = body as Record<string, unknown>;
  const problems: string[] = [];
  const has = (key: string) => b[key] !== undefined && b[key] !== null;

  // Unknown fields are refused so nobody can sneak in an id or a date.
  const unknown = Object.keys(b).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknown.length > 0) problems.push(`Unknown fields: ${unknown.join(", ")}`);

  // Text that must not be blank.
  for (const key of ["name", "area"]) {
    if (has(key) && (typeof b[key] !== "string" || (b[key] as string).trim() === "")) {
      problems.push(`${key} cannot be empty`);
    }
  }

  // A value that must be one of a fixed list.
  const oneOf = (key: string, list: string[]) => {
    if (has(key) && !list.includes(b[key] as string)) {
      problems.push(`${key} must be one of: ${list.join(", ")}`);
    }
  };
  oneOf("kind", KINDS);
  oneOf("status", STATUSES);
  oneOf("roomType", ROOM_TYPES);
  oneOf("pricePeriod", PRICE_PERIODS);
  oneOf("contactType", CONTACT_TYPES);
  oneOf("inspectionFeeStatus", FEE_STATUSES);
  oneOf("campus", CAMPUSES);

  // A list whose every item must be from a fixed list.
  const listOf = (key: string, list: string[]) => {
    if (!has(key)) return;
    const v = b[key];
    if (!Array.isArray(v) || v.some((item) => !list.includes(item))) {
      problems.push(`${key} must only contain: ${list.join(", ")}`);
    }
  };
  listOf("verifiedChecks", CHECKS);
  listOf("acceptedPeriods", ACCEPTED_PERIODS);

  if (has("amenities") && (!Array.isArray(b.amenities) || b.amenities.some((a) => typeof a !== "string"))) {
    problems.push("amenities must be a list of words");
  }

  // A number within a sensible range.
  const num = (key: string, min: number, max: number, integer = false) => {
    if (!has(key)) return;
    const v = b[key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      problems.push(`${key} must be a number`);
      return;
    }
    if (integer && !Number.isInteger(v)) problems.push(`${key} must be a whole number`);
    if (v < min || v > max) problems.push(`${key} must be between ${min} and ${max}`);
  };
  num("priceAmount", 1, 100_000_000, true);
  num("distanceKm", 0, 50);
  num("rating", 0, 5);
  num("reviewCount", 0, 100_000, true);
  num("inspectionFeeAmount", 1, 10_000_000, true);
  num("requiresUpfrontYears", 0, 10, true);
  num("popularityScore", 0, 1_000_000, true);
  num("constructionProgress", 0, 100, true);

  // Yes / no fields.
  for (const key of ["verified", "hasSecurityPost", "isGatedCompound"]) {
    if (has(key) && typeof b[key] !== "boolean") problems.push(`${key} must be true or false`);
  }

  // Honest-gap rule: a fee amount only makes sense when the fee is confirmed.
  if (b.inspectionFeeStatus === "confirmed" && !has("inspectionFeeAmount")) {
    problems.push("A confirmed inspection fee needs an amount");
  }
  if (has("inspectionFeeAmount") && b.inspectionFeeStatus !== "confirmed") {
    problems.push("An inspection fee amount is only allowed when the fee is confirmed");
  }

  if (has("expiresAt") && Number.isNaN(Date.parse(String(b.expiresAt)))) {
    problems.push("expiresAt is not a valid date");
  }

  if (problems.length > 0) {
    // The admin form shows this text under the Save button.
    return reply.code(400).send({ error: problems.join(". ") });
  }
}