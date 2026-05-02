"use client";

import {
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
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { formatSupportsTera } from "../format-gating";
import s from "../builder.module.css";

// =============================================================================
// Constants
// =============================================================================

const STAT_ABBR: Partial<Record<string, string>> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

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
}: DefenderMonHeaderProps) {
  const showTera = formatSupportsTera(format);
  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];

  const legalAbilities = format
    ? Array.from(
        getLegalAbilities(defenderSpecies, format.id) ??
          getValidAbilities(defenderSpecies)
      )
    : getValidAbilities(defenderSpecies);

  const natureEffect = defenderNature ? NATURE_EFFECTS[defenderNature] : null;
  const natUp = natureEffect?.boost ?? null;
  const natDown = natureEffect?.reduce ?? null;

  return (
    <div className="flex w-60 shrink-0 flex-col gap-1.5 border-r p-2">
      {/* Species pill + Sprite (both open species picker) */}
      <Popover>
        <PopoverTrigger
          className={cn(
            "border-border bg-background hover:border-primary focus-visible:border-primary",
            "flex w-full items-center gap-1 rounded-md border px-2 py-1 text-left text-[11.5px]",
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
      <Popover>
        <PopoverTrigger className={s.formRow}>
          <span className={s.formLabel}>Item</span>
          <span
            className={cn(
              s.formValue,
              !defenderItem && "italic text-muted-foreground/50"
            )}
          >
            {defenderItem || "—"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-auto p-0">
          <ItemPicker
            value={defenderItem}
            format={format}
            teamItems={[]}
            onPick={(item) => setDefenderItem(item)}
            onClose={() => undefined}
          />
        </PopoverContent>
      </Popover>

      {/* Ability */}
      <Popover>
        <PopoverTrigger className={s.formRow}>
          <span className={s.formLabel}>Abil</span>
          <span
            className={cn(
              s.formValue,
              !defenderAbility && "italic text-muted-foreground/50"
            )}
          >
            {defenderAbility || "—"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-auto p-0">
          <AbilityPicker
            value={defenderAbility}
            species={defenderSpecies}
            format={format}
            onPick={(ability) => setDefenderAbility(ability)}
            onClose={() => undefined}
          />
        </PopoverContent>
      </Popover>

      {/* Nature */}
      <Popover>
        <PopoverTrigger className={s.formRow}>
          <span className={s.formLabel}>Nat</span>
          <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <span
              className={cn(
                s.formValue,
                !defenderNature && "italic text-muted-foreground/50"
              )}
            >
              {defenderNature || "—"}
            </span>
            {natUp && natDown && (
              <span className="shrink-0 whitespace-nowrap font-mono text-[9px]">
                <span className="text-emerald-600 dark:text-emerald-400">
                  +{STAT_ABBR[natUp] ?? natUp}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-rose-600 dark:text-rose-400">
                  −{STAT_ABBR[natDown] ?? natDown}
                </span>
              </span>
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="w-auto p-0">
          <NaturePicker
            value={defenderNature}
            onPick={(nat) => setDefenderNature(nat)}
            onClose={() => undefined}
          />
        </PopoverContent>
      </Popover>

      {/* Tera */}
      {showTera && (
        <Popover>
          <PopoverTrigger className={s.formRow}>
            <span className={s.formLabel}>Tera</span>
            <span
              className={cn(
                s.formValue,
                !defenderTera && "italic text-muted-foreground/50"
              )}
            >
              {defenderTera || "—"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-auto p-0">
            <TypePicker
              value={defenderTera}
              onPick={(type) => setDefenderTera(type)}
              onClose={() => undefined}
            />
          </PopoverContent>
        </Popover>
      )}

      {defenderSpecies && legalAbilities.length === 0 && (
        <p className="px-1 font-mono text-[9px] text-muted-foreground/60">
          No abilities found for format
        </p>
      )}
    </div>
  );
}
