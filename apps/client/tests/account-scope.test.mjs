import assert from "node:assert/strict";
import test from "node:test";
import {
  isAccountDataVisible,
  isCurrentAccountRequest,
} from "../app/lib/account-scope.ts";

test("account data is hidden on sign-out and while a new account is loading", () => {
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: false, userId: null },
      "student-a",
    ),
    false,
  );
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: true, userId: "student-b" },
      "student-a",
    ),
    false,
  );
  assert.equal(
    isAccountDataVisible(
      { isLoaded: true, isSignedIn: true, userId: "student-b" },
      "student-b",
    ),
    true,
  );
});

test("delayed responses from a previous or signed-out account are rejected", async () => {
  let activeAccount = {
    isLoaded: true,
    isSignedIn: true,
    userId: "student-a",
  };
  let resolveResponse;
  const delayedResponse = new Promise((resolve) => {
    resolveResponse = resolve;
  }).then((response) =>
    isCurrentAccountRequest(activeAccount, "student-a") ? response : null,
  );
  activeAccount = {
    isLoaded: true,
    isSignedIn: true,
    userId: "student-b",
  };
  resolveResponse("student-a private inbox");
  assert.equal(await delayedResponse, null);
  assert.equal(isCurrentAccountRequest(activeAccount, "student-a"), false);
  assert.equal(isCurrentAccountRequest(activeAccount, "student-b"), true);
  assert.equal(
    isCurrentAccountRequest(
      { isLoaded: true, isSignedIn: false, userId: null },
      "student-a",
    ),
    false,
  );
});
