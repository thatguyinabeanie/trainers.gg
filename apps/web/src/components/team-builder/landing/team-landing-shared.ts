/**
 * Team Landing — shared types & helpers
 *
 * Cross-sibling contract for the /builder landing components (team-row,
 * teams-landing-client). Per the nextjs-conventions "sibling components must not
 * import from each other" rule, shared symbols live here and both siblings
 * import from this module.
 */

import { type LocalDraftRecord } from "../persistence/local-drafts-types";

/** Up-to-6 species slots used to render a row's sprite strip. */
export interface DraftSpeciesSlot {
  species: string | null;
  isShiny: boolean;
}

/** Display-ready summary of a local draft for the landing list. */
export interface LocalDraftSummary {
  id: string;
  name: string;
  format: string | null;
  /** Count of filled (non-null species) team_pokemon slots, 0-6. */
  filledCount: number;
  /** Species slots ordered by team_position, filled slots only. */
  species: DraftSpeciesSlot[];
  updatedAt: string;
}

/** Default display name for an unnamed draft. */
export const UNTITLED_DRAFT_NAME = "Untitled Team";

/** Derive a display-ready summary from a stored draft record. */
export function toDraftSummary(record: LocalDraftRecord): LocalDraftSummary {
  const filled = record.team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position);
  return {
    id: record.id,
    name: record.team.name?.trim() || UNTITLED_DRAFT_NAME,
    format: record.team.format,
    filledCount: filled.length,
    species: filled.map((tp) => ({
      species: tp.pokemon?.species ?? null,
      isShiny: tp.pokemon?.is_shiny ?? false,
    })),
    updatedAt: record.updatedAt,
  };
}

/** Build the editor route href for a draft id. */
export function draftEditorHref(id: string): string {
  return `/builder/t/${id}`;
}

/** Props for the name-first TeamRow on the landing. */
export interface TeamRowProps {
  summary: LocalDraftSummary;
  /** Delete this draft (handled by the row's overflow menu). */
  onDelete?: (id: string) => void;
}
