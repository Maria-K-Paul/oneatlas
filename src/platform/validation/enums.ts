import { z } from "zod";

/**
 * Database enums are UPPER_SNAKE (`TOOL_CALLING`). The public API and URLs use lower_snake
 * (`tool_calling`): friendlier to type, and it keeps the API contract independent of the schema.
 */
export function toPublicEnum<T extends string>(value: T): Lowercase<T> {
  return value.toLowerCase() as Lowercase<T>;
}

export type PublicEnum<T extends string> = {
  /** Public values, in schema order. */
  values: Lowercase<T>[];
  /** Validates a public value and returns the database value. */
  schema: z.ZodType<T, string>;
  toPublic: (value: T) => Lowercase<T>;
};

/** Builds the public ↔ database mapping for a Prisma enum object, e.g. `publicEnum(Capability)`. */
export function publicEnum<T extends string>(dbEnum: Record<string, T>): PublicEnum<T> {
  const dbValues = Object.values(dbEnum);
  const values = dbValues.map(toPublicEnum);
  const byPublic = new Map(dbValues.map((value) => [toPublicEnum(value) as string, value]));

  const schema = z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => byPublic.has(value), {
      error: `Expected one of: ${values.join(", ")}`,
    })
    .transform((value) => byPublic.get(value) as T);

  return { values, schema, toPublic: toPublicEnum };
}
