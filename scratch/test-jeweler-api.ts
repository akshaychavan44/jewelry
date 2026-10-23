import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { GET, POST } from "../src/app/api/v1/jewelers/route";

async function runTests() {
  console.log("=== Testing /api/v1/jewelers REST API ===\n");

  const apiKey = process.env.EXTERNAL_API_KEY;
  console.log("Using EXTERNAL_API_KEY:", apiKey ? `${apiKey.slice(0, 10)}...` : "NOT FOUND");

  // 1. Test Unauthorized without key
  console.log("\n1. Testing Unauthorized Request (no API key)...");
  const unauthReq = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "GET",
  });
  const unauthRes = await GET(unauthReq);
  console.log("Status:", unauthRes.status);
  const unauthData = await unauthRes.json();
  console.log("Body:", unauthData);
  if (unauthRes.status !== 401) throw new Error("Expected 401 Unauthorized");

  // 2. Test Authorized GET
  console.log("\n2. Testing Authorized GET list...");
  const authGetReq = new Request("http://localhost:3000/api/v1/jewelers?limit=3", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const authGetRes = await GET(authGetReq);
  console.log("Status:", authGetRes.status);
  const listData = await authGetRes.json();
  console.log("Total approved jewelers in DB:", listData.total);
  console.log("Returned sample count:", listData.jewelers?.length);

  // 3. Test Invalid POST (validation check)
  console.log("\n3. Testing POST with missing required fields...");
  const invalidPostReq = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storeName: "A" }), // too short, no email
  });
  const invalidPostRes = await POST(invalidPostReq);
  console.log("Status:", invalidPostRes.status);
  const invalidData = await invalidPostRes.json();
  console.log("Validation details:", invalidData);
  if (invalidPostRes.status !== 422) throw new Error("Expected 422 Unprocessable Entity");

  // 4. Test Valid Creation
  const testEmail = `test_artisan_${Date.now()}@example.com`;
  const testStore = `Artisan Jewels ${Date.now().toString().slice(-4)}`;
  console.log(`\n4. Testing POST creating new jeweler: "${testStore}" (${testEmail})...`);

  const validPostReq = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: testStore,
      email: testEmail,
      country: "US",
      city: "New York",
      phone: "+12125550199",
      tagline: "Handcrafted 18k Gold & Ethically Sourced Gems",
      bio: "Master goldsmith with over 20 years of experience crafting bespoke pieces.",
      specialties: ["Gold", "Diamonds", "Custom Design"],
      socials: {
        instagram: "artisanjewels",
      },
    }),
  });

  const validPostRes = await POST(validPostReq);
  console.log("Status:", validPostRes.status);
  const createdData = await validPostRes.json();
  console.log("Creation Response:", JSON.stringify(createdData, null, 2));

  if (validPostRes.status !== 201 || !createdData.ok) {
    throw new Error(`Failed to create jeweler: ${JSON.stringify(createdData)}`);
  }

  // 5. Query newly created jeweler by slug
  console.log(`\n5. Querying newly created jeweler by slug: "${createdData.jeweler.slug}"...`);
  const queryReq = new Request(`http://localhost:3000/api/v1/jewelers?slug=${createdData.jeweler.slug}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const queryRes = await GET(queryReq);
  const queryData = await queryRes.json();
  console.log("Verification status in DB:", queryData.jeweler?.verificationStatus);
  console.log("Store Name:", queryData.jeweler?.storeName);

  if (queryData.jeweler?.verificationStatus !== "APPROVED") {
    throw new Error("Expected jeweler verificationStatus to be APPROVED");
  }

  // 6. Test duplicate creation prevention (conflict handling)
  console.log("\n6. Testing Duplicate Prevention for the same email...");
  const duplicateReq = new Request("http://localhost:3000/api/v1/jewelers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: testStore,
      email: testEmail,
    }),
  });
  const duplicateRes = await POST(duplicateReq);
  console.log("Duplicate status:", duplicateRes.status);
  const duplicateData = await duplicateRes.json();
  console.log("Duplicate response:", duplicateData);
  if (duplicateRes.status !== 409) throw new Error("Expected 409 Conflict");

  console.log("\n ALL TESTS PASSED SUCCESSFULLY! \n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
