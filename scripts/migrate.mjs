import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

try {
  process.loadEnvFile(".env");
} catch {}

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: connStr });

async function runMigrations() {
  console.log("Connecting to Neon PostgreSQL...");
  const client = await pool.connect();
  try {
    const migrationFiles = [
      "prisma/migrations/20260930092701_init/migration.sql",
      "prisma/migrations/20260930092708_integrity_checks/migration.sql",
    ];

    // Check if initial tables already exist
    const { rows: tableRows } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'"
    );

    if (tableRows.length === 0) {
      console.log("Applying initial migrations to Neon PostgreSQL...");
      for (const relPath of migrationFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (existsSync(fullPath)) {
          console.log(`Applying ${relPath}...`);
          const sql = readFileSync(fullPath, "utf8");
          await client.query(sql);
        }
      }
      console.log("Migrations applied successfully!");
    } else {
      console.log("Database tables already present. Checking timestamp defaults...");
    }

    console.log("Setting default timestamps on all updatedAt and createdAt columns...");
    await client.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'updatedAt' AND table_schema = 'public') LOOP
              EXECUTE 'ALTER TABLE "' || r.table_name || '" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP';
          END LOOP;
          FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'createdAt' AND table_schema = 'public') LOOP
              EXECUTE 'ALTER TABLE "' || r.table_name || '" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP';
          END LOOP;
      END $$;
    `);
    console.log("All default timestamp constraints applied to Neon successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
