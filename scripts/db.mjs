#!/usr/bin/env node
// Database utility.
//   node scripts/db.mjs start          → run PostgreSQL in the foreground
//   node scripts/db.mjs stop           → stop a cluster started elsewhere
//   node scripts/db.mjs run -- <cmd>   → ensure PostgreSQL, run <cmd>, clean up
import { ensureDatabase, loadEnv, run, stopRunningCluster } from "./lib/database.mjs";

loadEnv();

const [command, ...rest] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "start": {
      const db = await ensureDatabase();
      if (!db.startedHere) return;
      console.log("Press Ctrl+C to stop.");
      const shutdown = async () => {
        await db.stop();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      setInterval(() => {}, 1 << 30);
      return;
    }

    case "stop": {
      console.log(stopRunningCluster() ? "Stopping PostgreSQL…" : "No running embedded cluster found.");
      return;
    }

    case "run": {
      const args = rest[0] === "--" ? rest.slice(1) : rest;
      if (args.length === 0) throw new Error("Usage: node scripts/db.mjs run -- <command> [...args]");
      const db = await ensureDatabase();
      const code = await run(args[0], args.slice(1));
      await db.stop();
      process.exit(code);
    }

    default:
      console.log("Usage: node scripts/db.mjs <start|stop|run>");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
