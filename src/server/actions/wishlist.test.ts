import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { ModelDelegate, type SqlExecutor } from "../db/model-delegate";
import { SCHEMA_META } from "../db/schema-meta";

type Row = Record<string, unknown>;
let currentUser: { id: string } | null;
let tables: Record<string, Row[]>;
const calls: string[] = [];
const revalidated: string[] = [];

// Execute the real actions, delegates and SQL builder against disposable rows.
// This fixture understands the equality/insert/counter SQL used by favorites.
const executor: SqlExecutor = {
  async query<R>(sql: string, params: unknown[] = []): Promise<R[]> {
    calls.push(sql);
    const table = sql.match(/(?:FROM|INTO|UPDATE) "([^"\s]+)"/)?.[1];
    assert.ok(table && tables[table], `Unexpected table in ${sql}`);
    const rows = tables[table];
    const where = sql.split(" WHERE ")[1]?.split(/ RETURNING| LIMIT/)[0] ?? "";
    const predicates = [...where.matchAll(/"(\w+)" = \$(\d+)/g)];
    const matches = (row: Row) => predicates.every(([, field, index]) => row[field] === params[Number(index) - 1]);
    if (sql.startsWith("SELECT")) {
      const result = rows.filter(matches);
      return (sql.includes(" LIMIT 1") ? result.slice(0, 1) : result).map(row => ({ ...row })) as R[];
    }
    if (sql.startsWith("INSERT")) {
      const columns = sql.match(/\(([^)]+)\) VALUES/)![1].split(", ").map(column => column.replaceAll('"', ""));
      const row = Object.fromEntries(columns.map((field, index) => [field, params[index]]));
      rows.push(row);
      return [{ ...row }] as R[];
    }
    if (sql.startsWith("DELETE")) {
      const removed = rows.filter(matches);
      tables[table] = rows.filter(row => !matches(row));
      return removed as R[];
    }
    if (sql.startsWith("UPDATE")) {
      const counter = sql.match(/"wishlistCount" = "wishlistCount" ([+-]) \$(\d+)/);
      assert.ok(counter, `Unexpected update: ${sql}`);
      const changed = rows.filter(matches);
      for (const row of changed) row.wishlistCount = Number(row.wishlistCount) + (counter[1] === "+" ? 1 : -1) * Number(params[Number(counter[2]) - 1]);
      return changed.map(row => ({ ...row })) as R[];
    }
    throw new Error(`Unsupported fixture SQL: ${sql}`);
  },
};
const delegate = (name: string): ModelDelegate => new ModelDelegate(name, SCHEMA_META[name], executor, delegate);
interface FixtureDb {
  wishlistItem: ModelDelegate<"WishlistItem">;
  favoriteStore: ModelDelegate<"FavoriteStore">;
  product: ModelDelegate<"Product">;
  $transaction<T>(callback: (tx: FixtureDb) => Promise<T>): Promise<T>;
}
const fixtureDb: FixtureDb = {
  wishlistItem: delegate("WishlistItem"), favoriteStore: delegate("FavoriteStore"), product: delegate("Product"),
  async $transaction<T>(callback: (tx: FixtureDb) => Promise<T>): Promise<T> { return callback(fixtureDb); },
};
mock.module("@/server/db", { namedExports: { db: fixtureDb } });
mock.module("@/server/auth/session", { namedExports: { getCurrentUser: async () => currentUser } });
mock.module("next/cache", { namedExports: { revalidatePath: (path: string) => { revalidated.push(path); } } });
const { toggleWishlist, toggleFavoriteStore } = await import("./wishlist");

beforeEach(() => {
  currentUser = { id: "buyer-A" };
  calls.length = 0;
  revalidated.length = 0;
  tables = {
    WishlistItem: [{ id: "other-user-piece", userId: "buyer-B", productId: "piece-1" }],
    FavoriteStore: [{ id: "other-user-store", userId: "buyer-B", sellerId: "store-1" }],
    Product: [{ id: "piece-1", wishlistCount: 1 }, { id: "piece-2", wishlistCount: 0 }],
  };
});
const savedPieces = (userId: string) => tables.WishlistItem.filter(row => row.userId === userId).map(row => row.productId).sort();
const followedStores = (userId: string) => tables.FavoriteStore.filter(row => row.userId === userId).map(row => row.sellerId).sort();

test("saving two pieces preserves both and removing one preserves the other and other users", async () => {
  assert.deepEqual(await toggleWishlist("piece-1"), { ok: true, saved: true });
  assert.deepEqual(await toggleWishlist("piece-2"), { ok: true, saved: true });
  assert.deepEqual(savedPieces("buyer-A"), ["piece-1", "piece-2"]);
  assert.deepEqual(savedPieces("buyer-B"), ["piece-1"]);
  // A fresh database read, as used when refreshing the listing, retains both IDs.
  const persisted = await fixtureDb.wishlistItem.findMany({ where: { userId: "buyer-A" } });
  assert.deepEqual(persisted.map(row => row.productId).sort(), ["piece-1", "piece-2"]);
  assert.deepEqual(await toggleWishlist("piece-1"), { ok: true, saved: false });
  assert.deepEqual(savedPieces("buyer-A"), ["piece-2"]);
  assert.deepEqual(savedPieces("buyer-B"), ["piece-1"]);
  assert.deepEqual(tables.Product.map(row => row.wishlistCount), [1, 1]);
  assert.deepEqual(revalidated, Array(3).fill("/account/wishlist"));
});

test("following multiple jewelers and unfollowing one never changes another user's favorites", async () => {
  assert.deepEqual(await toggleFavoriteStore("store-1"), { ok: true, saved: true });
  assert.deepEqual(await toggleFavoriteStore("store-2"), { ok: true, saved: true });
  assert.deepEqual(followedStores("buyer-A"), ["store-1", "store-2"]);
  assert.deepEqual(await toggleFavoriteStore("store-1"), { ok: true, saved: false });
  assert.deepEqual(followedStores("buyer-A"), ["store-2"]);
  assert.deepEqual(followedStores("buyer-B"), ["store-1"]);
  assert.deepEqual(revalidated, Array(3).fill("/account/favorite-stores"));
});

test("switching users preserves independently saved copies of the same piece", async () => {
  await toggleWishlist("piece-1");
  currentUser = { id: "buyer-B" };
  assert.deepEqual(await toggleWishlist("piece-1"), { ok: true, saved: false });
  assert.deepEqual(savedPieces("buyer-A"), ["piece-1"]);
  assert.deepEqual(savedPieces("buyer-B"), []);
  assert.equal(tables.Product[0].wishlistCount, 1);
});

test("unavailable pieces leave favorites and counters unchanged", async () => {
  const original = structuredClone(tables);
  assert.deepEqual(await toggleWishlist("missing"), { ok: false, message: "This piece is no longer available." });
  assert.deepEqual(tables, original);
  assert.deepEqual(revalidated, []);
});

test("signed-out users cannot change pieces or jeweler favorites", async () => {
  currentUser = null;
  assert.equal((await toggleWishlist("piece-1")).ok, false);
  assert.equal((await toggleFavoriteStore("store-1")).ok, false);
  assert.deepEqual(calls, []);
});
