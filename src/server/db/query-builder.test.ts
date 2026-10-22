import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWhereClause, createParamCollector } from "./query-builder";
import { SCHEMA_META } from "./schema-meta";

test("homepage certification statistics support empty and nonempty array filters", () => {
  for (const empty of [true, false]) {
    const collector = createParamCollector();
    const sql = buildWhereClause({ certificationLabs: { isEmpty: empty } }, SCHEMA_META.Product, collector);
    assert.equal(sql, `cardinality("certificationLabs") ${empty ? "=" : ">"} 0`);
    assert.deepEqual(collector.params, []);
  }
  assert.throws(() => buildWhereClause({ name: { isEmpty: true } }, SCHEMA_META.Product, createParamCollector()), /Unsupported/);
});

test("metal filtering correlates variants to the outer product, not variant.id", () => {
  const collector = createParamCollector();
  const sql = buildWhereClause({ variants: { some: { isActive: true, metalType: { in: ["GOLD_18K"] } } } }, SCHEMA_META.Product, collector);
  assert.match(sql, /"rel_variants_0"\."productId" = "Product"\."id"/);
  assert.deepEqual(collector.params, [true, "GOLD_18K"]);
});

test("negative relation filters retain an outer-table correlation", () => {
  const sql = buildWhereClause({ variants: { none: { isActive: true } } }, SCHEMA_META.Product, createParamCollector());
  assert.match(sql, /^NOT EXISTS/);
  assert.match(sql, /"productId" = "Product"\."id"/);
});

test("nested relation filters correlate each level to its explicit parent alias", () => {
  const sql = buildWhereClause({ variants: { some: { product: { seller: { storeName: { contains: "Atelier" } } } } } }, SCHEMA_META.Product, createParamCollector());
  assert.match(sql, /"productId" = "Product"\."id"/);
  assert.match(sql, /"rel_product_0"\."id" = "rel_variants_0"\."productId"/);
  assert.match(sql, /"rel_seller_0"\."id" = "rel_product_0"\."sellerId"/);
});

test("explicit parent aliases remain valid for relation is and isNot filters", () => {
  for (const operator of ["is", "isNot"]) {
    const sql = buildWhereClause({ seller: { [operator]: { verificationStatus: "APPROVED" } } }, SCHEMA_META.Product, createParamCollector(), "products");
    assert.match(sql, /"rel_seller_0"\."id" = "products"\."sellerId"/);
  }
});


test("favorites compound lookups constrain both the owner and the selected target", () => {
  for (const [model, key, field] of [
    ["WishlistItem", "userId_productId", "productId"],
    ["FavoriteStore", "userId_sellerId", "sellerId"],
  ]) {
    const collector = createParamCollector();
    const sql = buildWhereClause({ [key]: { userId: "buyer-1", [field]: "target-2" } }, SCHEMA_META[model], collector);
    assert.equal(sql, '("userId" = $1 AND "' + field + '" = $2)');
    assert.deepEqual(collector.params, ["buyer-1", "target-2"]);
  }
});

test("unsupported or incomplete filters fail instead of becoming an unrestricted query", () => {
  for (const where of [
    { userId_unknown: { userId: "buyer-1", unknown: "piece-1" } },
    { userId_productId: { userId: "buyer-1" } },
    { userId_productId: { userId: "buyer-1", productId: undefined } },
    { userId_productId: { userId: "buyer-1", productId: "piece-1", extra: "ignored" } },
    { productId: { unsupported: "piece-1" } },
  ]) {
    assert.throws(() => buildWhereClause(where, SCHEMA_META.WishlistItem, createParamCollector()), /Unsupported|Invalid/);
  }
});


test("declared compound keys preserve every field and table alias across existing callers", () => {
  for (const meta of Object.values(SCHEMA_META)) {
    for (const [key, fields] of Object.entries(meta.compoundKeys ?? {})) {
      const collector = createParamCollector();
      const values = fields.map((field, index) => `${field}-${index}`);
      const sql = buildWhereClause({ [key]: Object.fromEntries(fields.map((field, index) => [field, values[index]])) }, meta, collector, "target");
      assert.equal(sql, `(${fields.map((field, index) => `"target"."${field}" = $${index + 1}`).join(" AND ")})`);
      assert.deepEqual(collector.params, values);
    }
  }
});
