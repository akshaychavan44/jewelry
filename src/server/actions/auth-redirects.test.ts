import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Role } from "@/lib/domain-enums";

let role: Role = "BUYER";
let registering = false;
const signIns: { provider: string; options: Record<string, unknown> }[] = [];
const views: string[] = [];
class Redirect extends Error { constructor(public destination: string) { super(destination); } }

mock.module("server-only", { defaultExport: {} });
mock.module("next-auth", { namedExports: { AuthError: class extends Error {} } });
mock.module("next/navigation", { namedExports: { redirect: (path: string) => { throw new Redirect(path); } } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/headers", { namedExports: { cookies: async () => ({ delete: () => {} }) } });
mock.module("@/server/auth", { namedExports: {
  signIn: async (provider: string, options: Record<string, unknown>) => { signIns.push({ provider, options }); return "/"; },
  signOut: async () => {}, unstable_update: async () => {},
} });
mock.module("@/server/auth/session", { namedExports: { requireUser: async () => ({ id: "fixture", role }) } });
mock.module("@/server/account-view", { namedExports: { setAccountView: async (view: string) => { views.push(view); } } });
mock.module("@/server/services/cart", { namedExports: { mergeGuestCart: async () => {} } });
mock.module("@/server/db", { namedExports: { db: { user: {
  findFirst: async () => registering ? null : ({ id: "fixture", role }),
  create: async ({ data }: { data: { role: Role } }) => ({ id: "fixture-new", ...data }),
} } } });

const { loginAction, registerAction } = await import("./auth");
const { oauthSignIn } = await import("./oauth");
function loginForm(intent: string, callback = "") {
  const form = new FormData();
  for (const [key, value] of Object.entries({ email: "fixture@example.com", password: "FixturePassword123", intent, callbackUrl: callback })) form.set(key, value);
  return form;
}

test("password login sends customers home and preserves explicit business/admin destinations", async () => {
  for (const [accountRole, intent, destination] of [
    ["BUYER", "buyer", "/"], ["SELLER", "buyer", "/"], ["SELLER", "seller", "/seller"], ["ADMIN", "admin", "/admin"],
  ] as const) {
    role = accountRole;
    await assert.rejects(loginAction({}, loginForm(intent)), error => error instanceof Redirect && error.destination === destination);
  }
  assert.deepEqual(views, ["customer", "customer", "seller"]);
});

test("password login returns to requested local pages and rejects external callbacks", async () => {
  role = "BUYER";
  for (const [callback, destination] of [["/account/wishlist", "/account/wishlist"], ["/product/ring?inquiry=true", "/product/ring?inquiry=true"], ["https://example.com", "/"]]) {
    await assert.rejects(loginAction({}, loginForm("buyer", callback)), error => error instanceof Redirect && error.destination === destination);
  }
  role = "ADMIN";
  await assert.rejects(loginAction({}, loginForm("admin", "/admin/kyc")), error => error instanceof Redirect && error.destination === "/admin/kyc");
});

test("customer registration opens the platform and jeweler registration keeps onboarding", async () => {
  registering = true;
  try {
    for (const [intent, destination] of [["buyer", "/"], ["seller", "/seller/onboarding"]]) {
      const form = loginForm(intent);
      form.set("name", "Fixture Account");
      await assert.rejects(registerAction({}, form), error => error instanceof Redirect && error.destination === destination);
    }
  } finally { registering = false; }
});

test("social sign-in defaults to the platform and preserves only safe local return URLs", async () => {
  for (const [provider, callback, destination] of [
    ["google", undefined, "/"], ["apple", undefined, "/"], ["google", "/account/wishlist", "/account/wishlist"], ["google", "/\\example.com", "/"],
  ] as const) {
    await oauthSignIn(provider, callback);
    assert.equal(signIns.at(-1)?.options.redirectTo, destination);
    assert.equal(views.at(-1), "customer");
  }
});
