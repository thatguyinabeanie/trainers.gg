import { z } from "zod";

import { positiveIntSchema } from "./common";

// =============================================================================
// Primitive schemas
// =============================================================================

/** Team name — trimmed, 1–100 characters. */
export const teamNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1).max(100));

/** Team format — trimmed, 1–50 characters (e.g., "gen9vgc2026regi"). */
export const teamFormatSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1).max(50));

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

/** Input for transferring a team to a different alt. */
export const transferTeamInputSchema = z.object({
  teamId: positiveIntSchema,
  targetAltId: positiveIntSchema,
});

export type TransferTeamInput = z.infer<typeof transferTeamInputSchema>;

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

// =============================================================================
// Pokemon payload schema
// =============================================================================

/** EV field names used for the total EV cap validation. */
const EV_FIELDS = [
  "ev_hp",
  "ev_attack",
  "ev_defense",
  "ev_special_attack",
  "ev_special_defense",
  "ev_speed",
] as const;

/** Allowlisted fields for pokemon create/update payloads from the client. */
export const pokemonPayloadSchema = z
  .object({
    species: z.string().min(1).max(50),
    ability: z.string().max(50).default(""),
    nature: z.string().max(20).default(""),
    held_item: z.string().max(50).nullable().optional(),
    nickname: z.string().max(18).nullable().optional(),
    gender: z.enum(["Male", "Female"]).nullable().optional(),
    level: z.number().int().min(1).max(100).default(50),
    is_shiny: z.boolean().default(false),
    move1: z.string().max(50).default(""),
    move2: z.string().max(50).nullable().optional(),
    move3: z.string().max(50).nullable().optional(),
    move4: z.string().max(50).nullable().optional(),
    tera_type: z.string().max(20).nullable().optional(),
    ev_hp: z.number().int().min(0).max(252).default(0),
    ev_attack: z.number().int().min(0).max(252).default(0),
    ev_defense: z.number().int().min(0).max(252).default(0),
    ev_special_attack: z.number().int().min(0).max(252).default(0),
    ev_special_defense: z.number().int().min(0).max(252).default(0),
    ev_speed: z.number().int().min(0).max(252).default(0),
    iv_hp: z.number().int().min(0).max(31).default(31),
    iv_attack: z.number().int().min(0).max(31).default(31),
    iv_defense: z.number().int().min(0).max(31).default(31),
    iv_special_attack: z.number().int().min(0).max(31).default(31),
    iv_special_defense: z.number().int().min(0).max(31).default(31),
    iv_speed: z.number().int().min(0).max(31).default(31),
    notes: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate that the sum of all EV fields does not exceed the 510 cap.
    const total = EV_FIELDS.reduce((sum, field) => sum + data[field], 0);
    if (total > 510) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total EVs must not exceed 510 (got ${total})`,
        path: ["ev_hp"],
      });
    }
  });

export type PokemonPayload = z.infer<typeof pokemonPayloadSchema>;

/** Update schema — same fields as create but all optional, NO defaults.
 *  Only explicitly provided fields will be written to the DB. */
export const pokemonUpdateSchema = z.object({
  species: z.string().min(1).max(50).optional(),
  ability: z.string().max(50).optional(),
  nature: z.string().max(20).optional(),
  held_item: z.string().max(50).nullable().optional(),
  nickname: z.string().max(18).nullable().optional(),
  gender: z.enum(["Male", "Female"]).nullable().optional(),
  level: z.number().int().min(1).max(100).optional(),
  is_shiny: z.boolean().optional(),
  move1: z.string().max(50).optional(),
  move2: z.string().max(50).nullable().optional(),
  move3: z.string().max(50).nullable().optional(),
  move4: z.string().max(50).nullable().optional(),
  tera_type: z.string().max(20).nullable().optional(),
  ev_hp: z.number().int().min(0).max(252).optional(),
  ev_attack: z.number().int().min(0).max(252).optional(),
  ev_defense: z.number().int().min(0).max(252).optional(),
  ev_special_attack: z.number().int().min(0).max(252).optional(),
  ev_special_defense: z.number().int().min(0).max(252).optional(),
  ev_speed: z.number().int().min(0).max(252).optional(),
  iv_hp: z.number().int().min(0).max(31).optional(),
  iv_attack: z.number().int().min(0).max(31).optional(),
  iv_defense: z.number().int().min(0).max(31).optional(),
  iv_special_attack: z.number().int().min(0).max(31).optional(),
  iv_special_defense: z.number().int().min(0).max(31).optional(),
  iv_speed: z.number().int().min(0).max(31).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type PokemonUpdate = z.infer<typeof pokemonUpdateSchema>;

// =============================================================================
// Team update data schema
// =============================================================================

/** Allowlisted user-editable fields for a team update payload. */
export const teamUpdateDataSchema = z.object({
  name: teamNameSchema.optional(),
  format: teamFormatSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).nullable().optional(),
  is_public: z.boolean().optional(),
});

export type TeamUpdateData = z.infer<typeof teamUpdateDataSchema>;

// =============================================================================
// Team-builder landing Phase 2 schemas
// =============================================================================

/** Flags that can be set on a team (pin, archive, custom sort order). */
export const teamFlagsSchema = z.object({
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().nullable().optional(),
});

export type TeamFlagsInput = z.infer<typeof teamFlagsSchema>;

/** Input for batch-reordering teams via drag-and-drop. */
export const reorderTeamsInputSchema = z
  .array(
    z.object({
      teamId: positiveIntSchema,
      sortOrder: z.number().int(),
    })
  )
  .min(1)
  .max(500);

export type ReorderTeamsInput = z.infer<typeof reorderTeamsInputSchema>;

/** Folder name — trimmed, 1–60 characters. */
export const teamFolderNameSchema = z.string().trim().min(1).max(60);

export type TeamFolderNameInput = z.infer<typeof teamFolderNameSchema>;

/** A list of team IDs for bulk operations (archive, delete, move, etc.). */
export const bulkTeamIdsSchema = z.array(positiveIntSchema).min(1).max(500);

export type BulkTeamIdsInput = z.infer<typeof bulkTeamIdsSchema>;

/**
 * A single predicate in a smart-folder criteria set.
 * Mirrors the client-side `Predicate` union from search-types.ts.
 */
export const smartFolderPredicateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), value: z.string() }),
  z.object({
    kind: z.literal("field"),
    field: z.enum(["name", "species", "ability", "item", "move", "tera"]),
    value: z.string(),
  }),
  z.object({
    kind: z.literal("flag"),
    flag: z.enum(["complete", "incomplete", "legal", "illegal"]),
  }),
  z.object({ kind: z.literal("format"), value: z.string() }),
  z.object({
    kind: z.literal("updated_within"),
    days: z.number().int().positive(),
  }),
]);

export type SmartFolderPredicate = z.infer<typeof smartFolderPredicateSchema>;

/** Persisted criteria for a smart folder — versioned for forward-compatibility. */
export const smartFolderCriteriaSchema = z.object({
  version: z.literal(1),
  predicates: z.array(smartFolderPredicateSchema).max(50),
});

export type SmartFolderCriteria = z.infer<typeof smartFolderCriteriaSchema>;

/** Input for creating a new smart folder. */
export const createSmartFolderInputSchema = z.object({
  name: teamFolderNameSchema,
  criteria: smartFolderCriteriaSchema,
});

export type CreateSmartFolderInput = z.infer<
  typeof createSmartFolderInputSchema
>;

/** Input for updating an existing smart folder — all fields optional. */
export const updateSmartFolderInputSchema = z.object({
  name: teamFolderNameSchema.optional(),
  criteria: smartFolderCriteriaSchema.optional(),
});

export type UpdateSmartFolderInput = z.infer<
  typeof updateSmartFolderInputSchema
>;
