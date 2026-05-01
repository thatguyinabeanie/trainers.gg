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
 * ISO datetime string accepted by Postgres `timestamptz` columns.
 * Allows null for clearing a previously-set date.
 */
const isoDateTimeOrNullSchema = z
  .string()
  .datetime({ offset: true, message: "Invalid datetime" })
  .nullable();

/**
 * Tournament status values (mirrors the `tournament_status` Postgres enum).
 */
export const tournamentStatusSchema = z.enum([
  "draft",
  "upcoming",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

/**
 * Optional trimmed string with a max length. Whitespace is trimmed before the
 * length check so `"   "` is normalised to `""` and then mapped to
 * `undefined` (i.e., "field omitted"). Mirrors the `optionalHandle` /
 * `optionalUrl` pattern in `organization-request.ts`.
 */
const optionalTrimmedString = (max: number) =>
  z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1).max(max))
    .or(z.literal(""))
    .optional()
    .transform((val) => val || undefined);

/**
 * Schema for updating a tournament.
 *
 * Used at the Server Action boundary (`updateTournament`) to reject crafted
 * requests that bypass the UI's client-side guards (out-of-range player cap,
 * unknown registration types, malformed dates). Every field is optional; an
 * absent key means "leave unchanged" while `null` clears nullable columns.
 */
export const updateTournamentSchema = z.object({
  name: tournamentNameSchema.optional(),
  description: tournamentDescriptionSchema,
  format: optionalTrimmedString(50),
  startDate: isoDateTimeOrNullSchema.optional(),
  endDate: isoDateTimeOrNullSchema.optional(),
  // 4..512 mirrors the input min/max in the settings UI.
  maxParticipants: z.number().int().min(4).max(512).nullable().optional(),
  status: tournamentStatusSchema.optional(),
  // Game settings — kept as strings (DB columns are text); concrete values are
  // managed by `@trainers/pokemon` and may evolve as new games/regs ship.
  game: optionalTrimmedString(50),
  gameFormat: optionalTrimmedString(50),
  platform: z.enum(["cartridge", "showdown"]).optional(),
  battleFormat: z.enum(["singles", "doubles"]).optional(),
  // Registration settings.
  registrationType: z.enum(["open", "invite_only"]).optional(),
  checkInRequired: z.boolean().optional(),
  allowLateRegistration: z.boolean().optional(),
  // 1..10 mirrors the input min/max in the settings UI.
  lateCheckInMaxRound: z.number().int().min(1).max(10).nullable().optional(),
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
