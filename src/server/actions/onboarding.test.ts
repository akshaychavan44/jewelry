import assert from "node:assert/strict";
import { mock, test } from "node:test";

const saved: Record<string, unknown>[] = [];
mock.module("server-only", { defaultExport: {} });
mock.module("next/navigation", { namedExports: { redirect: () => {} } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("@/server/auth/session", { namedExports: { assertUser: async () => ({ id: "fixture", role: "SELLER" }) } });
mock.module("@/server/db", { namedExports: { db: {} } });
mock.module("@/server/services/onboarding", { namedExports: {
  OnboardingError: class extends Error {},
  saveStoreProfile: async (_: string, data: Record<string, unknown>) => { saved.push(data); },
  saveBusinessVerification: async () => {}, submitApplication: async () => {},
  markStripeConnected: async () => {}, saveBankPayouts: async () => {},
} });
mock.module("@/server/services/payments", { namedExports: { createConnectOnboardingLink: async () => null } });
mock.module("@/server/services/storage", { namedExports: { UploadError: class extends Error {} } });
const { saveStoreProfileAction } = await import("./onboarding");
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ storeName: "Test Atelier", country: "IN", city: "Mumbai", defaultCurrency: "INR", foundedYear: "", ra_line1: "10 Market Road", ra_city: "Mumbai", ra_postalCode: "400001", ra_phone: "+91 9876543210" })) data.set(key, value);
  return data;
}
test("invalid optional fields return visible summary, field error and retained values without saving", async () => {
  for (const [key, value] of [["foundedYear", "abc"], ["ra_phone", "123"], ["bio", "x".repeat(1501)], ["specialties", "a,b,c,d,e,f,g"]]) {
    const data = form(); data.set(key, value);
    const before = saved.length;
    const result = await saveStoreProfileAction({}, data);
    assert.equal(result.ok, false);
    assert.ok(result.message);
    assert.ok(result.fieldErrors?.[key]?.length);
    assert.equal(result.values?.[key], value);
    assert.equal(saved.length, before);
  }
});
test("valid profile including blank founding year saves contact, address and socials and reports success", async () => {
  const data = form(); data.set("instagram", "https://instagram.com/testatelier");
  const result = await saveStoreProfileAction({}, data);
  assert.equal(result.ok, true);
  const value = saved.at(-1)!;
  assert.equal(value.foundedYear, undefined);
  assert.equal((value.returnAddress as { phone: string }).phone, "+91 9876543210");
  assert.equal((value.socials as { instagram: string }).instagram, "https://instagram.com/testatelier");
});
