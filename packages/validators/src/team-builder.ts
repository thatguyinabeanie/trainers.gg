import { z } from "zod";

import { positiveIntSchema } from "./common";

// =============================================================================
// Primitive schemas
// =============================================================================

/** Team name — trimmed, 1–100 characters. */
export const teamNameSchema = z.string().trim().min(1).max(100);

/** Team format — at least 1 character, max 50 characters. */
export const teamFormatSchema = z.string().min(1).max(50);

// =============================================================================
// Team CRUD schemas
// =============================================================================

/** Input for creating a new team. */
export const createTeamInputSchema = z.object({
  altId: positiveIntSchema,
  name: teamNameSchema,
  format: teamFormatSchema,
});

export type CreateTeamInput = z.infer<typeof createTeamInputSchema>;

/** Input for updating a team — only validates the team id. */
export const updateTeamInputSchema = z.object({
  teamId: positiveIntSchema,
});

/** Input for deleting a team. */
export const deleteTeamInputSchema = z.object({
  teamId: positiveIntSchema,
});

/** Input for forking a team. */
export const forkTeamInputSchema = z.object({
  sourceTeamId: positiveIntSchema,
  targetAltId: positiveIntSchema,
  newName: teamNameSchema.optional(),
});

export type ForkTeamInput = z.infer<typeof forkTeamInputSchema>;

// =============================================================================
// Pokemon CRUD schemas
// =============================================================================

/** Input for adding a pokemon to a team — validates team id and position only.
 *  The pokemon data shape is DB-controlled and passed through unchanged. */
export const addPokemonInputSchema = z.object({
  teamId: positiveIntSchema,
  position: z.number().int().min(1).max(6),
});

export type AddPokemonInput = z.infer<typeof addPokemonInputSchema>;

/** Input for updating a pokemon — validates pokemon id only.
 *  The pokemon data shape is DB-controlled and passed through unchanged. */
export const updatePokemonInputSchema = z.object({
  pokemonId: positiveIntSchema,
});

/** Input for removing a pokemon from a team. */
export const removePokemonInputSchema = z.object({
  teamId: positiveIntSchema,
  pokemonId: positiveIntSchema,
});

/** Single position entry for reorder operations. */
export const teamPositionSchema = z.object({
  pokemonId: positiveIntSchema,
  position: z.number().int().min(1).max(6),
});

/** Input for reordering pokemon within a team. */
export const reorderTeamPokemonInputSchema = z.object({
  teamId: positiveIntSchema,
  positions: z.array(teamPositionSchema).min(1).max(6),
});

export type ReorderTeamPokemonInput = z.infer<
  typeof reorderTeamPokemonInputSchema
>;
