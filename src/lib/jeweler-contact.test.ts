import assert from "node:assert/strict";
import { test } from "node:test";
import { contactLinks, directoryWhatsappLink, whatsappInquiry } from "./jeweler-contact";
import { businessPhoneSchema, directoryProfileSchema } from "./jeweler-profile";
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

test("saved directory WhatsApp digits retain their international contact link", () => {
  for (const value of ["+91 98765 43210", "919876543210"]) {
    const stored = value.replace(/\D/g, "");
    assert.equal(directoryWhatsappLink(stored), "https://wa.me/919876543210");
  }
  for (const value of ["", "123", "0919876543210", "javascript:1234567890", "1".repeat(16)]) assert.equal(directoryWhatsappLink(value), null);
});

test("every accepted business phone can render a call link", () => {
  for (const phone of ["+91 (98765) 43210", "9876543210", "+1.646.555.0172"]) {
    assert.ok(businessPhoneSchema.safeParse(phone).success);
    assert.ok(contactLinks(phone)?.call);
  }
  for (const phone of ["123", "1".repeat(20), "javascript:1234567"]) assert.equal(businessPhoneSchema.safeParse(phone).success, false);
  assert.ok(businessPhoneSchema.safeParse("").success);
});

const profile = { storeName: "Test Atelier", tagline: "", bio: "", city: "Jaipur", country: "IN", defaultCurrency: "INR", foundedYear: "1932", specialties: "Bridal", address: "10 Market Road", addressLine2: "Floor 2", addressCity: "Mumbai", region: "Maharashtra", postalCode: "400001", hours: "", phone: "", whatsapp: "", publicEmail: "", instagram: "", facebook: "", youtube: "", website: "", maps: "", acceptsCustomOrders: false };

test("profile validation retains complete addresses and permits clearing optional fields", () => {
  const saved = directoryProfileSchema.parse(profile);
  assert.equal(saved.addressCity, "Mumbai");
  assert.equal(saved.city, "Jaipur");
  assert.equal(saved.addressLine2, "Floor 2");
  assert.equal(saved.region, "Maharashtra");
  assert.equal(saved.postalCode, "400001");
  assert.ok(directoryProfileSchema.safeParse({ ...profile, foundedYear: "", addressLine2: "", region: "", postalCode: "" }).success);
});

test("invalid identity settings and excess specialties fail without silent truncation", () => {
  for (const change of [{country:"XX"}, {defaultCurrency:"FAKE"}, {foundedYear:"1699"}, {foundedYear:String(new Date().getFullYear()+1)}, {specialties:"a,b,c,d,e,f,g"}]) assert.equal(directoryProfileSchema.safeParse({...profile,...change}).success, false);
});
