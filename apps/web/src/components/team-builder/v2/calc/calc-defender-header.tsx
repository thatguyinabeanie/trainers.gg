"use client";

import { useState } from "react";

import {
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  getMegaSpeciesForBaseAndItem,
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
 * Mirrors the vertical PokeRow card identity layout:
 * - Sprite left (140px basis) with species picker pill below
 * - Item / Ability / Nature / Tera fields to the right of sprite
 * - Type pills below the sprite section
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

  const megaAbility = defenderSpecies
    ? getMegaAbilityForSpecies(defenderSpecies)
    : null;
  const isMegaForm = megaAbility !== null;
  const baseSpecies = defenderSpecies
    ? getCanonicalBaseSpecies(defenderSpecies)
    : "";
  // Also detect when base species is holding its mega stone
  const megaFromItem = defenderSpecies
    ? getMegaSpeciesForBaseAndItem(defenderSpecies, defenderItem)
    : null;
  const megaAbilityFromItem = megaFromItem
    ? getMegaAbilityForSpecies(megaFromItem)
    : null;
  // Show mega toggle if species IS mega OR if holding its mega stone
  const canMega = isMegaForm || megaFromItem !== null;
  const activeMegaAbility = isMegaForm ? megaAbility : megaAbilityFromItem;
  const pickerSpecies = isMegaForm ? baseSpecies : defenderSpecies;
  const displayAbility =
    canMega && defenderMegaActive && activeMegaAbility
      ? activeMegaAbility
      : defenderAbility;

  // Show mega types when active
  const displaySpeciesForTypes =
    canMega && defenderMegaActive
      ? (megaFromItem ?? defenderSpecies)
      : defenderSpecies;
  const types = displaySpeciesForTypes
    ? getSpeciesTypes(displaySpeciesForTypes)
    : [];

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
    <div className="flex w-full flex-col border-b border-dashed border-border">
      {/* Sprite + Meta fields — centered together, fixed height to avoid layout shift */}
      <div className="flex min-h-[160px] min-w-0 flex-row items-center justify-center gap-2 px-2.5 py-2">
        {/* Sprite — left of form */}
        <div className="shrink-0">
          <Sprite
            species={displaySpeciesForTypes || "Floette-Eternal"}
            types={types}
            size={140}
          />
        </div>

        {/* Meta fields column — species, item, ability, nature, tera */}
        <div className="flex min-w-0 flex-col justify-center gap-1">
          {/* Species picker */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={cn(
                "border-border bg-background hover:border-primary focus-visible:border-primary",
                "flex min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-left text-sm",
                "outline-none transition-colors"
              )}
            >
              <span
                className={cn(
                  "min-w-0 truncate",
                  defenderSpecies
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {defenderSpecies || "Choose…"}
              </span>
              <span aria-hidden className="text-[10px] text-muted-foreground">
                ▾
              </span>
            </button>

            {/* Type pills inline */}
            {types.length > 0 && (
              <div className="flex gap-1">
                {types.map((t) => (
                  <TypePill key={t} t={t} />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <FormChip label="ITEM" value={defenderItem}>
              <ItemPicker
                value={defenderItem}
                format={format}
                teamItems={[]}
                onPick={(item) => setDefenderItem(item)}
                onClose={() => undefined}
              />
            </FormChip>
            {canMega && (
              <MegaToggle
                active={defenderMegaActive}
                onToggle={() => setDefenderMegaActive(!defenderMegaActive)}
              />
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <FormChip label="ABIL" value={displayAbility}>
              <AbilityPicker
                value={defenderAbility}
                species={pickerSpecies}
                format={format}
                onPick={(ability) => setDefenderAbility(ability)}
                onClose={() => undefined}
              />
            </FormChip>
            {canMega && (
              <span className="pl-[calc(60px+6px+4px)] font-mono text-[9px] text-muted-foreground/50">
                {defenderMegaActive ? defenderAbility : displayAbility}
              </span>
            )}
          </div>

          <FormChip
            label="NAT"
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
      </div>

      <SpeciesPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={defenderSpecies}
        format={format}
        onPick={(species) => setDefenderSpecies(species)}
      />
    </div>
  );
}
