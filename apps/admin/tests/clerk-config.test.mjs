import assert from "node:assert/strict";
import test from "node:test";
import { isClerkKeyPairAllowed } from "../lib/clerk-config.ts";

test("production accepts only a matching live Clerk key pair", () => {
  assert.equal(
    isClerkKeyPairAllowed("pk_live_public", "sk_live_secret", "production"),
    true,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_test_public", "sk_test_secret", "production"),
    false,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_live_public", "sk_test_secret", "production"),
    false,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_test_public", "sk_live_secret", "production"),
    false,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_live_", "sk_live_", "production"),
    false,
  );
  assert.equal(
    isClerkKeyPairAllowed(undefined, undefined, "production"),
    false,
  );
});

test("development accepts a matching test pair but rejects mixed or malformed keys", () => {
  assert.equal(
    isClerkKeyPairAllowed("pk_test_public", "sk_test_secret", "development"),
    true,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_live_public", "sk_live_secret", "development"),
    true,
  );
  assert.equal(
    isClerkKeyPairAllowed("pk_test_public", "sk_live_secret", "development"),
    false,
  );
  assert.equal(
    isClerkKeyPairAllowed("placeholder", "sk_test_secret", "development"),
    false,
  );
});
