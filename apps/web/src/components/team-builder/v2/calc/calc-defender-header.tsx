"use client";

import {
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  getSpeciesTypes,
  getLegalAbilities,
  getValidAbilities,
  NATURE_EFFECTS,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { NatureChevrons } from "../nature-chevrons";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { formatSupportsTera } from "../format-gating";
import { MegaToggle } from "./mega-toggle";
import s from "../builder.module.css";

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
// DefenderFormChip — internal helper for the Item / Ability / Nature / Tera
// rows. Keeps the Popover + s.formRow + label/value structure in one place so
// the four chips always render identically (and the test surface is one
// component, not four near-duplicate inline blocks).
// =============================================================================

interface DefenderFormChipProps {
  /** Two-letter-ish label shown in the prefix slot (Item, Abil, Nat, Tera). */
  label: string;
  /** Display string. Empty string renders the muted-italic em-dash placeholder. */
  value: string;
  /** Optional trailing element rendered after the value (e.g. nature ±chevrons). */
  trailing?: React.ReactNode;
  /** Picker popover body. */
  children: React.ReactNode;
}

function DefenderFormChip({
  label,
  value,
  trailing,
  children,
}: DefenderFormChipProps) {
  return (
    <Popover>
      <PopoverTrigger className={s.formRow}>
        <span className={s.formLabel}>{label}</span>
        {trailing ? (
          <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <span
              className={cn(
                s.formValue,
                !value && "italic text-muted-foreground/50"
              )}
            >
              {value || "—"}
            </span>
            {trailing}
          </span>
        ) : (
          <span
            className={cn(
              s.formValue,
              !value && "italic text-muted-foreground/50"
            )}
          >
            {value || "—"}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-auto p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
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

  const legalAbilities = format
    ? Array.from(
        getLegalAbilities(pickerSpecies, format.id) ??
          getValidAbilities(pickerSpecies)
      )
    : getValidAbilities(pickerSpecies);

  const natureEffect = defenderNature ? NATURE_EFFECTS[defenderNature] : null;
  const natUp = natureEffect?.boost ?? null;
  const natDown = natureEffect?.reduce ?? null;

  return (
    <div className="flex w-60 shrink-0 flex-col gap-1.5 border-r p-2">
      {/* Species pill + mega toggle (when applicable) */}
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger
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
          </PopoverTrigger>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={6}
            className="w-[920px] max-w-[calc(100vw-2rem)] p-0"
            style={{ maxHeight: "min(70vh, 640px)" }}
          >
            <SpeciesPicker
              value={defenderSpecies}
              format={format}
              onPick={(species) => setDefenderSpecies(species)}
              onClose={() => undefined}
            />
          </PopoverContent>
        </Popover>
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

      {/* Type pills */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <TypePill key={t} t={t} />
          ))}
        </div>
      )}

      {/* Item */}
      <DefenderFormChip label="Item" value={defenderItem}>
        <ItemPicker
          value={defenderItem}
          format={format}
          teamItems={[]}
          onPick={(item) => setDefenderItem(item)}
          onClose={() => undefined}
        />
      </DefenderFormChip>

      {/* Ability — when species is a mega and the toggle is on, the picker
          edits the BASE ability (stored) but the row's primary value shows
          the post-evolution ability for clarity. The base ability is shown
          as a small secondary line for tournament transparency. */}
      <DefenderFormChip
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
      </DefenderFormChip>

      {/* Nature — passes nature ±chevrons as the trailing element */}
      <DefenderFormChip
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
      </DefenderFormChip>

      {/* Tera */}
      {showTera && (
        <DefenderFormChip label="Tera" value={defenderTera}>
          <TypePicker
            value={defenderTera}
            onPick={(type) => setDefenderTera(type)}
            onClose={() => undefined}
          />
        </DefenderFormChip>
      )}

      {defenderSpecies && legalAbilities.length === 0 && (
        <p className="px-1 font-mono text-[9px] text-muted-foreground/60">
          No abilities found for format
        </p>
      )}
    </div>
  );
}
