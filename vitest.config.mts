import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // `server-only` throws outside React Server Components; tests run in plain Node.
  "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
};

/** Unit tests: fast, no database. Integration tests live in vitest.integration.config.mts. */
export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
  },
});
