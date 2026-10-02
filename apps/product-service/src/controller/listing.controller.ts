// ============================================================================
// product-service: the listing handlers.
//
// Two functions only, matching Slice 1: create one listing, list all listings.
// They talk to the shared Prisma client from @repo/product-db.
//
// The DB columns are flat (see schema.prisma). We return the rows as-is here;
// the client reshapes flat -> nested when we swap the mock data. Keeping the
// backend dumb for now means fewer places to change if the shape moves.
// ============================================================================

import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";

// POST /listings
// Body is the flat listing payload from the admin form.
export async function createListing(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as Record<string, unknown> | undefined;

  // Smallest useful validation: the truly required columns must be present.
  // We are NOT trying to be clever — the admin form is the only caller today.
  const required = ["name", "kind", "status", "roomType", "area", "priceAmount", "pricePeriod"];
  const missing = required.filter((key) => body?.[key] === undefined);
  if (missing.length > 0) {
    return reply.code(400).send({ error: "Missing required fields", missing });
  }

  try {
    const created = await prisma.listing.create({
      data: body as never,
    });
    return reply.code(201).send(created);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Could not save listing" });
  }
}

// GET /listings
// Returns every listing, newest first. The client filters after this.
export async function listListings(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const rows = await prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
    });
    return reply.send(rows);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Could not list listings" });
  }
}