import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { validateListing } from "./validate-listings.js";

async function validatePatch(payload: unknown) {
  const app = Fastify();
  app.patch("/listings/:id", { preHandler: validateListing }, async () => ({
    ok: true,
  }));

  try {
    return await app
      .inject({
        method: "PATCH",
        url: "/listings/listing-id",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(payload),
      })
      .then((response) => response);
  } finally {
    await app.close();
  }
}

test("accepts valid partial updates and explicit nulls for nullable fields", async () => {
  const response = await validatePatch({
    name: "Updated student lodge",
    campus: null,
    inspectionFeeAmount: null,
  });

  assert.equal(response.statusCode, 200);
});

test("rejects an empty update", async () => {
  const response = await validatePatch({});

  assert.equal(response.statusCode, 400);
});

test("rejects null for required fields and invalid values", async () => {
  const nullRequired = await validatePatch({ name: null });
  const invalidPrice = await validatePatch({ priceAmount: 0 });

  assert.equal(nullRequired.statusCode, 400);
  assert.equal(invalidPrice.statusCode, 400);
});

test("rejects unknown fields and invalid enumerated values", async () => {
  const unknown = await validatePatch({ id: "replacement-id" });
  const invalidStatus = await validatePatch({ status: "made-up" });

  assert.equal(unknown.statusCode, 400);
  assert.equal(invalidStatus.statusCode, 400);
});

test("accepts only paired, verified and in-range coordinates", async () => {
  const valid = await validatePatch({
    latitude: 6.25,
    longitude: 6.18,
    locationVerified: true,
  });
  const missingLongitude = await validatePatch({
    latitude: 6.25,
    locationVerified: true,
  });
  const unverified = await validatePatch({
    latitude: 6.25,
    longitude: 6.18,
    locationVerified: false,
  });
  const outOfRange = await validatePatch({
    latitude: 91,
    longitude: 6.18,
    locationVerified: true,
  });

  assert.equal(valid.statusCode, 200);
  assert.equal(missingLongitude.statusCode, 400);
  assert.equal(unverified.statusCode, 400);
  assert.equal(outOfRange.statusCode, 400);
});
