import assert from "node:assert/strict";
import test from "node:test";
import {
  isAccountDataVisible,
  isCurrentAccountRequest,
} from "../lib/account-scope.ts";

test("admin inbox data is hidden at sign-out and across account switches", () => {
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: false, userId: null },
      "admin-a",
    ),
    false,
  );
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: true, userId: "admin-b" },
      "admin-a",
    ),
    false,
  );
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: true, userId: "admin-b" },
      "admin-b",
    ),
    true,
  );
});

test("late admin responses are discarded after the active account changes", async () => {
  let active = {
    isLoaded: true,
    isSignedIn: true,
    userId: "admin-a",
  };
  let resolveResponse;
  const staleResponse = new Promise((resolve) => {
    resolveResponse = resolve;
  }).then((response) =>
    isCurrentAccountRequest(active, "admin-a") ? response : null,
  );
  active = {
    isLoaded: true,
    isSignedIn: true,
    userId: "admin-b",
  };
  resolveResponse("admin-a private conversation");
  assert.equal(await staleResponse, null);
  assert.equal(isCurrentAccountRequest(active, "admin-a"), false);
});
