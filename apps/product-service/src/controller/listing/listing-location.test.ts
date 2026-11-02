import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@repo/product-db";
import { createListing, updateListing } from "./listing.controller.js";

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

test("verified listing coordinates are attributed to the authenticated admin", async () => {
  const previousCreate = prisma.listing.create;
  const previousUpdate = prisma.listing.update;
  let createdData: Record<string, unknown> | undefined;
  let updatedData: Record<string, unknown> | undefined;

  Reflect.set(
    prisma.listing,
    "create",
    async ({ data }: { data: Record<string, unknown> }) => {
      createdData = data;
      return { id: "listing-created", ...data };
    },
  );
  Reflect.set(
    prisma.listing,
    "update",
    async ({ data }: { data: Record<string, unknown> }) => {
      updatedData = data;
      return { id: "listing-existing", ...data };
    },
  );

  const baseListing = {
    name: "Verified student lodge",
    kind: "available",
    status: "active",
    roomType: "single",
    area: "Alihame",
    priceAmount: 100000,
    pricePeriod: "year",
  };
  const request = (body: Record<string, unknown>) => ({
    body,
    params: { id: "listing-existing" },
    clerkUserId: "admin-user-1",
    log: { error() {} },
  });

  try {
    const createReplyValue = createReply();
    await createListing(
      request({
        ...baseListing,
        latitude: 6.25,
        longitude: 6.18,
        locationVerified: true,
      }) as never,
      createReplyValue as never,
    );
    assert.equal(createReplyValue.statusCode, 201);
    assert.equal(createdData?.locationVerifiedBy, "admin-user-1");
    assert.ok(createdData?.locationVerifiedAt instanceof Date);

    const updateReplyValue = createReply();
    await updateListing(
      request({
        latitude: 6.25,
        longitude: 6.18,
        locationVerified: true,
      }) as never,
      updateReplyValue as never,
    );
    assert.equal(updateReplyValue.statusCode, 200);
    assert.equal(updatedData?.locationVerifiedBy, "admin-user-1");
    assert.ok(updatedData?.locationVerifiedAt instanceof Date);

    const clearVerificationReply = createReply();
    await updateListing(
      request({
        latitude: null,
        longitude: null,
        locationVerified: false,
      }) as never,
      clearVerificationReply as never,
    );
    assert.equal(clearVerificationReply.statusCode, 200);
    assert.equal(updatedData?.latitude, null);
    assert.equal(updatedData?.longitude, null);
    assert.equal(updatedData?.locationVerifiedBy, null);
    assert.equal(updatedData?.locationVerifiedAt, null);
  } finally {
    Reflect.set(prisma.listing, "create", previousCreate);
    Reflect.set(prisma.listing, "update", previousUpdate);
  }
});
