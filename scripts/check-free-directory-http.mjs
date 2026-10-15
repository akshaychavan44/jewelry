import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = process.argv[2] || "http://localhost:3000";
const jar = new Map();
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), {
    ...options, redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...options.headers },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [name, ...value] = cookie.split(";")[0].split("=");
    jar.set(name, value.join("="));
  }
  return response;
}
const seed = await readFile("database/seed/data/people.ts", "utf8");
const password = seed.match(/DEMO_PASSWORD\s*=\s*"([^"]+)"/)?.[1];
assert.ok(password, "Demo password must come from the existing seed");
const csrfResponse = await request("/api/auth/csrf");
const { csrfToken } = await csrfResponse.json();
const signIn = await request("/api/auth/callback/credentials", {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrfToken, email: "admin@loupe.example", password, intent: "admin", callbackUrl: `${origin}/admin` }),
});
assert.ok(!signIn.headers.get("location")?.includes("error="), "Existing demo admin sign-in must succeed");
assert.ok([...jar.keys()].some(k => k.includes("session-token")), "Expected authenticated session");
const pages = new Map();
for (const path of ["/admin", "/admin/verification-settings", "/admin/kyc", "/admin/users", "/admin/reviews", "/admin/certificates", "/admin/business-names", "/admin/audit"]) {
  const started = performance.now();
  const response = await request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!/Application error:|Internal Server Error|data-next-error|We couldn’t load this admin page/.test(html), path);
  assert.ok(html.includes("Verification settings"), `${path}: updated navigation`);
  assert.ok(!html.includes("Listing Plans &amp; Billing"), `${path}: legacy navigation removed`);
  pages.set(path, html);
  console.log(`PASS: ${path} (${Math.round(performance.now() - started)}ms)`);
}
assert.ok(!/Active subscriptions|Monthly paying ateliers/.test(pages.get("/admin")));
assert.ok(pages.get("/admin").includes("Custom enquiries"));
assert.ok(pages.get("/admin/verification-settings").includes("Save verification settings"));
assert.ok(!/<th[^>]*>Orders<\/th>/.test(pages.get("/admin/users")));
const detail = pages.get("/admin/kyc").match(/href="(\/admin\/kyc\/[^"?]+)"/)?.[1];
assert.ok(detail, "Seeded verification detail link");
const detailResponse = await request(detail);
assert.equal(detailResponse.status, 200);
const detailHtml = await detailResponse.text();
assert.ok(!/Commission override|Commission earned|Stripe capabilities|Payout account/.test(detailHtml));
assert.ok(detailHtml.includes("Showcase pieces"));
console.log("PASS: verification detail without billing/payment controls");
const document = detailHtml.match(/href="(\/api\/files\/[^"?]+)"/)?.[1];
assert.ok(document, "Seeded verification document link");
const documentStarted = performance.now();
const preview = await request(document, { headers: { Range: "bytes=0-1023" } });
assert.equal(preview.status, 206, "Local verification document range preview");
assert.equal(preview.headers.get("cache-control"), "private, no-store");
assert.ok(preview.headers.get("content-disposition")?.startsWith("inline"));
assert.ok((await preview.arrayBuffer()).byteLength > 0);
console.log(`PASS: audited private document preview (${Math.round(performance.now() - documentStarted)}ms)`);
const legacy = await request("/admin/monetization");
if (legacy.status === 307 || legacy.status === 308) {
  assert.equal(new URL(legacy.headers.get("location"), origin).pathname, "/admin");
} else {
  const html = await legacy.text();
  assert.equal(legacy.status, 200);
  assert.ok(/NEXT_REDIRECT[^<]*\/admin|http-equiv="refresh"[^>]*url=\/admin/.test(html), "Streaming overview redirect");
}
console.log("PASS: former billing URL redirects to overview");
console.log("HTTP rendering verified. No moderation, verification or account-control forms submitted; sign-in and document access generate standard login/audit entries.");
