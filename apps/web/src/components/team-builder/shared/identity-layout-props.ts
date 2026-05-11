"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Shared prop interface for all three IdentityLane layout components.
// Consumed by IdentitySingleRow, IdentityMidStack, and IdentityVertical.
// =============================================================================

// Filters sibling pokemon to only those with a valid species string.
export function filterCurrentTeam(
  siblings: { species: string | null }[] | undefined
): { species: string }[] {
  return (siblings ?? []).filter(
    (p): p is { species: string } =>
      typeof p.species === "string" && p.species.length > 0
  );
}

export interface IdentityLayoutProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  /** Sibling pokemon with populated species — used for synergy hints in the species picker. */
  currentTeam: { species: string }[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  fieldErrors: ValidationError[];
}
