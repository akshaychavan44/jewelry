import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWhereClause, createParamCollector } from "./query-builder";
import { SCHEMA_META } from "./schema-meta";

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
