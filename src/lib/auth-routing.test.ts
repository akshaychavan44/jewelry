import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { authConfig } from "../server/auth/config";
import { canUseLogin, homeFor, loginDestination, loginForDestination, loginHref, safeCallback } from "./auth-routing";

test("jeweler credentials work in both portals while customer and admin restrictions stay intact", () => {
  assert.equal(canUseLogin("SELLER", "buyer"), true);
  assert.equal(canUseLogin("SELLER", "seller"), true);
  assert.equal(canUseLogin("BUYER", "buyer"), true);
  assert.equal(canUseLogin("BUYER", "seller"), false);
  assert.equal(canUseLogin("SELLER", "admin"), false);
  assert.equal(canUseLogin("BUYER", "admin"), false);
  assert.equal(canUseLogin("ADMIN", "admin"), true);
});

test("login destination follows the selected view and preserves shopping callbacks", () => {
  assert.equal(loginDestination("SELLER", "buyer"), "/");
  assert.equal(loginDestination("SELLER", "seller"), "/seller");
  assert.equal(loginDestination("SELLER", "buyer", "/checkout?step=address"), "/checkout?step=address");
  assert.equal(loginDestination("SELLER", "buyer", "/jewelers/another-shop"), "/jewelers/another-shop");
  assert.equal(loginDestination("SELLER", "buyer", "https://example.com"), "/");
  assert.equal(loginDestination("BUYER", "buyer"), "/account");
  assert.equal(loginDestination("ADMIN", "admin"), "/admin");
});

test("a jeweler session can use customer pages and still manage its business", () => {
  const auth = { expires: "2099-01-01", user: { id: "test-seller", role: "SELLER" as const, email: "seller@example.com" } };
  for (const path of ["/account", "/account/wishlist", "/checkout", "/seller", "/seller/products"]) {
    assert.equal(authConfig.callbacks.authorized({ auth, request: new NextRequest(`http://localhost:3000${path}`) }), true);
  }
  assert.ok(authConfig.callbacks.authorized({ auth, request: new NextRequest("http://localhost:3000/admin") }) instanceof Response);
});

test("login destinations preserve checkout and inquiry return paths", () => {
  for (const path of ["/checkout", "/account/messages?thread=123", "/product/ring?inquiry=true"]) {
    assert.equal(loginForDestination(path), `/login?callbackUrl=${encodeURIComponent(path)}`);
  }
  assert.equal(loginHref("seller", "/account/messages"), "/jeweler/login?callbackUrl=%2Faccount%2Fmessages");
});

test("seller destinations use the jeweler login with their original query", () => {
  for (const path of ["/seller", "/seller/onboarding", "/seller/orders?status=new"]) {
    assert.equal(loginForDestination(path), `/jeweler/login?callbackUrl=${encodeURIComponent(path)}`);
  }
  assert.equal(loginForDestination("/sellers"), "/login?callbackUrl=%2Fsellers");
});

test("external and malformed callback URLs cannot become redirect destinations", () => {
  for (const value of [undefined, null, "https://example.com", "//example.com", "/\\example.com", "/\n/example.com"]) {
    assert.equal(safeCallback(value), undefined);
  }
  assert.equal(safeCallback("/shop?q=gold%20ring"), "/shop?q=gold%20ring");
  assert.equal(loginHref("buyer", "//example.com"), "/login");
});

test("jewelers land on the platform while buyer and admin defaults stay unchanged", () => {
  assert.equal(homeFor("BUYER"), "/account");
  assert.equal(homeFor("SELLER"), "/");
  assert.equal(homeFor("ADMIN"), "/admin");
});

test("protected routes send guests to the correct login portal", () => {
  for (const path of ["/seller/orders?status=new", "/checkout", "/account/messages"]) {
    const result = authConfig.callbacks.authorized({ auth: null, request: new NextRequest(`http://localhost:3000${path}`) });
    assert.ok(result instanceof Response);
    assert.equal(result.headers.get("location"), `http://localhost:3000${loginForDestination(path)}`);
  }
});

test("customer sessions cannot access seller or admin routes", () => {
  const auth = { expires: "2099-01-01", user: { id: "test-buyer", role: "BUYER" as const, email: "buyer@example.com" } };
  for (const [path, destination] of [["/seller/orders", "/sell"], ["/admin", "/"]]) {
    const result = authConfig.callbacks.authorized({ auth, request: new NextRequest(`http://localhost:3000${path}`) });
    assert.ok(result instanceof Response);
    assert.equal(result.headers.get("location"), `http://localhost:3000${destination}`);
  }
  assert.equal(authConfig.callbacks.authorized({ auth, request: new NextRequest("http://localhost:3000/account") }), true);
});
