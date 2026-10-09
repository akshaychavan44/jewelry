import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const hash = await bcrypt.hash("LoupeDemo!2026", 10);
  await pool.query('UPDATE "User" SET role = $1, "passwordHash" = $2 WHERE email = $3', [
    "ADMIN",
    hash,
    "admin@loupe.example",
  ]);
  console.log("Updated admin@loupe.example to ADMIN with password LoupeDemo!2026");

  const res = await pool.query('SELECT id, email, role, status FROM "User" WHERE role = $1', ["ADMIN"]);
  console.log("Admin users in database:", res.rows);
}

main().finally(() => pool.end());
