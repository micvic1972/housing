import assert from "node:assert/strict";
import test from "node:test";
import { getRetryMessage } from "../app/lib/message-retry.ts";

test("an identical retry reuses its idempotency key", () => {
  const first = getRetryMessage(null, "Is the room available?", () => "id-1");
  const retry = getRetryMessage(
    first,
    "Is the room available?",
    () => "unused",
  );

  assert.equal(retry.id, "id-1");
  assert.equal(retry.text, first.text);
});

test("edited content gets a fresh idempotency key", () => {
  const first = getRetryMessage(null, "Original message", () => "id-1");
  const edited = getRetryMessage(first, "Corrected message", () => "id-2");

  assert.equal(edited.id, "id-2");
  assert.equal(edited.text, "Corrected message");
});
