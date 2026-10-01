#!/usr/bin/env node
// `npm run dev` — one command for local development:
//   1. make sure PostgreSQL is up (boots embedded Postgres when needed)
//   2. apply pending migrations and seed an empty database
//   3. start `next dev`, shutting the database down again on exit

import { spawn } from "node:child_process";
import { databaseState, ensureDatabase, loadEnv, run } from "./lib/database.mjs";

loadEnv();

const db = await ensureDatabase().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});

const migrateCode = await run("prisma", ["migrate", "deploy"], { stdio: ["inherit", "ignore", "inherit"] });
if (migrateCode !== 0) {
  console.error("[db] Migration failed — see output above.");
  await db.stop();
  process.exit(migrateCode);
}

const state = await databaseState();
if (!state.seeded) {
  console.log("[db] Empty database detected — seeding demo marketplace data…");
  const seedCode = await run("prisma", ["db", "seed"]);
  if (seedCode !== 0) console.error("[db] Seeding failed — the app will start with an empty catalogue.");
}

const next = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

let shuttingDown = false;
const shutdown = async (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!next.killed) next.kill("SIGINT");
  await db.stop();
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 0));
