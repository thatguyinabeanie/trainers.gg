import { Factory } from "fishery";
import type { RawSlotRow } from "@trainers/supabase";

// =============================================================================
// RawSlotRow factory
// =============================================================================

/**
 * Raw per-slot input for buildTeamSlotRows (team_slots compile pipeline).
 * Defaults model the minimal limitless-ish shape; override per source:
 * rk9 → division/placement/country/nature, trainers.gg → nature + move1-4 fold.
 */
export const rawSlotFactory = Factory.define<RawSlotRow>(({ sequence }) => ({
  playerKey: `test:standing:${sequence}`,
  division: null,
  placement: null,
  wins: null,
  losses: null,
  ties: null,
  country: null,
  position: 1,
  species: `species-${sequence}`,
  heldItem: null,
  ability: null,
  teraType: null,
  moves: [],
  nature: null,
}));
