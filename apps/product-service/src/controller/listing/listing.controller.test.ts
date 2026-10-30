import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { prisma } from "@repo/product-db";
import { listingRoutes } from "../../routes/listing.routes/listing.route.js";

test("discovery combines database filters, sorting, and bounded pagination", async () => {
  const previousFindMany = prisma.listing.findMany;
  const previousCount = prisma.listing.count;
  let findManyArgs: Record<string, unknown> | undefined;
  let countArgs: Record<string, unknown> | undefined;
  Reflect.set(prisma.listing, "findMany", async (args: unknown) => {
    findManyArgs = args as Record<string, unknown>;
    return [];
  });
  Reflect.set(prisma.listing, "count", async (args: unknown) => {
    countArgs = args as Record<string, unknown>;
    return 25;
  });

  const app = Fastify({ logger: false });
  try {
    await app.register(listingRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/listings?q=student&campus=alihame&area=Agbor&roomType=single&minPrice=100000&maxPrice=220000&maxUpfrontYears=1&contactType=owner&inspectionFeeStatus=none&isGatedCompound=true&availableOnly=true&amenities=water,power&sort=price-asc&page=2&pageSize=2",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().meta, {
      count: 25,
      collection: "all",
      sort: "price-asc",
      search: "student",
      page: 2,
      pageSize: 2,
      hasMore: true,
    });
    assert.equal(findManyArgs?.skip, 2);
    assert.equal(findManyArgs?.take, 2);
    assert.deepEqual(countArgs?.where, findManyArgs?.where);

    const where = findManyArgs?.where as Record<string, unknown>;
    assert.equal(where.campus, "alihame");
    assert.deepEqual(where.roomType, "single");
    assert.deepEqual(where.priceAmount, { gte: 100000, lte: 220000 });
    assert.deepEqual(where.requiresUpfrontYears, { lte: 1 });
    assert.equal(where.contactType, "owner");
    assert.deepEqual(where.inspectionFeeStatus, "none");
    assert.deepEqual(where.isGatedCompound, true);
    assert.deepEqual(where.amenities, { hasEvery: ["water", "power"] });

    const and = where.AND as Array<Record<string, unknown>>;
    assert(
      and.some(
        (clause) =>
          typeof clause.kind === "object" &&
          (clause.kind as { not?: string }).not === "rented",
      ),
    );
    assert(and.some((clause) => Array.isArray(clause.OR)));

    const orderBy = findManyArgs?.orderBy as Array<Record<string, unknown>>;
    assert.deepEqual(orderBy[0], { priceAmount: "asc" });
    assert.deepEqual(orderBy[1], { id: "asc" });
  } finally {
    await app.close();
    Reflect.set(prisma.listing, "findMany", previousFindMany);
    Reflect.set(prisma.listing, "count", previousCount);
  }
});

test("discovery applies the upfront payment filter without price limits", async () => {
  const previousFindMany = prisma.listing.findMany;
  const previousCount = prisma.listing.count;
  let findManyArgs: Record<string, unknown> | undefined;
  Reflect.set(prisma.listing, "findMany", async (args: unknown) => {
    findManyArgs = args as Record<string, unknown>;
    return [];
  });
  Reflect.set(prisma.listing, "count", async () => 0);

  const app = Fastify({ logger: false });
  try {
    await app.register(listingRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/listings?maxUpfrontYears=1",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      (findManyArgs?.where as Record<string, unknown>).requiresUpfrontYears,
      { lte: 1 },
    );
  } finally {
    await app.close();
    Reflect.set(prisma.listing, "findMany", previousFindMany);
    Reflect.set(prisma.listing, "count", previousCount);
  }
});

test("discovery rejects invalid pagination instead of querying the database", async () => {
  const previousFindMany = prisma.listing.findMany;
  const previousCount = prisma.listing.count;
  let databaseCalled = false;
  Reflect.set(prisma.listing, "findMany", async () => {
    databaseCalled = true;
    return [];
  });
  Reflect.set(prisma.listing, "count", async () => {
    databaseCalled = true;
    return 0;
  });

  const app = Fastify({ logger: false });
  try {
    await app.register(listingRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/listings?page=0&pageSize=51",
    });
    assert.equal(response.statusCode, 400);
    assert.equal(databaseCalled, false);
  } finally {
    await app.close();
    Reflect.set(prisma.listing, "findMany", previousFindMany);
    Reflect.set(prisma.listing, "count", previousCount);
  }
});
