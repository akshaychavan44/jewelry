import "server-only";

import { createNeonDbClient } from "./db/neon-client";
import type { NeonDbClient } from "@/server/db/db-types";

// One client per server process. In development, Next.js re-evaluates modules
// on every change, so the instance is cached on globalThis to avoid exhausting
// the connection pool.
const globalForNeon = globalThis as unknown as { neonDb?: NeonDbClient };

function createClient(): NeonDbClient {
  return createNeonDbClient() as unknown as NeonDbClient;
}

export const db: NeonDbClient = globalForNeon.neonDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForNeon.neonDb = db;
}

export type Db = typeof db;
export type Tx = NeonDbClient;
export { neon, Pool } from "@neondatabase/serverless";

