import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@repo/product-db";
import {
  listSavedListings,
  saveListing,
  unsaveListing,
} from "./saved-listings.controller.js";

function createReply() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return payload;
    },
  };
}

function payloadObject(reply: ReturnType<typeof createReply>) {
  assert.ok(typeof reply.payload === "object" && reply.payload !== null);
  return reply.payload as Record<string, unknown>;
}

function listingIds(reply: ReturnType<typeof createReply>) {
  const data = payloadObject(reply).data;
  assert.ok(Array.isArray(data));
  return data.map((entry: unknown) => {
    assert.ok(
      typeof entry === "object" && entry !== null && "listingId" in entry,
    );
    assert.equal(typeof entry.listingId, "string");
    return entry.listingId;
  });
}

test("saved listings are separated per student and duplicate saves are safe", async () => {
  const previousFindUnique = prisma.listing.findUnique;
  const previousFindMany = prisma.savedListing.findMany;
  const previousUpsert = prisma.savedListing.upsert;
  const previousDeleteMany = prisma.savedListing.deleteMany;

  Reflect.set(prisma.listing, "findUnique", async ({ where }) => {
    if (where.id === "listing-1" || where.id === "listing-2") {
      return { id: where.id };
    }
    return null;
  });

  const savedByStudent: Record<
    string,
    Array<{ id: string; listingId: string }>
  > = {
    "student-a": [{ id: "saved-a", listingId: "listing-1" }],
    "student-b": [{ id: "saved-b", listingId: "listing-2" }],
  };

  Reflect.set(
    prisma.savedListing,
    "findMany",
    async ({ where }: { where: { studentId: string } }) => {
      const records = savedByStudent[where.studentId] ?? [];
      return records.map((entry) => ({
        ...entry,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      }));
    },
  );

  Reflect.set(
    prisma.savedListing,
    "upsert",
    async ({
      where,
    }: {
      where: {
        studentId_listingId: { studentId: string; listingId: string };
      };
    }) => {
      const key = where.studentId_listingId;
      const record = {
        id: `saved-${key.studentId}-${key.listingId}`,
        listingId: key.listingId,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      };
      savedByStudent[key.studentId] = [
        ...(savedByStudent[key.studentId] ?? []).filter(
          (entry) => entry.listingId !== key.listingId,
        ),
        { id: record.id, listingId: record.listingId },
      ];
      return {
        ...record,
        studentId: key.studentId,
      };
    },
  );

  Reflect.set(
    prisma.savedListing,
    "deleteMany",
    async ({ where }: { where: { studentId: string; listingId: string } }) => {
      const current = savedByStudent[where.studentId] ?? [];
      const remaining = current.filter(
        (entry) => entry.listingId !== where.listingId,
      );
      savedByStudent[where.studentId] = remaining;
      return { count: current.length - remaining.length };
    },
  );

  try {
    const studentAReply = createReply();
    await saveListing(
      { clerkUserId: "student-a", params: { listingId: "listing-1" } } as never,
      studentAReply as never,
    );
    assert.equal(studentAReply.statusCode, 200);
    assert.equal(payloadObject(studentAReply).saved, true);

    const duplicateSaveReply = createReply();
    await saveListing(
      { clerkUserId: "student-a", params: { listingId: "listing-1" } } as never,
      duplicateSaveReply as never,
    );
    assert.equal(duplicateSaveReply.statusCode, 200);
    assert.equal(savedByStudent["student-a"]?.length, 1);

    const studentBReply = createReply();
    await saveListing(
      { clerkUserId: "student-b", params: { listingId: "listing-1" } } as never,
      studentBReply as never,
    );
    assert.equal(studentBReply.statusCode, 200);
    assert.equal(payloadObject(studentBReply).saved, true);

    const aListReply = createReply();
    await listSavedListings(
      { clerkUserId: "student-a" } as never,
      aListReply as never,
    );
    assert.deepEqual(listingIds(aListReply).sort(), ["listing-1"]);

    const bListReply = createReply();
    await listSavedListings(
      { clerkUserId: "student-b" } as never,
      bListReply as never,
    );
    assert.deepEqual(listingIds(bListReply).sort(), ["listing-1", "listing-2"]);

    const deleteReply = createReply();
    await unsaveListing(
      { clerkUserId: "student-a", params: { listingId: "listing-1" } } as never,
      deleteReply as never,
    );
    assert.equal(deleteReply.statusCode, 200);
    assert.equal(payloadObject(deleteReply).saved, false);

    const studentBStillSaved = createReply();
    await listSavedListings(
      { clerkUserId: "student-b" } as never,
      studentBStillSaved as never,
    );
    assert.deepEqual(listingIds(studentBStillSaved).sort(), [
      "listing-1",
      "listing-2",
    ]);
  } finally {
    Reflect.set(prisma.listing, "findUnique", previousFindUnique);
    Reflect.set(prisma.savedListing, "findMany", previousFindMany);
    Reflect.set(prisma.savedListing, "upsert", previousUpsert);
    Reflect.set(prisma.savedListing, "deleteMany", previousDeleteMany);
  }
});
