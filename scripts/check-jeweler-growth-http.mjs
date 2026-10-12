import assert from "node:assert/strict";
const base = process.env.TEST_APP_URL ?? "http://localhost:3000";
const cookies = new Map();
async function request(path, init = {}) {
  const response = await fetch(new URL(path, base), { ...init, headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...init.headers }, redirect: "manual", signal: AbortSignal.timeout(90000) });
  for (const line of response.headers.getSetCookie()) { const [pair] = line.split(";"); const split = pair.indexOf("="); cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
  return response;
}
let r = await request("/jewelers"); assert.equal(r.status, 200); let html = await r.text();
assert.ok(html.includes("All cities") && html.includes("All specialties") && html.includes("Near me"));
const citySelect = html.match(/<select[^>]*name="city"[^>]*>(.*?)<\/select>/s)?.[1];
const city = citySelect?.match(/<option value="([^"]+)"/s)?.[1];
if (city) { r = await request(`/jewelers?city=${encodeURIComponent(city)}`); assert.equal(r.status, 200); html = await r.text(); assert.ok(html.includes("Clear filters")); assert.ok(html.includes(`value="${city}" selected=""`)); }
r = await request("/jewelers?city=NoSuchCityFixture"); assert.equal(r.status, 200); assert.ok((await r.text()).includes("No jewelers match that search"));
r = await request("/jewelers?lat=0&lng=0&radius=10"); assert.equal(r.status, 200); html = await r.text(); assert.ok(html.replace(/<!--.*?-->/g, "").includes("Within 10 km, nearest first") && html.includes("Clear nearby search"));
r = await request("/jewelers?lat=999&lng=0"); assert.equal(r.status, 200); assert.ok(!(await r.text()).includes("Clear nearby search"));
console.log("PASS: directory renders filters, city navigation, empty results, nearby radius and invalid coordinates");
r = await request("/seller/analytics"); assert.ok([302, 303, 307].includes(r.status));
r = await request("/api/analytics/contact", { method: "POST", body: "{}" }); assert.equal(r.status, 403);
r = await request("/api/analytics/contact", { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: "{}" }); assert.equal(r.status, 400);
console.log("PASS: signed-out dashboard protection and contact endpoint origin/input validation");
const csrf = await (await request("/api/auth/csrf")).json();
r = await request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: "seller@loupe.example", password: "LoupeDemo!2026", callbackUrl: `${base}/seller` }) });
assert.equal(r.status, 200); const login = await r.json(); assert.ok(!login.url.includes("error"), login.url);
for (const days of [7, 30, 90]) { r = await request(`/seller/analytics?days=${days}`); assert.equal(r.status, 200); html = await r.text(); for (const text of ["Profile views", "Jewelry views", "Contact clicks", "Custom enquiries", "Daily activity", `Last ${days} calendar days`]) assert.ok(html.includes(text), text); }
r = await request("/seller/notifications"); assert.equal(r.status, 200); html = await r.text(); assert.ok(html.includes("Enquiry notifications") && html.includes("Reading a notification does not change"));
r = await request("/seller/custom-requests"); assert.equal(r.status, 200); assert.ok((await r.text()).includes("Custom Requests"));
r = await request("/seller/settings"); assert.equal(r.status, 200); html = await r.text(); assert.ok(html.includes("Boutique latitude") && html.includes("Boutique longitude"));
console.log("PASS: demo jeweler login, analytics periods, notification inbox, existing enquiries and coordinate fields");
console.log("HTTP checks passed. Browser interaction and responsive visual checks still required.");
