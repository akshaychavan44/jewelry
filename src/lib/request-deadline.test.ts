import assert from "node:assert/strict";
import { test } from "node:test";
import { withRequestDeadline } from "./request-deadline";

test("a stalled provider is aborted and rejected even if it ignores cancellation", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  const result = withRequestDeadline(s => { signal = s; return new Promise(() => {}); }, 90_000, "Upload timed out");
  const rejected = assert.rejects(result, /Upload timed out/);
  context.mock.timers.tick(90_000);
  await rejected;
  assert.equal(signal?.aborted, true);
});

test("success and provider errors settle without waiting for the deadline", async () => {
  assert.equal(await withRequestDeadline(async () => "saved", 1000, "timeout"), "saved");
  await assert.rejects(withRequestDeadline(async () => { throw new Error("Upload rejected"); }, 1000, "timeout"), /Upload rejected/);
});
