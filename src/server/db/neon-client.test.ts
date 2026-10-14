import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { isDatabaseUnavailable } from "@/lib/database-errors";
import { createNeonDbClient } from "./neon-client";

const connection = "postgresql://fixture:fixture@ep-fixture.neon.tech/fixture";

test("ordinary database reads use HTTP and retain PostgreSQL date/bigint types", async () => {
  const previous = neonConfig.fetchFunction;
  const calls: { query: string; params: unknown[] }[] = [];
  neonConfig.fetchFunction = async (_url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
    calls.push(JSON.parse(String(options?.body)));
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json({ fields: [{ name: "id", dataTypeID: 25 }, { name: "createdAt", dataTypeID: 1184 }, { name: "basePriceMinor", dataTypeID: 20 }], rows: [["piece", "2026-10-14 00:00:00+00", "12345"]], rowCount: 1, command: "SELECT", rowAsArray: true });
  };
  try {
    const db = createNeonDbClient(connection);
    const piece = await db.product.findUnique({ where: { id: "piece" } });
    assert.equal(piece.id, "piece");
    assert.ok(piece.createdAt instanceof Date);
    assert.equal(piece.basePriceMinor, 12345n);
    assert.deepEqual(calls[0].params, ["piece"]);
    assert.match(calls[0].query, /FROM "Product"/);
  } finally { neonConfig.fetchFunction = previous; }
});

test("connection outages are normalized without retrying raw queries or writes", async () => {
  const previous = neonConfig.fetchFunction;
  let requests = 0;
  neonConfig.fetchFunction = async () => { requests++; throw new TypeError("fetch failed"); };
  try {
    await assert.rejects(createNeonDbClient(connection).$queryRaw("SELECT 1"), isDatabaseUnavailable);
    assert.equal(requests, 1);
    await assert.rejects(createNeonDbClient(connection).user.create({ data: { id: "fixture", name: "Fixture", email: "fixture@fixture.invalid" } }), isDatabaseUnavailable);
    assert.equal(requests, 2);
  } finally { neonConfig.fetchFunction = previous; }
});

test("an explicitly read-only lookup recovers once after a transient connection failure", async () => {
  const previous = neonConfig.fetchFunction;
  let requests = 0;
  let signal: AbortSignal | null | undefined;
  neonConfig.fetchFunction = async (_url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
    requests++;
    if (requests === 1) { signal = options?.signal; throw new TypeError("fetch failed"); }
    assert.equal(options?.signal, signal, "Retry must share the initial timeout");
    return Response.json({ fields: [{ name: "id", dataTypeID: 25 }], rows: [["fixture"]], rowCount: 1, command: "SELECT", rowAsArray: true });
  };
  try {
    const user = await createNeonDbClient(connection).user.findUnique({ where: { id: "fixture" } });
    assert.equal(user.id, "fixture");
    assert.equal(requests, 2);
  } finally { neonConfig.fetchFunction = previous; }
});

test("Next static-render control flow is not turned into a database outage", async () => {
  const previous = neonConfig.fetchFunction;
  const bailout = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
  neonConfig.fetchFunction = async () => { throw bailout; };
  try {
    await assert.rejects(createNeonDbClient(connection).$queryRaw("SELECT 1"), error => error === bailout);
  } finally { neonConfig.fetchFunction = previous; }
});

test("interactive transactions keep one client and roll back failures", async () => {
  const queries: string[] = [];
  let releases = 0;
  const client = { query: async (sql: string) => { queries.push(sql); return { rows: [] }; }, release: () => { releases++; } };
  const connect = mock.method(Pool.prototype, "connect", async () => client);
  const db = createNeonDbClient(connection);
  try {
    await db.$transaction(async (tx: { $queryRaw: (sql: string) => Promise<unknown> }) => { await tx.$queryRaw("SELECT 1"); });
    assert.deepEqual(queries, ["BEGIN", "SELECT 1", "COMMIT"]);
    queries.length = 0;
    await assert.rejects(db.$transaction(async () => { throw new Error("Fixture failure"); }), /Fixture failure/);
    assert.deepEqual(queries, ["BEGIN", "ROLLBACK"]);
    assert.equal(releases, 2);
  } finally { connect.mock.restore(); await db.$disconnect(); }
});
