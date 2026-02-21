import { z } from "zod";

/**
 * Coerces a string to a positive integer.
 * Replaces manual `parseInt(x, 10)` + `isNaN()` patterns.
 */
export const positiveIntSchema = z.coerce
  .number()
  .int("Must be an integer")
  .positive("Must be a positive number");

/**
 * Validates a UUID string.
 */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

/**
 * PDS account status values.
 */
export const pdsStatusSchema = z.enum([
  "pending",
  "active",
  "failed",
  "suspended",
  "external",
]);

// Types
export type PdsStatus = z.infer<typeof pdsStatusSchema>;
