import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelDelegate, type SqlExecutor } from "./model-delegate";
import { SCHEMA_META } from "./schema-meta";

function reviewFixture() {
  const calls: { sql: string; params: unknown[] }[] = [];
  const tables: Record<string, Record<string, unknown>[]> = {
    Review: [{ id: "review-1", authorId: "buyer-1", productId: "product-1", photoUrls: ["/photo.jpg"] }],
    User: [{ id: "buyer-1", name: "Review Author", country: "IN" }],
  };
  const executor: SqlExecutor = {
    async query<R>(sql: string, params: unknown[] = []): Promise<R[]> {
      calls.push({ sql, params });
      const table = sql.match(/FROM "([^"]+)"/)?.[1];
      assert.ok(table && tables[table], `Unexpected fixture query: ${sql}`);
      return tables[table].map(row => ({ ...row })) as R[];
    },
  };
  const delegate = (name: string): ModelDelegate => new ModelDelegate(name, SCHEMA_META[name], executor, delegate);
  return { delegate, calls };
}

test("product review includes hydrate the real author relation", async () => {
  const { delegate, calls } = reviewFixture();
  const rows = await delegate("Review").findMany({ include: { author: { select: { name: true, country: true } } } });
  assert.deepEqual(rows[0].author, { id: "buyer-1", name: "Review Author", country: "IN" });
  assert.equal(calls[1].sql.includes('"id" IN'), true);
  assert.deepEqual(calls[1].params, ["buyer-1"]);
  assert.deepEqual(rows[0].photoUrls, ["/photo.jpg"]);
});

test("customer review includes query by authorId rather than a nonexistent userId", async () => {
  const { delegate, calls } = reviewFixture();
  const rows = await delegate("User").findMany({ include: { reviews: true } });
  assert.equal((rows[0].reviews as unknown[]).length, 1);
  assert.equal(calls[1].sql.includes('"authorId" IN'), true);
  assert.equal(calls[1].sql.includes('"userId"'), false);
});

test("facet and popularity groups expose requested field counts and order by them", async () => {
  let executed = "";
  const executor: SqlExecutor = { async query<R>(sql: string): Promise<R[]> {
    executed = sql;
    return [{ productId: "product-1", _count_productId: 7 }] as R[];
  } };
  const delegate = new ModelDelegate("AnalyticsEvent", SCHEMA_META.AnalyticsEvent, executor, () => { throw new Error("Unexpected relation"); });
  const rows = await delegate.groupBy({ by: ["productId"], _count: { productId: true }, orderBy: { _count: { productId: "desc" } } });
  assert.deepEqual(rows[0]._count, { productId: 7 });
  assert.match(executed, /COUNT\("productId"\)/);
  assert.match(executed, /ORDER BY "_count_productId" DESC/);
});

test("aggregate count selections retain _all and specific non-null field counts", async () => {
  const executor: SqlExecutor = { async query<R>(): Promise<R[]> { return [{ _count__all: 5, _count_authorId: 4 }] as R[]; } };
  const delegate = new ModelDelegate("Review", SCHEMA_META.Review, executor, () => { throw new Error("Unexpected relation"); });
  const result = await delegate.aggregate({ _count: { _all: true, authorId: true, title: false } });
  assert.deepEqual(result._count, { _all: 5, authorId: 4 });
});

test("independent verification relations start together rather than waiting for each other", async () => {
  const started: string[] = [];
  const complete: (() => void)[] = [];
  const executor: SqlExecutor = { async query<R>(sql: string): Promise<R[]> {
    const table = sql.match(/FROM "([^"]+)"/)?.[1];
    if (table === "SellerProfile") return [{ id: "store", userId: "owner" }] as R[];
    started.push(table!);
    return new Promise<R[]>(resolve => complete.push(() => resolve((table === "User"
      ? [{ id: "owner", name: "Owner" }]
      : [{ id: "location", sellerId: "store", city: "Mumbai" }]) as R[])));
  } };
  const delegate = (name: string): ModelDelegate => new ModelDelegate(name, SCHEMA_META[name], executor, delegate);
  const pending = delegate("SellerProfile").findMany({ include: { user: true, locations: true } });
  await new Promise<void>(resolve => setImmediate(resolve));
  const concurrent = started.length;
  complete.forEach(resolve => resolve());
  assert.equal(concurrent, 2);
  const rows = await pending;
  assert.equal((rows[0].user as { name: string }).name, "Owner");
  assert.equal((rows[0].locations as { city: string }[])[0].city, "Mumbai");
});

test("showcase relation counts honor active and nondeleted filters", async () => {
  let query = "";
  let parameters: unknown[] = [];
  const executor: SqlExecutor = { async query<R>(sql: string, params: unknown[] = []): Promise<R[]> {
    if (sql.includes('FROM "SellerProfile"')) return [{ id: "store" }] as R[];
    query = sql;
    parameters = params;
    return [{ sellerId: "store", _count__all: 3 }] as R[];
  } };
  const delegate = (name: string): ModelDelegate => new ModelDelegate(name, SCHEMA_META[name], executor, delegate);
  const rows = await delegate("SellerProfile").findMany({ select: { _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } } } });
  assert.deepEqual(rows[0]._count, { products: 3 });
  assert.match(query, /"deletedAt" IS NULL/);
  assert.match(query, /"status" = \$\d+/);
  assert.deepEqual(parameters, ["store", "ACTIVE"]);
});

test("bulk updates use one SQL statement and preserve counter operators", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const executor: SqlExecutor = { async query<R>(sql: string, params: unknown[] = []): Promise<R[]> {
    calls.push({ sql, params });
    return [{ id: "piece-1" }, { id: "piece-2" }] as R[];
  } };
  const delegate = new ModelDelegate("Product", SCHEMA_META.Product, executor, () => { throw new Error("Unexpected relation"); });

  const result = await delegate.updateMany({ where: { sellerId: "seller-1", status: "ACTIVE" }, data: { wishlistCount: { increment: 1 } } });

  assert.deepEqual(result, { count: 2 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /UPDATE "Product" SET "wishlistCount" = "wishlistCount" \+ \$1, "updatedAt" = \$2 WHERE/);
  assert.equal(calls[0].params[0], 1);
  assert.ok(calls[0].params[1] instanceof Date);
  assert.deepEqual(calls[0].params.slice(2), ["seller-1", "ACTIVE"]);
});


test("unsupported compound filters cannot execute an unscoped read or delete", async () => {
  let queries = 0;
  const executor: SqlExecutor = { async query<R>(): Promise<R[]> { queries++; return []; } };
  const delegate = new ModelDelegate("WishlistItem", SCHEMA_META.WishlistItem, executor, () => { throw new Error("Unexpected relation"); });
  const where = { userId_unknown: { userId: "buyer-1", unknown: "piece-1" } };
  await assert.rejects(delegate.findUnique({ where }), /Unsupported filter/);
  await assert.rejects(delegate.deleteMany({ where }), /Unsupported filter/);
  assert.equal(queries, 0);
});
