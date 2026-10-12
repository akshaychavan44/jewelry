import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

for (const file of [".env.local", ".env"]) { try { process.loadEnvFile(file); } catch {} }
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
const url = new URL(process.env.DATABASE_URL);
url.hostname = url.hostname.replace("-pooler.", ".");
const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || url.toString() });
const migration = ["202610100001_jeweler_dashboard", "202610100002_directory_features"].map((name) => readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8")).join("\n");
const client = await pool.connect();
try {
  // Validate the additive migration transactionally before keeping it.
  await client.query("BEGIN");
  await client.query(migration);
  await client.query("ROLLBACK");
  await client.query("BEGIN");
  await client.query(migration);
  await client.query("COMMIT");
  console.log("Jeweler dashboard migration applied. Existing records preserved.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
