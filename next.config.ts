import type { NextConfig } from "next";

/**
 * Build workers each open their own database pool while prerendering. NEXT_BUILD_CPUS caps them,
 * for databases with few connection slots, such as the local Prisma dev database. Leave it
 * unset on Vercel + Neon.
 */
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  ...(buildCpus ? { experimental: { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
