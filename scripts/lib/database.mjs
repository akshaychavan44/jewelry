// Local database lifecycle helpers shared by scripts/dev.mjs and scripts/db.mjs.
//
// When DATABASE_URL points at localhost and nothing is listening, we boot a real
// PostgreSQL cluster with `embedded-postgres` (binaries ship via npm — no Docker
// or system install required). Against any other host we only check reachability.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // file absent — fine
    }
  }
}

export function readDatabaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || "postgres"),
    database: url.pathname.replace(/^\//, "") || "postgres",
  };
}

export const DATA_DIR = path.resolve("data/postgres");

export function isPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

const isLocalHost = (host) => ["localhost", "127.0.0.1", "::1"].includes(host);

/**
 * Makes sure PostgreSQL is reachable. Returns `stop()` which only shuts the
 * cluster down if this process started it.
 */
export async function ensureDatabase({ quiet = false } = {}) {
  const cfg = readDatabaseConfig();
  const log = (msg) => !quiet && console.log(`\x1b[38;5;143m[db]\x1b[0m ${msg}`);

  if (await isPortOpen(cfg.host, cfg.port)) {
    log(`PostgreSQL already running on ${cfg.host}:${cfg.port}`);
    return { startedHere: false, stop: async () => {} };
  }

  const embeddedAllowed = process.env.EMBEDDED_POSTGRES !== "false" && isLocalHost(cfg.host);
  if (!embeddedAllowed) {
    throw new Error(
      `PostgreSQL is not reachable at ${cfg.host}:${cfg.port}. Start it, or set EMBEDDED_POSTGRES=true with a localhost DATABASE_URL.`,
    );
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    persistent: true,
    onLog: () => {},
    onError: (err) => {
      const text = String(err ?? "");
      if (text.trim()) console.error(`[postgres] ${text.trim()}`);
    },
  });

  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    log("Initialising a new PostgreSQL cluster in ./data/postgres …");
    await pg.initialise();
  }

  await pg.start();

  const client = pg.getPgClient("postgres", "localhost");
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [cfg.database]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${cfg.database.replace(/"/g, "")}"`);
    log(`Created database "${cfg.database}"`);
  }
  await client.end();

  log(`Embedded PostgreSQL listening on localhost:${cfg.port}`);
  return { startedHere: true, stop: () => pg.stop() };
}

/** Stops an embedded cluster that was started by another process. */
export function stopRunningCluster() {
  const pidFile = path.join(DATA_DIR, "postmaster.pid");
  if (!existsSync(pidFile)) return false;
  const pid = Number(readFileSync(pidFile, "utf8").split("\n")[0]);
  if (!pid) return false;
  try {
    process.kill(pid, "SIGINT");
    return true;
  } catch {
    return false;
  }
}

/** Runs a command with inherited stdio and resolves with its exit code. */
export function run(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

/** True when the schema has been migrated and at least one user exists. */
export async function databaseState() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const migrated = await client.query(
      "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS ok",
    );
    if (!migrated.rows[0].ok) return { migrated: false, seeded: false };
    const users = await client.query('SELECT count(*)::int AS n FROM "User"').catch(() => ({ rows: [{ n: 0 }] }));
    return { migrated: true, seeded: users.rows[0].n > 0 };
  } finally {
    await client.end();
  }
}
