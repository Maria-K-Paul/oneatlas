import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type Database = PrismaClient;

export type CreateClientOptions = {
  /** Upper bound on pooled connections for this process. */
  maxConnections?: number;
};

/**
 * Builds a Prisma client on the node-postgres driver adapter (required by Prisma 7).
 *
 * No `server-only` guard here: the ingestion CLI runs in plain Node and uses this factory too.
 * App code gets the shared instance from `getDb()` in ./instance.ts instead.
 */
export function createPrismaClient(
  connectionString: string,
  { maxConnections }: CreateClientOptions = {},
): Database {
  const adapter = new PrismaPg({ connectionString, max: maxConnections });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
