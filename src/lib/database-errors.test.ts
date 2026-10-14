import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseUnavailableError, isDatabaseUnavailable } from "./database-errors";

test("connection failures remain identifiable through driver and Auth.js wrappers", () => {
  for (const failure of [
    Object.assign(new Error("DNS unavailable"), { code: "ENOTFOUND" }),
    { name: "ErrorEvent" },
    new DOMException("Timed out", "TimeoutError"),
    new Error("Error connecting to database: TypeError: fetch failed"),
    new DatabaseUnavailableError(new Error("offline")),
  ]) {
    assert.equal(isDatabaseUnavailable({ cause: { err: failure } }), true);
  }
});

test("invalid credentials and SQL errors are not mistaken for connection outages", () => {
  for (const error of [new Error("Incorrect password"), { code: "23505", message: "Duplicate key" }, { code: "42P01", message: "Missing relation" }, null]) {
    assert.equal(isDatabaseUnavailable(error), false);
  }
  const recursive: { cause?: unknown } = {};
  recursive.cause = recursive;
  assert.equal(isDatabaseUnavailable(recursive), false);
});
