import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = process.argv[2] || "http://localhost:3000";
const seed = await readFile("prisma/seed/data/people.ts", "utf8");
const password = seed.match(/DEMO_PASSWORD\s*=\s*"([^"]+)"/)?.[1];
assert.ok(password);
const decode = text => text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const jar = new Map();
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), { ...options, redirect: "manual", signal: AbortSignal.timeout(45000), headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "), Origin: origin, ...options.headers } });
  for (const cookie of response.headers.getSetCookie()) {
    const [key, ...value] = cookie.split(";")[0].split("=");
    jar.set(key, value.join("="));
  }
  return response;
}
const page = await request("/admin/login");
assert.equal(page.status, 200);
const html = await page.text();
assert.ok(html.includes("Admin Console Login"));
console.log("PASS: admin login form renders");
const form = new FormData();
for (const input of html.matchAll(/<input\b[^>]*>/g)) {
  if (!input[0].includes('type="hidden"')) continue;
  const name = input[0].match(/name="([^"]*)"/)?.[1];
  const value = input[0].match(/value="([^"]*)"/)?.[1] ?? "";
  if (name) form.append(decode(name), decode(value));
}
assert.ok([...form.keys()].some(key => key.startsWith("$ACTION_REF")), "Use the actual bound login form action");
form.set("email", "admin@loupe.example");
form.set("password", password);
form.set("intent", "admin");
form.set("callbackUrl", "/admin");
const started = performance.now();
const submitted = await request("/admin/login", { method: "POST", body: form });
if (submitted.status !== 303) {
  const result = await submitted.text();
  assert.equal(submitted.status, 200, "An unavailable connection must keep the login form usable");
  assert.ok(result.includes("Admin Console Login"));
  assert.ok(result.includes("connect to the directory right now"), "Return a clear connection error rather than an invalid-password message or global error");
  console.log(`PASS: connection failure stays inline and login remains usable (${Math.round(performance.now() - started)}ms)`);
  process.exitCode = 2; // Login availability is verified; live authentication is blocked.
} else {
  assert.equal(new URL(submitted.headers.get("location"), origin).pathname, "/admin");
  const overview = await request("/admin");
  assert.equal(overview.status, 200);
  const body = await overview.text();
  assert.ok(body.includes("Directory &amp; Platform Overview"));
  assert.ok(!body.includes("We couldn’t load this admin page"));
  console.log(`PASS: real admin login form signs in and opens overview (${Math.round(performance.now() - started)}ms)`);
  const queue = await request("/admin/kyc");
  assert.equal(queue.status, 200);
  const queueHtml = await queue.text();
  const detail = queueHtml.match(/href="(\/admin\/kyc\/[^"?]+)"/)?.[1];
  assert.ok(detail, "Seeded verification detail");
  const detailPage = await request(detail);
  assert.equal(detailPage.status, 200);
  const detailHtml = await detailPage.text();
  const document = detailHtml.match(/href="(\/api\/files\/[^"?]+)"/)?.[1];
  assert.ok(document, "Seeded verification document");
  const documentStarted = performance.now();
  const preview = await request(document, { headers: { Range: "bytes=0-1023" } });
  assert.equal(preview.status, 206);
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  assert.ok((await preview.arrayBuffer()).byteLength > 0);
  console.log(`PASS: authenticated audited document range preview (${Math.round(performance.now() - documentStarted)}ms)`);
}
