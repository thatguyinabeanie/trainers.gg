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
  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];

  const megaAbility = defenderSpecies
    ? getMegaAbilityForSpecies(defenderSpecies)
    : null;
  const isMegaForm = megaAbility !== null;
  const baseSpecies = defenderSpecies
    ? getCanonicalBaseSpecies(defenderSpecies)
    : "";
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
    <div className="flex w-full flex-col border-b border-dashed border-border">
      {/* Sprite + meta row */}
      <div className="flex min-w-0 flex-row items-center">
        {/* Sprite column */}
        <div className="flex shrink-0 grow-0 basis-[140px] flex-col items-center justify-center gap-1.5 px-1 py-2">
          <div className="size-24 shrink-0 overflow-hidden rounded-md">
            <Sprite
              species={defenderSpecies || "Incineroar"}
              types={types}
              size={96}
            />
          </div>

          {/* Species picker pill below sprite */}
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={cn(
                "border-border bg-background hover:border-primary focus-visible:border-primary",
                "flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 text-left text-[11px]",
                "outline-none transition-colors"
              )}
            >
              <span
                className={cn(
                  "min-w-0 truncate",
                  defenderSpecies
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {defenderSpecies || "Choose…"}
              </span>
              <span aria-hidden className="text-[9px] text-muted-foreground">
                ▾
              </span>
            </button>

            {isMegaForm && (
              <MegaToggle
                active={defenderMegaActive}
                onToggle={() => setDefenderMegaActive(!defenderMegaActive)}
              />
            )}
          </div>

          <SpeciesPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            value={defenderSpecies}
            format={format}
            onPick={(species) => setDefenderSpecies(species)}
          />

          {/* Type pills */}
          {types.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {types.map((t) => (
                <TypePill key={t} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Meta fields column — item, ability, nature, tera */}
        <div className="flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2">
          <FormChip label="ITEM" value={defenderItem}>
            <ItemPicker
              value={defenderItem}
              format={format}
              teamItems={[]}
              onPick={(item) => setDefenderItem(item)}
              onClose={() => undefined}
            />
          </FormChip>

          <FormChip
            label="ABIL"
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
    </div>
  );
}
