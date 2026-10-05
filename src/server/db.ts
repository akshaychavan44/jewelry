import "server-only";

import { createNeonDbClient } from "./db/neon-client";
import type { PrismaClient } from "@/generated/prisma/client";

// One client per server process. In development, Next.js re-evaluates modules
// on every change, so the instance is cached on globalThis to avoid exhausting
// the connection pool.
const globalForNeon = globalThis as unknown as { neonDb?: PrismaClient };

function createClient(): PrismaClient {
  return createNeonDbClient() as unknown as PrismaClient;
}

export const db: PrismaClient = globalForNeon.neonDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForNeon.neonDb = db;
}

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
export { neon, Pool } from "@neondatabase/serverless";
