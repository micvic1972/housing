// Listing handlers:
// - save one listing
// - discover/search/filter listings
// - delete one listing

import type { FastifyReply, FastifyRequest } from "fastify";

import { prisma } from "@repo/product-db";
import {
  deleteListingImageObjects,
  listingImageObjectKey,
} from "../../lib/supabase-storage.js";

// -----------------------------------------------------------------------------
// POST /listings validation
// -----------------------------------------------------------------------------

// Checks a listing body for values that make no real-world sense.
// Returns an empty list when everything looks fine.
function findProblems(body: Record<string, unknown>): string[] {
  const problems: string[] = [];

  if (typeof body.priceAmount === "number" && body.priceAmount <= 0) {
    problems.push("priceAmount must be greater than 0");
  }

  if (typeof body.rating === "number" && (body.rating < 0 || body.rating > 5)) {
    problems.push("rating must be between 0 and 5");
  }

  if (
    body.inspectionFeeStatus === "confirmed" &&
    (body.inspectionFeeAmount === undefined ||
      body.inspectionFeeAmount === null)
  ) {
    problems.push(
      "inspectionFeeAmount is required when inspectionFeeStatus is confirmed",
    );
  }

  return problems;
}

// -----------------------------------------------------------------------------
// POST /listings
// -----------------------------------------------------------------------------

export async function createListing(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as Record<string, unknown> | undefined;

  const required = [
    "name",
    "kind",
    "status",
    "roomType",
    "area",
    "priceAmount",
    "pricePeriod",
  ];

  const missing = required.filter((key) => body?.[key] === undefined);

  if (missing.length > 0) {
    return reply.code(400).send({
      error: "Missing required fields",
      missing,
    });
  }

  const problems = findProblems(body!);

  if (problems.length > 0) {
    return reply.code(400).send({
      error: "Invalid field values",
      problems,
    });
  }

  try {
    const created = await prisma.listing.create({
      data: body as never,
    });

    return reply.code(201).send(created);
  } catch (err) {
    request.log.error(err);

    return reply.code(500).send({
      error: "Could not save listing",
    });
  }
}

// -----------------------------------------------------------------------------
// Discovery helpers
// -----------------------------------------------------------------------------

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function numberParam(
  value: unknown,
  name: string,
  problems: string[],
): number | undefined {
  const raw = first(value);

  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    problems.push(`${name} must be a number`);
    return undefined;
  }

  return parsed;
}

function booleanParam(
  value: unknown,
  name: string,
  problems: string[],
): boolean | undefined {
  const raw = first(value);

  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  problems.push(`${name} must be true or false`);

  return undefined;
}

function listParam(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

// -----------------------------------------------------------------------------
// GET /listings
//
// This is the first Discovery engine.
//
// Examples:
//
// /listings?q=alihame
// /listings?campus=alihame
// /listings?roomType=self-contained&maxPrice=500000
// /listings?verified=true
// /listings?amenities=water,power
// /listings?collection=construction
// /listings?collection=expiring
// /listings?sort=price-asc
//
// Multiple filters can be combined.
// -----------------------------------------------------------------------------

export async function listListings(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = request.query as Record<string, unknown>;

  const problems: string[] = [];

  const search = first(query.q)?.trim();
  const campus = first(query.campus);
  const area = first(query.area);
  const landmark = first(query.landmark);

  const roomType = first(query.roomType);
  const kind = first(query.kind);
  const status = first(query.status);
  const contactType = first(query.contactType);

  const collection = first(query.collection);
  const sort = first(query.sort) ?? "relevance";
  const paginated = query.page !== undefined || query.pageSize !== undefined;
  const page = numberParam(query.page, "page", problems);
  const pageSize = numberParam(query.pageSize, "pageSize", problems);

  const minPrice = numberParam(query.minPrice, "minPrice", problems);
  const maxPrice = numberParam(query.maxPrice, "maxPrice", problems);
  const maxUpfrontYears = numberParam(
    query.maxUpfrontYears,
    "maxUpfrontYears",
    problems,
  );

  const distanceKm = numberParam(query.distanceKm, "distanceKm", problems);

  const verified = booleanParam(query.verified, "verified", problems);

  const hasSecurityPost = booleanParam(
    query.hasSecurityPost,
    "hasSecurityPost",
    problems,
  );

  const isGatedCompound = booleanParam(
    query.isGatedCompound,
    "isGatedCompound",
    problems,
  );
  const availableOnly = booleanParam(
    query.availableOnly,
    "availableOnly",
    problems,
  );

  const amenities = listParam(query.amenities);

  const inspectionFeeStatus = first(query.inspectionFeeStatus);

  if (minPrice !== undefined && minPrice < 0) {
    problems.push("minPrice cannot be negative");
  }

  if (maxPrice !== undefined && maxPrice < 0) {
    problems.push("maxPrice cannot be negative");
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    problems.push("minPrice cannot be greater than maxPrice");
  }

  if (distanceKm !== undefined && distanceKm < 0) {
    problems.push("distanceKm cannot be negative");
  }

  if (maxUpfrontYears !== undefined && maxUpfrontYears < 0) {
    problems.push("maxUpfrontYears cannot be negative");
  }

  if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
    problems.push("page must be a positive integer");
  }
  if (
    pageSize !== undefined &&
    (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50)
  ) {
    problems.push("pageSize must be an integer between 1 and 50");
  }

  const allowedCollections = [
    "all",
    "for-you",
    "new",
    "construction",
    "expiring",
    "available",
  ];

  if (collection !== undefined && !allowedCollections.includes(collection)) {
    problems.push(
      `collection must be one of: ${allowedCollections.join(", ")}`,
    );
  }

  const allowedSorts = [
    "relevance",
    "newest",
    "price-asc",
    "price-desc",
    "distance-asc",
  ];

  if (!allowedSorts.includes(sort)) {
    problems.push(`sort must be one of: ${allowedSorts.join(", ")}`);
  }

  if (problems.length > 0) {
    return reply.code(400).send({
      error: "Invalid discovery parameters",
      problems,
    });
  }

  // ---------------------------------------------------------------------------
  // Build the database WHERE clause.
  //
  // Every filter is optional.
  // If the student does not provide it, we do not restrict that field.
  // ---------------------------------------------------------------------------

  const where: Record<string, unknown> = {};
  const orClauses: Record<string, unknown>[] = [];

  // Search looks across the pieces of information a student naturally thinks
  // about when looking for accommodation.
  if (search) {
    orClauses.push({
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          area: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          campus: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          landmark: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          insight: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          roomType: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          amenities: {
            has: search,
          },
        },
      ],
    });
  }

  if (campus) {
    where.campus = campus;
  }

  if (area) {
    where.area = {
      contains: area,
      mode: "insensitive",
    };
  }

  if (landmark) {
    where.landmark = {
      contains: landmark,
      mode: "insensitive",
    };
  }

  if (roomType) {
    where.roomType = roomType;
  }

  if (kind) {
    where.kind = kind;
  }

  if (status) {
    where.status = status;
  }

  if (contactType) {
    where.contactType = contactType;
  }

  if (availableOnly) {
    orClauses.push({
      kind: { not: "rented" },
      status: { notIn: ["rented", "unavailable"] },
    });
  }

  if (collection === "available") {
    orClauses.push({
      kind: "available",
      status: { notIn: ["rented", "unavailable"] },
    });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {};

    if (minPrice !== undefined) {
      priceFilter.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      priceFilter.lte = maxPrice;
    }

    where.priceAmount = priceFilter;
  }

  if (maxUpfrontYears !== undefined) {
    where.requiresUpfrontYears = {
      lte: maxUpfrontYears,
    };
  }

  if (distanceKm !== undefined) {
    where.distanceKm = {
      lte: distanceKm,
    };
  }

  if (verified !== undefined) {
    where.verified = verified;
  }

  if (hasSecurityPost !== undefined) {
    where.hasSecurityPost = hasSecurityPost;
  }

  if (isGatedCompound !== undefined) {
    where.isGatedCompound = isGatedCompound;
  }

  if (inspectionFeeStatus) {
    where.inspectionFeeStatus = inspectionFeeStatus;
  }

  if (amenities.length > 0) {
    where.amenities = {
      hasEvery: amenities,
    };
  }

  // ---------------------------------------------------------------------------
  // Discovery collections
  // ---------------------------------------------------------------------------

  if (collection === "new") {
    // "New" means recently added to UniNest.
    const since = new Date();
    since.setDate(since.getDate() - 30);

    where.createdAt = {
      gte: since,
    };
  }

  if (collection === "construction") {
    // Construction listings can be identified by their kind or status.
    orClauses.push({
      OR: [{ kind: "construction" }, { status: "coming-soon" }],
    });
  }

  if (collection === "expiring") {
    // We only show listings that actually have an expiry date.
    // The window is the next 30 days.
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    where.expiresAt = {
      gte: now,
      lte: thirtyDaysFromNow,
    };
  }

  if (orClauses.length > 0) {
    where.AND = orClauses;
  }

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  let orderBy: unknown;

  if (sort === "newest") {
    orderBy = {
      createdAt: "desc",
    };
  } else if (sort === "price-asc") {
    orderBy = {
      priceAmount: "asc",
    };
  } else if (sort === "price-desc") {
    orderBy = {
      priceAmount: "desc",
    };
  } else if (sort === "distance-asc") {
    orderBy = [
      {
        distanceKm: {
          sort: "asc",
          nulls: "last",
        },
      },
      {
        createdAt: "desc",
      },
    ];
  } else {
    // Relevance v1.
    //
    // We are NOT pretending this is personalized AI.
    // We simply put stronger listings first using the data we already own.
    orderBy = [
      {
        verified: "desc",
      },
      {
        popularityScore: {
          sort: "desc",
          nulls: "last",
        },
      },
      {
        createdAt: "desc",
      },
    ];
  }

  const stableOrderBy = Array.isArray(orderBy)
    ? [...orderBy, { id: "asc" }]
    : [orderBy, { id: "asc" }];

  try {
    const listingQuery = {
      where: where as never,
      orderBy: stableOrderBy as never,
      include: {
        images: {
          orderBy: {
            position: "asc" as const,
          },
        },
      },
    };
    const rowsPromise = paginated
      ? prisma.listing.findMany({
          ...listingQuery,
          skip: ((page ?? 1) - 1) * (pageSize ?? 12),
          take: pageSize ?? 12,
        })
      : prisma.listing.findMany(listingQuery);
    const [rows, count] = await Promise.all([
      rowsPromise,
      prisma.listing.count({ where: where as never }),
    ]);

    return reply.send({
      data: rows,
      meta: {
        count,
        collection: collection ?? "all",
        sort,
        search: search ?? null,
        ...(paginated
          ? {
              page: page ?? 1,
              pageSize: pageSize ?? 12,
              hasMore: (page ?? 1) * (pageSize ?? 12) < count,
            }
          : {}),
      },
    });
  } catch (err) {
    request.log.error(err);

    return reply.code(500).send({
      error: "Could not discover listings",
    });
  }
}

// -----------------------------------------------------------------------------
// GET /listings/:id
// -----------------------------------------------------------------------------

export async function getListing(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id } = request.params;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!listing) {
      return reply.code(404).send({
        error: "Listing not found",
      });
    }

    return reply.send({ data: listing });
  } catch (err) {
    request.log.error(err);

    return reply.code(500).send({
      error: "Could not fetch listing",
    });
  }
}

// -----------------------------------------------------------------------------
// PATCH /listings/:id
// -----------------------------------------------------------------------------

export async function updateListing(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = request.body as Record<string, unknown>;
  const data = { ...body };

  if (typeof data.expiresAt === "string") {
    data.expiresAt = new Date(data.expiresAt);
  }

  try {
    const listing = await prisma.listing.update({
      where: { id: request.params.id },
      data: data as never,
      include: {
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    return reply.send({ data: listing });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2025"
    ) {
      return reply.code(404).send({ error: "Listing not found" });
    }

    request.log.error(err);
    return reply.code(500).send({ error: "Could not update listing" });
  }
}

// -----------------------------------------------------------------------------
// DELETE /listings/:id
// -----------------------------------------------------------------------------

export async function deleteListing(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as { id: string };

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { images: { select: { url: true } } },
    });
    if (!listing) {
      return reply.code(404).send({
        error: "Listing not found",
      });
    }

    const result = await prisma.listing.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      return reply.code(404).send({
        error: "Listing not found",
      });
    }

    const storageKeys = listing.images
      .map((image) => listingImageObjectKey(image.url))
      .filter((key): key is string => key !== undefined);
    try {
      await deleteListingImageObjects(storageKeys);
    } catch (cleanupError) {
      request.log.error(cleanupError);
    }

    return reply.code(204).send();
  } catch (err) {
    request.log.error(err);

    return reply.code(500).send({
      error: "Could not delete listing",
    });
  }
}
