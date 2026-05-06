"use client";

/**
 * API Persistence Adapter
 *
 * Implements BuilderPersistence by calling the team builder REST API routes.
 * Used by the dashboard (authenticated) builder.
 */

import type { TablesInsert, TablesUpdate } from "@trainers/supabase";
import type { TeamUpdateData } from "@trainers/validators";

import { teamsApi } from "@/lib/api/teams-client";
import type { BuilderPersistence, ActionResult } from "./types";

// =============================================================================
// Factory
// =============================================================================

interface CreateApiPersistenceOptions {
  /** Called after successful mutations — typically router.refresh() */
  onMutationSuccess: () => void;
}

export function createApiPersistence(
  options: CreateApiPersistenceOptions
): BuilderPersistence {
  return {
    mode: "api",

    async addPokemon(
      teamId: number,
      pokemon: TablesInsert<"pokemon">,
      position: number
    ): Promise<ActionResult<{ pokemonId: number }>> {
      return teamsApi.addPokemon(teamId, pokemon as Record<string, unknown>, position);
    },

    async updatePokemon(
      teamId: number,
      pokemonId: number,
      fields: Partial<TablesUpdate<"pokemon">>
    ): Promise<ActionResult> {
      return teamsApi.updatePokemon(teamId, pokemonId, fields as Record<string, unknown>);
    },

    async removePokemon(teamId: number, pokemonId: number): Promise<ActionResult> {
      return teamsApi.removePokemon(teamId, pokemonId);
    },

    async reorderPokemon(
      teamId: number,
      positions: { pokemonId: number; position: number }[]
    ): Promise<ActionResult> {
      return teamsApi.reorderPokemon(teamId, positions);
    },

    async updateTeam(teamId: number, fields: TeamUpdateData): Promise<ActionResult> {
      return teamsApi.update(teamId, fields as Record<string, unknown>);
    },

    async transferTeam(teamId: number, altId: number): Promise<ActionResult> {
      return teamsApi.transfer(teamId, altId);
    },

    onMutationSuccess: options.onMutationSuccess,
  };
}
