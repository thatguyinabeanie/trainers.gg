/**
 * Quick-Look Peek — shared types & `toQuickLookData` helper
 *
 * Types consumed by both the desktop HoverCard (`quick-look.tsx`) and the
 * mobile bottom-sheet (`quick-look-sheet.tsx`). JSX lives in those files;
 * only plain TypeScript belongs here.
 *
 * Per the nextjs-conventions "sibling components must not import from each
 * other" rule, shared symbols live here and all siblings import from this
 * module.
 */

import { type LocalDraftRecord } from "../persistence/local-drafts-types";

// =============================================================================
// Types
// =============================================================================

/** Per-slot data shown in the quick-look peek. */
export interface QuickLookSlot {
  species: string | null;
  isShiny: boolean;
  ability: string | null;
  heldItem: string | null;
  teraType: string | null;
  /** Non-null moves in order (move1..move4), empty strings excluded. */
  moves: string[];
}

/** Full data needed to render a quick-look peek for one draft. */
export interface QuickLookData {
  id: string;
  name: string;
  format: string | null;
  /** Filled slots only (pokemon !== null), ordered by team_position. */
  slots: QuickLookSlot[];
}

// =============================================================================
// Helper
// =============================================================================

/**
 * Derive a `QuickLookData` from a stored `LocalDraftRecord`.
 *
 * - Includes only filled slots (where `pokemon !== null`).
 * - Slots are ordered by `team_position` ascending.
 * - `moves` contains only the non-null, non-empty move strings (move1..move4).
 */
export function toQuickLookData(record: LocalDraftRecord): QuickLookData {
  const filled = record.team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position);

  const slots: QuickLookSlot[] = filled.map((tp) => {
    const p = tp.pokemon!;
    const moves = [p.move1, p.move2, p.move3, p.move4].filter(
      (m): m is string => typeof m === "string" && m.length > 0
    );
    return {
      species: p.species ?? null,
      isShiny: p.is_shiny ?? false,
      ability: p.ability ?? null,
      heldItem: p.held_item ?? null,
      teraType: p.tera_type ?? null,
      moves,
    };
  });

  return {
    id: record.id,
    name: record.team.name?.trim() || "Untitled Team",
    format: record.team.format,
    slots,
  };
}
