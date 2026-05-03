"use client";

import { useRef } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../../../validation-hooks";
import { useContainerCompact } from "../../use-container-compact";
import { useTeamLayoutMode } from "../../use-team-layout";
import { IdentityLaneGhost } from "./identity-lane-ghost";
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
//   IdentityVertical   — slot < 1240px, vertical mode (step 8 — dead branch)
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
  const isCompact = useContainerCompact(rootRef);

  const layoutMode = useTeamLayoutMode();
  const isVertical = layoutMode.endsWith("-vertical");

  const sharedProps = {
    format,
    teamItems: teamItems ?? [],
    teamSiblings: teamSiblings ?? [],
    onUpdate: onUpdate ?? (() => {}),
    fieldErrors,
  };

  return (
    <div ref={rootRef} className="contents">
      {!pokemon ? (
        <IdentityLaneGhost />
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
