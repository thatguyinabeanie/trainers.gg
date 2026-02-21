import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";
import { positiveIntSchema } from "./common";

/**
 * Schema for tournament name validation.
 * Used in tournament creation and updates.
 */
export const tournamentNameSchema = z
  .string()
  .min(1, "Tournament name is required")
  .min(3, "Name must be at least 3 characters")
  .max(100, "Name must be at most 100 characters")
  .refine((val) => !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  });

/**
 * Schema for tournament description validation.
 */
export const tournamentDescriptionSchema = z
  .string()
  .max(1000, "Description must be at most 1000 characters")
  .refine((val) => !val || !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  })
  .optional();

/**
 * Schema for tournament slug validation.
 */
export const tournamentSlugSchema = z
  .string()
  .min(1, "URL slug is required")
  .max(100, "URL slug must be at most 100 characters")
  .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed")
  .refine((val) => !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  });

/**
 * Schema for creating a tournament.
 * Includes name, slug, and optional description.
 */
export const createTournamentSchema = z.object({
  name: tournamentNameSchema,
  slug: tournamentSlugSchema,
  description: tournamentDescriptionSchema,
});

/**
 * Schema for updating a tournament.
 */
export const updateTournamentSchema = z.object({
  name: tournamentNameSchema.optional(),
  description: tournamentDescriptionSchema,
});

/**
 * Drop category for removing players from tournaments.
 * Replaces manual `validCategories.includes()` checks.
 */
export const dropCategorySchema = z.enum([
  "no_show",
  "conduct",
  "disqualification",
  "other",
]);

/**
 * Optional notes when dropping a player.
 */
export const dropNotesSchema = z.string().max(2000).optional();

/**
 * Schema for tournament registration requests.
 */
export const tournamentRegistrationSchema = z.object({
  altId: positiveIntSchema,
});

// Types
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type DropCategory = z.infer<typeof dropCategorySchema>;
export type TournamentRegistrationInput = z.infer<
  typeof tournamentRegistrationSchema
>;
