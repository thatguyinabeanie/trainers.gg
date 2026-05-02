"use client";

import { useState } from "react";

import {
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  getSpeciesTypes,
  getLegalAbilities,
  legalSetOrPermissive,
  NATURE_EFFECTS,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { NatureChevrons } from "../nature-chevrons";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { TypePicker } from "../pickers/type-picker";
import { formatSupportsTera } from "../format-gating";
import { FormChip } from "../lanes/form-chip";
import { MegaToggle } from "./mega-toggle";

// =============================================================================
// Types
// =============================================================================

export interface DefenderMonHeaderProps {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  format: GameFormat | undefined;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
  /** Per-calc toggle: simulate defender as mega vs base form. */
  defenderMegaActive: boolean;
  setDefenderMegaActive: (v: boolean) => void;
}

// =============================================================================
// DefenderMonHeader
// =============================================================================

/**
 * Identity section for the damage calc defender panel.
 *
 * Vertical-stack layout: species pill, sprite, type pills, then Item / Ability /
 * Nature / Tera formRows below the sprite. Sits as the left lane of the defender
 * column with the spread stats lane to its right.
 *
 * The "vs Attacker · HP" badge lives in the parent panel header, not here.
 */
export function DefenderMonHeader({
  defenderSpecies,
  defenderAbility,
  defenderItem,
  defenderNature,
  defenderTera,
  format,
  setDefenderSpecies,
  setDefenderAbility,
  setDefenderItem,
  setDefenderNature,
  setDefenderTera,
  defenderMegaActive,
  setDefenderMegaActive,
}: DefenderMonHeaderProps) {
  const showTera = formatSupportsTera(format);
  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];

  // Mega-aware ability display. The team-sheet column stores the BASE
  // ability (legality requirement); the calc engine uses the mega's
  // post-evolution ability for damage. Show both when species is a mega.
  const megaAbility = defenderSpecies
    ? getMegaAbilityForSpecies(defenderSpecies)
    : null;
  const isMegaForm = megaAbility !== null;
  const baseSpecies = defenderSpecies
    ? getCanonicalBaseSpecies(defenderSpecies)
    : "";
  // Picker is scoped to the BASE form so the user keeps editing the
  // tournament-relevant ability — not the mega's intrinsic ability.
  const pickerSpecies = isMegaForm ? baseSpecies : defenderSpecies;
  const displayAbility =
    isMegaForm && defenderMegaActive ? megaAbility : defenderAbility;

  const hasLegalAbility =
    !defenderSpecies ||
    !format ||
    (legalSetOrPermissive(getLegalAbilities(pickerSpecies, format.id))?.size ??
      1) > 0;

  const natureEffect = defenderNature ? NATURE_EFFECTS[defenderNature] : null;
  const natUp = natureEffect?.boost ?? null;
  const natDown = natureEffect?.reduce ?? null;

  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex w-60 shrink-0 flex-col gap-1.5 border-r p-2">
      {/* Species pill + mega toggle (when applicable) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "border-border bg-background hover:border-primary focus-visible:border-primary",
            "flex min-w-0 flex-1 items-center gap-1 rounded-md border px-2 py-1 text-left text-[11.5px]",
            "outline-none transition-colors"
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              defenderSpecies
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
            title={defenderSpecies || undefined}
          >
            {defenderSpecies || "Choose species…"}
          </span>
          <span aria-hidden className="text-[9px] text-muted-foreground">
            ▾
          </span>
        </button>

        <SpeciesPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          value={defenderSpecies}
          format={format}
          onPick={(species) => setDefenderSpecies(species)}
        />

        {isMegaForm && (
          <MegaToggle
            active={defenderMegaActive}
            onToggle={() => setDefenderMegaActive(!defenderMegaActive)}
          />
        )}
      </div>

      {/* Sprite — centered in the lane */}
      <div className="mx-auto size-24 shrink-0 overflow-hidden rounded-md">
        <Sprite
          species={defenderSpecies || "Incineroar"}
          types={types}
          size={96}
        />
      </div>

      {types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <TypePill key={t} t={t} />
          ))}
        </div>
      )}

      <FormChip label="Item" value={defenderItem}>
        <ItemPicker
          value={defenderItem}
          format={format}
          teamItems={[]}
          onPick={(item) => setDefenderItem(item)}
          onClose={() => undefined}
        />
      </FormChip>

      {/* Ability — when species is a mega and the toggle is on, the picker
          edits the BASE ability (stored) but the row's primary value shows
          the post-evolution ability for clarity. The base ability is shown
          as a small secondary line for tournament transparency. */}
      <FormChip
        label="Abil"
        value={displayAbility}
        trailing={
          isMegaForm && defenderMegaActive ? (
            <span className="shrink-0 whitespace-nowrap font-mono text-[9px] text-muted-foreground/70">
              base: {defenderAbility || "—"}
            </span>
          ) : null
        }
      >
        <AbilityPicker
          value={defenderAbility}
          species={pickerSpecies}
          format={format}
          onPick={(ability) => setDefenderAbility(ability)}
          onClose={() => undefined}
        />
      </FormChip>

      {/* Nature — passes nature ±chevrons as the trailing element */}
      <FormChip
        label="Nat"
        value={defenderNature}
        trailing={
          <NatureChevrons boost={natUp} reduce={natDown} className="shrink-0" />
        }
      >
        <NaturePicker
          value={defenderNature}
          onPick={(nat) => setDefenderNature(nat)}
          onClose={() => undefined}
        />
      </FormChip>

      {showTera && (
        <FormChip label="Tera" value={defenderTera}>
          <TypePicker
            value={defenderTera}
            onPick={(type) => setDefenderTera(type)}
            onClose={() => undefined}
          />
        </FormChip>
      )}

      {!hasLegalAbility && (
        <p className="px-1 font-mono text-[9px] text-muted-foreground/60">
          No abilities found for format
        </p>
      )}
    </div>
  );
}
