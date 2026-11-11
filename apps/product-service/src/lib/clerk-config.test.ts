import assert from "node:assert/strict";
import test from "node:test";
import { getClerkVerificationKeys } from "./clerk-config.js";

test("production Clerk verification requires a live secret key", () => {
  assert.deepEqual(
    getClerkVerificationKeys("production", "sk_live_configured", "test-jwt"),
    { secretKey: "sk_live_configured" },
  );
  assert.equal(
    getClerkVerificationKeys("production", "sk_test_configured", "test-jwt"),
    null,
  );
  assert.equal(
    getClerkVerificationKeys("production", undefined, "live-jwt"),
    null,
  );
  assert.equal(getClerkVerificationKeys("production", "sk_live_"), null);
});

test("development may use the test secret or configured JWT public key path", () => {
  assert.deepEqual(
    getClerkVerificationKeys("development", "sk_test_configured"),
    { secretKey: "sk_test_configured" },
  );
  assert.deepEqual(getClerkVerificationKeys("development", undefined, "jwt"), {
    jwtKey: "jwt",
  });
});
