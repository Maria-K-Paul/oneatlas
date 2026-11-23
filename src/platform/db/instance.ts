import "server-only";
import { serverEnv } from "@/platform/env";
import { createPrismaClient, type Database } from "./client";

/**
 * One Prisma client (and one connection pool) per server process.
 *
 * Kept on globalThis because Next.js hot reload re-evaluates modules in development;
 * without this, every edit would open a new pool until Postgres ran out of connections.
 * Created lazily so that importing this module never requires DATABASE_URL at build time.
 */
const globalForDb = globalThis as unknown as { oneatlasDb?: Database };

export function getDb(): Database {
  const env = serverEnv();
  globalForDb.oneatlasDb ??= createPrismaClient(env.DATABASE_URL, {
    maxConnections: env.DATABASE_POOL_MAX,
  });
  return globalForDb.oneatlasDb;
}
