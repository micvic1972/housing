import assert from "node:assert/strict";
import test from "node:test";
import { getRetryMessage } from "../lib/message-retry.ts";

test("admin retries keep a key only for identical message content", () => {
  const first = getRetryMessage(null, "Original reply", () => "id-1");
  const retry = getRetryMessage(first, "Original reply", () => "unused");
  const edited = getRetryMessage(first, "Corrected reply", () => "id-2");

  assert.equal(retry.id, "id-1");
  assert.equal(edited.id, "id-2");
});
