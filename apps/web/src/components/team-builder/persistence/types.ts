/**
 * Builder Persistence Types
 *
 * Defines the persistence adapter interface that decouples the builder UI
 * from its data storage strategy. Two implementations exist:
 * - ApiPersistence: calls REST API routes (dashboard builder, authenticated)
 * - LocalPersistence: manages local state + localStorage (public builder, anonymous)
 */

import type { TablesInsert, TablesUpdate, TeamWithPokemon } from "@trainers/supabase";
import type { TeamUpdateData } from "@trainers/validators";

// =============================================================================
// ActionResult (client-side mirror)
// =============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Persistence Interface
// =============================================================================

export interface BuilderPersistence {
  /** Whether this adapter operates locally or via API. */
  mode: "local" | "api";

  /** Add a pokemon to the team at the given position. */
  addPokemon(
    teamId: number,
    pokemon: TablesInsert<"pokemon">,
    position: number
  ): Promise<ActionResult<{ pokemonId: number }>>;

  /** Update a pokemon's fields (partial update). */
  updatePokemon(
    teamId: number,
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ): Promise<ActionResult>;

  /** Remove a pokemon from the team. */
  removePokemon(teamId: number, pokemonId: number): Promise<ActionResult>;

  /** Reorder pokemon positions within the team. */
  reorderPokemon(
    teamId: number,
    positions: { pokemonId: number; position: number }[]
  ): Promise<ActionResult>;

  /** Update team metadata (name, format, etc.). */
  updateTeam(teamId: number, fields: TeamUpdateData): Promise<ActionResult>;

  /** Transfer the team to another alt (only available in API mode). */
  transferTeam?: (teamId: number, altId: number) => Promise<ActionResult>;

  /**
   * Called after a successful mutation.
   * API mode: triggers router.refresh() to sync server state.
   * Local mode: no-op (state is already up to date).
   */
  onMutationSuccess: () => void;
}

// =============================================================================
// Local Team Shape
// =============================================================================

/**
 * Shape of a locally-stored team for the public builder.
 * Uses the same TeamWithPokemon shape but with synthetic negative IDs.
 */
export interface LocalTeamData {
  team: TeamWithPokemon;
  /** ISO timestamp of last modification */
  updatedAt: string;
  /** Schema version for future migrations */
  version: 1;
}
