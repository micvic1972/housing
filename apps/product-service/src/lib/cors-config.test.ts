import assert from "node:assert/strict";
import test from "node:test";
import { resolveCorsOrigins } from "./cors-config.js";

test("allows local and LAN development origins", () => {
  assert.equal(resolveCorsOrigins("development", undefined), true);
});

test("requires a production allowlist", () => {
  assert.throws(
    () => resolveCorsOrigins("production", undefined),
    /CORS_ALLOWED_ORIGINS must be configured/,
  );
});

test("parses and deduplicates exact production origins", () => {
  assert.deepEqual(
    resolveCorsOrigins(
      "production",
      "https://client.example.com,https://admin.example.com,https://client.example.com",
    ),
    ["https://client.example.com", "https://admin.example.com"],
  );
});

test("rejects malformed origins, paths, and empty entries", () => {
  for (const value of [
    "not-an-origin",
    "https://client.example.com/app",
    "https://client.example.com,",
  ]) {
    assert.throws(() => resolveCorsOrigins("production", value));
  }
});
