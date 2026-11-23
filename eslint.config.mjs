import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Module boundaries — see docs/ARCHITECTURE.md §13.3.
 *
 * Code outside a module reaches it only through its public files:
 *   @/modules/<name>          client-safe surface (components, types)
 *   @/modules/<name>/server   server-only surface (service functions)
 * Inside a module, use relative imports.
 */
const moduleInternals = {
  group: ["@/modules/*/*", "!@/modules/*/server", "@/modules/*/server/*"],
  message:
    "Import a feature module through its public surface: '@/modules/<name>' or '@/modules/<name>/server'.",
};

/** Only module server code, the platform layer and the ingestion scripts may touch the database. */
const databaseAccess = {
  group: [
    "@/generated/prisma/client",
    "@/generated/prisma/client/*",
    "@/platform/db",
    "@/platform/db/*",
  ],
  message:
    "Only module server code (src/modules/*/server) may query the database. Call a service function instead.",
};

/** The platform layer is the bottom of the dependency graph: it must not import feature modules. */
const platformIndependence = {
  group: ["@/modules/*", "@/modules/*/*"],
  message: "src/platform must not depend on feature modules.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
  {
    rules: {
      // `const { origin: _origin, ...rest } = x` drops a field on purpose.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    settings: {
      // The cycle check would otherwise parse the (very large) generated Prisma client on every run.
      "import/ignore": ["node_modules", "src[\\\\/]generated"],
    },
    rules: {
      "no-restricted-imports": ["error", { patterns: [moduleInternals, databaseAccess] }],
      "import/no-cycle": ["error", { ignoreExternal: true }],
    },
  },
  {
    files: ["src/modules/*/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [moduleInternals] }],
    },
  },
  {
    files: ["src/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [platformIndependence] }],
    },
  },
]);

export default eslintConfig;
