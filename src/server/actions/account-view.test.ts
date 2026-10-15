import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ACCOUNT_VIEW_COOKIE } from "@/lib/account-view";

let role = "SELLER";
const written: { name: string; value: string; options: { httpOnly: boolean; path: string; sameSite: string } }[] = [];
const refreshed: string[] = [];
class Redirect extends Error { constructor(public destination: string) { super(destination); } }

mock.module("server-only", { defaultExport: {} });
mock.module("@/server/auth/session", { namedExports: { requireUser: async () => ({ id: "fixture", role }) } });
mock.module("next/headers", { namedExports: { cookies: async () => ({
  set: (name: string, value: string, options: typeof written[number]["options"]) => written.push({ name, value, options }),
}) } });
mock.module("next/cache", { namedExports: { revalidatePath: (path: string) => refreshed.push(path) } });
mock.module("next/navigation", { namedExports: { redirect: (path: string) => { throw new Redirect(path); } } });

const { switchAccountView } = await import("./account-view");

test("switching both ways changes only the display cookie and returns to the requested experience", async () => {
  for (const [view, destination] of [["customer", "/"], ["seller", "/seller"]] as const) {
    await assert.rejects(switchAccountView(view), error => error instanceof Redirect && error.destination === destination);
    assert.equal(written.at(-1)?.name, ACCOUNT_VIEW_COOKIE);
    assert.equal(written.at(-1)?.value, view);
    assert.equal(written.at(-1)?.options.httpOnly, true);
    assert.equal(written.at(-1)?.options.path, "/");
    assert.equal(role, "SELLER");
  }
  assert.deepEqual(refreshed, ["/", "/"]);
});

test("switching rejects invalid views and never grants a buyer a seller session", async () => {
  const count = written.length;
  await assert.rejects(switchAccountView("admin" as "seller"));
  role = "BUYER";
  await assert.rejects(switchAccountView("seller"), error => error instanceof Redirect && error.destination === "/account");
  assert.equal(written.length, count);
  assert.equal(role, "BUYER");
  role = "SELLER";
});

test("switch redirects preserve local callbacks and reject external destinations", async () => {
  await assert.rejects(switchAccountView("customer", "/account/wishlist"), error => error instanceof Redirect && error.destination === "/account/wishlist");
  await assert.rejects(switchAccountView("customer", "https://example.com"), error => error instanceof Redirect && error.destination === "/");
});
