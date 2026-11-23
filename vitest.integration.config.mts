import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests: run against a real Postgres at TEST_DATABASE_URL (never the dev database).
 * Locally, `docker compose up -d db` creates `oneatlas_test`; in CI it's a service container.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    fileParallelism: false, // tests share one database
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
