"use client";

import { useRef } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../../validation-hooks";
import { useContainerCompact } from "../../use-container-compact";
import { useTeamLayoutMode } from "../../use-team-layout";
import { IdentityLaneGhost } from "./identity-lane-ghost";
import { filterCurrentTeam } from "./identity-layout-props";
import { IdentityMidStack } from "./identity-mid-stack";
import { IdentitySingleRow } from "./identity-single-row";
import { IdentityVertical } from "./identity-vertical";

// =============================================================================
// Types
// =============================================================================

interface IdentityLaneProps {
  pokemon: Tables<"pokemon"> | null;
  format?: GameFormat;
  /** Held items from sibling pokemon — passed to ItemPicker for dup warning. */
  teamItems?: string[];
  onUpdate?: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to identity + loadout fields. */
  fieldErrors?: ValidationError[];
  /** Sibling pokemon on the same team — used for species-picker synergy hints. */
  teamSiblings?: { species: string }[];
}

// =============================================================================
// IdentityLane — public dispatcher
//
// Reads isCompact from the slot container width and layoutMode from context,
// then mounts exactly one of the three layout components:
//
//   IdentitySingleRow  — slot ≥ 1240px (compact)
//   IdentityMidStack   — slot < 1240px, non-vertical mode
//   IdentityVertical   — slot < 1240px, vertical mode
//
// Falls back to <IdentityLaneGhost /> when pokemon == null.
// =============================================================================

export function IdentityLane({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors = [],
}: IdentityLaneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerCompact = useContainerCompact(rootRef);

  const layoutMode = useTeamLayoutMode();
  const isVertical = layoutMode.endsWith("-vertical");
  // In 1x6 mode, always use compact (single-row) layout immediately — don't
  // wait for ResizeObserver to confirm width, which causes a 1-frame flash.
  const isCompact = layoutMode === "1x6" || containerCompact;

  const currentTeam = filterCurrentTeam(teamSiblings);

  const sharedProps = {
    format,
    teamItems: teamItems ?? [],
    currentTeam,
    onUpdate: onUpdate ?? (() => {}),
    fieldErrors,
  };

  return (
    <div ref={rootRef} className="contents">
      {!pokemon ? (
        <IdentityLaneGhost variant={isCompact ? "compact" : isVertical ? "vertical" : "mid"} />
      ) : isCompact ? (
        <IdentitySingleRow pokemon={pokemon} {...sharedProps} />
      ) : isVertical ? (
        <IdentityVertical pokemon={pokemon} {...sharedProps} />
      ) : (
        <IdentityMidStack pokemon={pokemon} {...sharedProps} />
      )}
    </div>
  );
}
