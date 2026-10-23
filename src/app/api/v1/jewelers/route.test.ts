import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module("server-only", { defaultExport: {} });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

process.env.EXTERNAL_API_KEY = "test_secret_key_123";

// Mock DB
const users: any[] = [];
const sellers: any[] = [];
const directorySettings: any[] = [];
const locations: any[] = [];
const shippingRates: any[] = [];

const mockDb = {
  user: {
    findFirst: async ({ where }: any) => {
      const email = where?.email?.equals?.toLowerCase();
      const u = users.find((x) => x.email.toLowerCase() === email);
      if (!u) return null;
      const s = sellers.find((x) => x.userId === u.id);
      return { ...u, sellerProfile: s || null };
    },
    create: async ({ data }: any) => {
      const user = { id: `usr_${Date.now()}_${Math.random()}`, ...data };
      users.push(user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const idx = users.findIndex((u) => u.id === where.id);
      if (idx !== -1) users[idx] = { ...users[idx], ...data };
      return users[idx];
    },
  },
  sellerProfile: {
    findFirst: async ({ where }: any) => {
      if (where?.slug) return sellers.find((s) => s.slug === where.slug) || null;
      return null;
    },
    findUnique: async ({ where }: any) => {
      if (where?.slug) {
        const s = sellers.find((x) => x.slug === where.slug);
        if (!s) return null;
        const u = users.find((x) => x.id === s.userId);
        return { ...s, user: { email: u?.email, name: u?.name, role: u?.role } };
      }
      return null;
    },
    findMany: async () => sellers.map((s) => ({ ...s })),
    count: async () => sellers.length,
    create: async ({ data }: any) => {
      const seller = { id: `sel_${Date.now()}_${Math.random()}`, ...data };
      sellers.push(seller);
      return seller;
    },
  },
  storeLocation: {
    create: async ({ data }: any) => {
      const loc = { id: `loc_${Date.now()}`, ...data };
      locations.push(loc);
      return loc;
    },
  },
  shippingRate: {
    create: async ({ data }: any) => {
      const rate = { id: `rate_${Date.now()}`, ...data };
      shippingRates.push(rate);
      return rate;
    },
  },
  $executeRaw: async () => 1,
  $transaction: async (fn: (tx: any) => Promise<any>) => fn(mockDb),
};

mock.module("@/server/db", { namedExports: { db: mockDb } });

const { GET, POST } = await import("./route");

test("GET /api/v1/jewelers rejects missing or invalid API key with 401", async () => {
  const req = new Request("http://localhost:3000/api/v1/jewelers");
  const res = await GET(req);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes("Unauthorized"));
});

test("POST /api/v1/jewelers validates payload and rejects invalid inputs with 422", async () => {
  const req = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: "Bearer test_secret_key_123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storeName: "A" }), // missing email, storeName too short
  });
  const res = await POST(req);
  assert.equal(res.status, 422);
  const data = await res.json();
  assert.equal(data.error, "Validation failed");
  assert.ok(data.details.email);
  assert.ok(data.details.storeName);
});

test("POST /api/v1/jewelers creates jeweler profile automatically with APPROVED status", async () => {
  const req = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: "Bearer test_secret_key_123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: "Crown & Carat",
      email: "crown@example.com",
      country: "US",
      city: "San Francisco",
      phone: "+14155551234",
      tagline: "Fine handcrafted gold rings",
      bio: "Master jewelers since 1995",
      specialties: ["Gold", "Diamonds"],
      socials: {
        instagram: "crownandcarat",
      },
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.jeweler.storeName, "Crown & Carat");
  assert.equal(data.jeweler.slug, "crown-and-carat");
  assert.equal(data.jeweler.verificationStatus, "APPROVED");
  assert.equal(data.jeweler.profileUrl, "/jewelers/crown-and-carat");
  assert.equal(data.jeweler.dashboardUrl, "/seller");
  assert.ok(data.credentials.password);

  // Verify in-memory state
  const createdSeller = sellers.find((s) => s.slug === "crown-and-carat");
  assert.ok(createdSeller);
  assert.equal(createdSeller.verificationStatus, "APPROVED");
  assert.equal(createdSeller.onboardingStep, 4);
});

test("POST /api/v1/jewelers returns 409 Conflict if jeweler profile already exists for email", async () => {
  const req = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: "Bearer test_secret_key_123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: "Crown Duplicate",
      email: "crown@example.com",
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.ok(data.error.includes("already exists"));
  assert.equal(data.slug, "crown-and-carat");
});

test("GET /api/v1/jewelers queries newly created jeweler by slug with 200", async () => {
  const req = new Request("http://localhost:3000/api/v1/jewelers?slug=crown-and-carat", {
    headers: {
      Authorization: "Bearer test_secret_key_123",
    },
  });

  const res = await GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.jeweler.storeName, "Crown & Carat");
  assert.equal(data.jeweler.verificationStatus, "APPROVED");
  assert.equal(data.jeweler.user.email, "crown@example.com");
});
