import assert from "node:assert/strict";
import test from "node:test";
import {
  getApiErrorMessage,
  getApiResponseError,
  readApiServerMessage,
} from "../app/lib/api-errors.ts";

test("network and CORS fetch failures do not imply a signed-out session", () => {
  const message = getApiErrorMessage(
    new TypeError("Failed to fetch"),
    "Failed",
  );
  assert.match(message, /could not connect/i);
  assert.match(message, /sign-in has not changed/i);
  assert.doesNotMatch(message, /sign in required/i);
});

test("401 responses are reported as session rejection, not a generic network failure", () => {
  const message = getApiResponseError(
    401,
    "Sign-in required",
    "Request failed",
  );
  assert.match(message, /did not accept your session/i);
  assert.doesNotMatch(message, /could not connect/i);
});

test("403 and server errors are distinct from authentication and connectivity failures", () => {
  assert.match(
    getApiResponseError(403, "Administrator access required", "Request failed"),
    /do not have permission/i,
  );
  assert.match(
    getApiResponseError(503, "Not configured", "Request failed"),
    /temporarily unavailable/i,
  );
});

test("server error parsing accepts only a string error field", () => {
  assert.equal(
    readApiServerMessage({ error: "Not available" }),
    "Not available",
  );
  assert.equal(readApiServerMessage({ error: 401 }), null);
  assert.equal(readApiServerMessage(null), null);
});
