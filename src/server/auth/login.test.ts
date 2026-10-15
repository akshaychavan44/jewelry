import assert from "node:assert/strict";
import { mock, test } from "node:test";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/domain-enums";

let configuration: NextAuthConfig;
const fixture = { id: "fixture-jeweler", email: "fixture@example.com", name: "Fixture", image: null, role: "SELLER" as Role, status: "ACTIVE", passwordHash: await bcrypt.hash("FixturePassword123", 4) };
let timestampWrites = 0;

mock.module("server-only", { defaultExport: {} });
mock.module("@/server/db", { namedExports: { db: {
  user: { findFirst: async () => fixture },
  $executeRaw: async () => { timestampWrites++; },
} } });
mock.module("next-auth", {
  defaultExport: (config: NextAuthConfig) => { configuration = config; return {}; },
  namedExports: { CredentialsSignin: class extends Error {} },
});

await import("./index");
const provider = configuration!.providers[0] as unknown as { options: { authorize: (raw: Record<string, string>) => Promise<{ id: string; role: Role } | null> } };
const authorize = (intent: string, password = "FixturePassword123") => provider.options.authorize({ email: fixture.email, password, intent });

test("real credentials handler accepts one jeweler password for both views and retains SELLER", async () => {
  for (const intent of ["buyer", "seller"]) {
    const user = await authorize(intent);
    assert.equal(user?.id, fixture.id);
    assert.equal(user?.role, "SELLER");
  }
  assert.equal(timestampWrites, 2);
});

test("credentials handler still rejects incorrect passwords, suspended accounts and wrong privileged portals", async () => {
  assert.equal(await authorize("buyer", "wrong-password"), null);
  fixture.status = "SUSPENDED";
  await assert.rejects(authorize("buyer"), error => (error as { code?: string }).code === "suspended");
  fixture.status = "ACTIVE";
  await assert.rejects(authorize("admin"), error => (error as { code?: string }).code === "wrong_portal");
  fixture.role = "BUYER";
  await assert.rejects(authorize("seller"), error => (error as { code?: string }).code === "wrong_portal");
  fixture.role = "SELLER";
  assert.equal(timestampWrites, 2);
});
