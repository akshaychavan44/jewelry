import assert from "node:assert/strict";
import { test } from "node:test";
import { accountViewFor, canReviewJeweler } from "./account-view";

test("jewelers can select customer view without changing their stored role", () => {
  const account = { role: "SELLER" as const };
  assert.equal(accountViewFor(account.role), "seller");
  assert.equal(accountViewFor(account.role, "customer"), "customer");
  assert.equal(accountViewFor(account.role, "seller"), "seller");
  assert.equal(account.role, "SELLER");
});

test("a view preference cannot turn customers or guests into jewelers", () => {
  for (const role of ["BUYER", "ADMIN", undefined] as const) {
    for (const preference of [undefined, "seller", "customer", "invalid"]) assert.equal(accountViewFor(role, preference), "customer");
  }
  assert.equal(accountViewFor("SELLER", "invalid"), "seller");
});

test("jewelers may review other stores while self-reviews remain blocked", () => {
  assert.equal(canReviewJeweler("SELLER", "jeweler-a", "jeweler-b"), true);
  assert.equal(canReviewJeweler("BUYER", "buyer", "jeweler-b"), true);
  assert.equal(canReviewJeweler("SELLER", "jeweler-a", "jeweler-a"), false);
  assert.equal(canReviewJeweler("ADMIN", "admin", "jeweler-b"), false);
});
