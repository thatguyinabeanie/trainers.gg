"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../../../validation-hooks";

// =============================================================================
// Shared prop interface for all three IdentityLane layout components.
// Consumed by IdentitySingleRow, IdentityMidStack, and IdentityVertical.
// =============================================================================

export interface IdentityLayoutProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  teamSiblings: { species: string }[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  fieldErrors: ValidationError[];
}
