import { Factory } from "fishery";
import type { PipelineSpeciesData, UsageDetailEntry } from "@trainers/supabase";

// =============================================================================
// UsageDetailEntry helpers
// =============================================================================

function emptyDetail(): UsageDetailEntry[] {
  return [];
}

// =============================================================================
// PipelineSpeciesData factory
// =============================================================================

export const pipelineSpeciesFactory = Factory.define<PipelineSpeciesData>(
  ({ sequence }) => ({
    species: `Species${sequence}`,
    usagePct: Math.max(1, 70 - sequence * 2),
    rank: sequence,
    abilities: emptyDetail(),
    items: emptyDetail(),
    natures: emptyDetail(),
    moves: emptyDetail(),
  })
);
