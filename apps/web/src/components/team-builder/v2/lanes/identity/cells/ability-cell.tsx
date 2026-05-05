"use client";

import { useState } from "react";

import {
  getAbilityShortDesc,
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipTrigger } from "@/components/ui/tooltip";

import { type ValidationError } from "../../../../validation-hooks";
import { AbilityPicker } from "../../../pickers/ability-picker";
import { FieldErrors } from "../../../validation/field-error";
import { DescriptionTooltip } from "../../description-tooltip";
import { cellClasses, type CellVariant } from "./identity-cell-shared";

// =============================================================================
// AbilityCell — ability form cell, row (compact) or grid (hero) variant
//
// Row variant: custom Tooltip → TooltipTrigger → PopoverTrigger nesting
// (cannot use FormChip because FormChip has no outer Tooltip).
// Grid variant: plain Popover + midFormCell chrome.
//
// Absorbs the former IdentityAbilityRow helper (compact-mode logic) and adds
// the hero-mode branch.
// =============================================================================

interface AbilityCellProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  errors: ValidationError[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  variant: CellVariant;
}

export function AbilityCell({
  pokemon,
  format,
  errors,
  onUpdate,
  variant,
}: AbilityCellProps) {
  const [open, setOpen] = useState(false);

  const megaAbility = pokemon.species
    ? getMegaAbilityForSpecies(pokemon.species)
    : null;
  const pickerSpecies = pokemon.species
    ? getCanonicalBaseSpecies(pokemon.species)
    : "";
  const displayAbility = megaAbility ?? pokemon.ability;

  if (variant === "row") {
    const showTooltip = !open;
    const displayDesc = displayAbility
      ? getAbilityShortDesc(displayAbility)
      : null;

    return (
      <div className="flex flex-col">
        <Popover open={open} onOpenChange={setOpen}>
          <DescriptionTooltip
            title={displayAbility}
            description={displayDesc}
            showContent={showTooltip}
          >
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        cellClasses.formRow,
                        errors.length > 0 &&
                          "ring-destructive/40 rounded ring-1"
                      )}
                    />
                  }
                />
              }
            >
              <span className={cellClasses.formLabel}>Abil</span>
              <span
                className={cn(
                  cellClasses.formValue,
                  !displayAbility && "text-muted-foreground/50 italic"
                )}
              >
                {displayAbility || "—"}
              </span>
            </TooltipTrigger>
          </DescriptionTooltip>
          <PopoverContent side="bottom" align="start" className="w-auto p-0">
            <AbilityPicker
              value={pokemon.ability}
              species={pickerSpecies}
              format={format}
              onPick={(ability) => onUpdate({ ability })}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
        <FieldErrors errors={errors} className="px-1" />
      </div>
    );
  }

  // variant === "grid" — MidStack layout
  return (
    <div className="flex flex-col">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                cellClasses.midFormCell,
                errors.length > 0 && "ring-destructive/40 rounded ring-1"
              )}
            />
          }
        >
          <span className={cellClasses.midFormLbl}>ABIL</span>
          <span
            className={cn(
              cellClasses.midFormVal,
              !displayAbility && "text-muted-foreground/50 italic"
            )}
          >
            {displayAbility || "—"}
          </span>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          <AbilityPicker
            value={pokemon.ability}
            species={pickerSpecies}
            format={format}
            onPick={(ability) => onUpdate({ ability })}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <FieldErrors errors={errors} className="px-1" />
    </div>
  );
}
