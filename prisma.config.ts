import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (generate, migrate, studio).
 *
 * Migrations need a direct, non-pooled connection, so DIRECT_URL wins when it is set.
 * The running app connects separately in src/platform/db, using the pooled DATABASE_URL.
 * `generate` needs no connection, so a missing URL is allowed here (CI and Docker builds).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx scripts/ingest/index.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
