#!/usr/bin/env node
// `pnpm run dev` — start Next.js development server with Neon PostgreSQL backend.

import { spawn } from "node:child_process";
import { loadEnv } from "./lib/database.mjs";

loadEnv();

const next = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
next.on("exit", (code) => process.exit(code ?? 0));
