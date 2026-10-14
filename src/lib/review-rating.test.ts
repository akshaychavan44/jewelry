import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeRatings } from "./review-rating";

test("review summary counts published reviews and weights their star totals", () => {
  assert.deepEqual(summarizeRatings([{ stars: 5, count: 2 }, { stars: 4, count: 1 }, { stars: 1, count: 1 }]), { count: 4, average: 3.75 });
});

test("an empty review summary never produces NaN or a phantom review", () => {
  assert.deepEqual(summarizeRatings([{ stars: 5, count: 0 }, { stars: 4, count: 0 }]), { count: 0, average: 0 });
});
