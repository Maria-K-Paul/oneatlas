import "server-only";
import { z } from "zod";

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// connection string");

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  /**
   * Max pooled connections per server process. Serverless instances and build workers each
   * open their own pool, so keep this small; the local Prisma dev database needs 1.
   */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Parsed on first use rather than at import,
 * so builds that never touch the database don't need DATABASE_URL.
 * Fails loudly with every problem listed, instead of a confusing driver error later.
 */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid server environment:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}
