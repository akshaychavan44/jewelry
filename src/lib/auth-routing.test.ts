import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { authConfig } from "../server/auth/config";
import { homeFor, loginForDestination, loginHref, safeCallback } from "./auth-routing";

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

test("default destinations follow the stored account role", () => {
  assert.equal(homeFor("BUYER"), "/account");
  assert.equal(homeFor("SELLER"), "/seller");
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
