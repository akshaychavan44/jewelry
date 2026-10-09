import assert from "node:assert/strict";
import { test } from "node:test";
import { contactLinks, whatsappInquiry } from "./jeweler-contact";
import { publicContactSchema } from "./public-contact";

test("international showroom numbers create call and WhatsApp links", () => {
  assert.deepEqual(contactLinks("+91 (98765) 43210"), { call: "tel:+919876543210", whatsapp: "https://wa.me/919876543210" });
  assert.equal(contactLinks("9876543210")?.whatsapp, null);
});

test("missing or malformed contact numbers cannot become links", () => {
  for (const phone of [undefined, null, "", "123", "javascript:alert(1)", "+91;123456789", "++919876543210"]) assert.equal(contactLinks(phone), null);
});

test("WhatsApp inquiry preserves the product title and full product link", () => {
  const title = "Gold & emerald ring #1";
  const productUrl = "https://loupe.example/product/emerald-ring";
  const link = new URL(whatsappInquiry("https://wa.me/919876543210", title, productUrl));
  assert.equal(link.origin, "https://wa.me");
  const message = link.searchParams.get("text");
  assert.ok(message?.includes(title));
  assert.ok(message?.includes(productUrl));
  assert.equal([...link.searchParams.keys()].length, 1);
});

test("public contact settings require country codes and allow opting out", () => {
  const initial = { name: "Test Atelier", line1: "10 Market Road", city: "Mumbai", phone: "+91 98765 43210", hours: "", appointmentOnly: true };
  assert.equal(publicContactSchema.parse(initial).phone, "+919876543210");
  assert.equal(publicContactSchema.safeParse({ ...initial, phone: "9876543210" }).success, false);
  assert.equal(publicContactSchema.safeParse({ ...initial, phone: "" }).success, true);
  assert.equal(publicContactSchema.safeParse({ ...initial, line1: "" }).success, false);
});
