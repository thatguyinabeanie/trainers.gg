"use client";

import { useState } from "react";
import { Hammer } from "lucide-react";
import { toast } from "sonner";

import { type SpeciesUsagePeriod } from "@trainers/supabase";
import { exportPokemonToShowdown } from "@trainers/pokemon";
import { type PokemonSetFlat } from "@trainers/pokemon";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a partial Showdown paste from the most-used set in a `SpeciesUsagePeriod`.
 *
 * Fills:
 *  - species (required)
 *  - held item (modal — first entry from `items`, if any)
 *  - ability (modal — first entry from `abilities`, if any)
 *  - tera type (modal — first entry from `tera`, if any)
 *  - moves (top ≤4 from `moves`, if any)
 *
 * Intentionally leaves EVs **blank** (all 0) to honour the no-private-data
 * boundary: EVs are builder-private data, not public tournament data.
 * IVs default to 31.
 *
 * Nature defaults to "Hardy" when none is available (neutral nature, no stat
 * change — better than omitting the line entirely which confuses some tools).
 */
export function speciesDetailToShowdownPaste(
  species: string,
  detail: SpeciesUsagePeriod
): string {
  const modalItem = detail.items[0]?.value ?? undefined;
  // Empty (not "No Ability") when usage has no ability data: the builder's
  // import legality check skips empty abilities but would reject the literal
  // "No Ability" string as illegal for most species.
  const modalAbility = detail.abilities[0]?.value ?? "";
  const modalTera = detail.tera[0]?.value ?? undefined;
  const modalNature = detail.natures[0]?.value ?? "Hardy";

  // Top 4 moves (the most-used individual moves, not a joint combination).
  const topMoves = detail.moves.slice(0, 4).map((m) => m.value);
  const [move1, move2, move3, move4] = topMoves;

  const flat: PokemonSetFlat = {
    species,
    ability: modalAbility,
    nature: modalNature,
    heldItem: modalItem,
    teraType: modalTera,
    level: 50,
    isShiny: false,
    formatLegal: true,
    // Empty (not "Tackle") when usage has no move data: a placeholder move can
    // be illegal for the species/format and fail import; empty is skipped.
    move1: move1 ?? "",
    move2,
    move3,
    move4,
    // EVs intentionally blank — public tournament data boundary.
    evHp: 0,
    evAttack: 0,
    evDefense: 0,
    evSpecialAttack: 0,
    evSpecialDefense: 0,
    evSpeed: 0,
    // IVs default to perfect.
    ivHp: 31,
    ivAttack: 31,
    ivDefense: 31,
    ivSpecialAttack: 31,
    ivSpecialDefense: 31,
    ivSpeed: 31,
  };

  return exportPokemonToShowdown(flat);
}

// =============================================================================
// BuildThisButton
// =============================================================================

interface BuildThisButtonProps {
  /** The species slug (e.g. "koraidon"). */
  species: string;
  /**
   * The latest usage period — source of modal item/ability/tera/moves.
   * When null the button is disabled (no data yet).
   */
  detail: SpeciesUsagePeriod | null;
  className?: string;
}

/**
 * "Build this" button for the per-species drill-down.
 *
 * Clicking the button constructs a single-Pokemon Showdown paste from the
 * modal (most-used) item, ability, tera type, and top 4 moves in the current
 * period. EVs are left blank — they are private builder data, not public
 * tournament data (see the Hard Constraint in `working-with-usage-data`).
 *
 * The paste is copied to the clipboard and a toast is shown that links to
 * `/dashboard` so the user can navigate to their team builder and paste it via
 * the existing "Import paste" flow. This approach:
 * - Requires no auth on the analytics side (no user/alt lookup needed).
 * - Re-uses the existing Showdown import path without modification.
 * - Stays purely frontend — no new backend data needed.
 */
export function BuildThisButton({
  species,
  detail,
  className,
}: BuildThisButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleBuildThis() {
    if (!detail) return;

    const paste = speciesDetailToShowdownPaste(species, detail);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast.success("Copied to clipboard!", {
        description:
          "Head to your team builder and use Import paste to add this Pokémon. EVs are intentionally blank — fill them yourself.",
        action: {
          label: "Open builder",
          onClick: () => {
            window.open("/dashboard", "_blank", "noopener");
          },
        },
        duration: 6000,
      });
    } catch {
      // Clipboard unavailable — fall back to a toast with the paste inline
      toast.error(
        "Clipboard unavailable. Copy this manually and paste it into the builder.",
        { description: paste, duration: 15000 }
      );
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBuildThis}
      disabled={!detail}
      className={cn("gap-1.5", className)}
    >
      <Hammer className="size-3.5" />
      {copied ? "Copied!" : "Build this"}
    </Button>
  );
}
