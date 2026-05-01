"use client";

import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";

// =============================================================================
// TypePill
// =============================================================================

interface TypePillProps {
  t: string;
}

/**
 * Shows a Pokemon type using the same Showdown retro sprite used in move rows.
 */
export function TypePill({ t }: TypePillProps) {
  return (
    <img
      src={getShowdownTypeIconUrl(t)}
      alt={t}
      title={t}
      className="h-6 w-auto [image-rendering:pixelated]"
    />
  );
}
