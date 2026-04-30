"use client";

import { useState } from "react";

import { NATURE_EFFECTS, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import { TypeDot } from "../type-dot";
import { formatSupportsTera } from "../format-gating";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { TypePicker } from "../pickers/type-picker";
import { FieldError } from "../validation/field-error";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface SetupLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to setup fields (item, ability, nature, tera). */
  fieldErrors?: ValidationError[];
}

// =============================================================================
// SetupLane  (conceptually the "Loadout" lane)
// =============================================================================

/**
 * Loadout lane — vertical strip of labeled chips.
 *
 * Each chip has a small uppercase prefix label on a darker inset background
 * (`item / abil / nat / tera`) and the value to its right.
 * Each chip is the picker trigger. Tera chip hidden when format doesn't
 * support Terastallization.
 *
 * Phase 7: renders inline FieldError chips beneath offending fields.
 */
export function SetupLane({
  pokemon,
  format,
  teamItems,
  onUpdate,
  fieldErrors = [],
}: SetupLaneProps) {
  const [itemOpen, setItemOpen] = useState(false);
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [natureOpen, setNatureOpen] = useState(false);
  const [teraOpen, setTeraOpen] = useState(false);

  const showTera = formatSupportsTera(format);

  // Compute nature up/down for mini suffix
  const natureEffect = pokemon.nature ? NATURE_EFFECTS[pokemon.nature] : undefined;
  const natUp = natureEffect?.boost;
  const natDown = natureEffect?.reduce;

  // Map stat key to short label for the nature mini display
  const statShortLabel: Record<string, string> = {
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
    hp: "HP",
  };

  // Partition errors by field
  const itemErrors = fieldErrors.filter(
    (e) => e.field === "item" || e.field === "heldItem"
  );
  const abilityErrors = fieldErrors.filter((e) => e.field === "ability");
  const natureErrors = fieldErrors.filter((e) => e.field === "nature");

  return (
    <div
      className={cn(
        s.laneSetup,
        "flex flex-col justify-center gap-1.5 border-r border-dashed border-border/60 px-3 py-2"
      )}
      style={{ minWidth: 220 }}
    >
      {/* Item chip */}
      <div className="flex flex-col">
        <Popover open={itemOpen} onOpenChange={setItemOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  s.chipLabeled,
                  itemErrors.length > 0 && "ring-1 ring-destructive/40"
                )}
              />
            }
          >
            <span className={s.chipPrefix}>item</span>
            <span
              className={cn(
                s.chipValue,
                !pokemon.held_item && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.held_item ?? "—"}
            </span>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-0">
            <ItemPicker
              value={pokemon.held_item}
              format={format}
              teamItems={teamItems}
              onPick={(item) => onUpdate({ held_item: item })}
              onClose={() => setItemOpen(false)}
            />
          </PopoverContent>
        </Popover>
        {itemErrors.map((err, i) => (
          <FieldError key={i} message={err.message} severity={err.severity} className="px-1.5" />
        ))}
      </div>

      {/* Ability chip */}
      <div className="flex flex-col">
        <Popover open={abilityOpen} onOpenChange={setAbilityOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  s.chipLabeled,
                  abilityErrors.length > 0 && "ring-1 ring-destructive/40"
                )}
              />
            }
          >
            <span className={s.chipPrefix}>abil</span>
            <span
              className={cn(
                s.chipValue,
                !pokemon.ability && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.ability || "—"}
            </span>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-0">
            <AbilityPicker
              value={pokemon.ability}
              species={pokemon.species ?? ""}
              format={format}
              onPick={(ability) => onUpdate({ ability })}
              onClose={() => setAbilityOpen(false)}
            />
          </PopoverContent>
        </Popover>
        {abilityErrors.map((err, i) => (
          <FieldError key={i} message={err.message} severity={err.severity} className="px-1.5" />
        ))}
      </div>

      {/* Nature chip */}
      <div className="flex flex-col">
        <Popover open={natureOpen} onOpenChange={setNatureOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  s.chipLabeled,
                  natureErrors.length > 0 && "ring-1 ring-destructive/40"
                )}
              />
            }
          >
            <span className={s.chipPrefix}>nat</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  s.chipValue,
                  !pokemon.nature && "text-muted-foreground/50 italic"
                )}
              >
                {pokemon.nature || "—"}
              </span>
              {natUp && natDown && (
                <span className="text-muted-foreground font-mono text-[8.5px] tracking-wide">
                  +{statShortLabel[natUp] ?? natUp}/−{statShortLabel[natDown] ?? natDown}
                </span>
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-0">
            <NaturePicker
              value={pokemon.nature ?? ""}
              onPick={(nature) => onUpdate({ nature })}
              onClose={() => setNatureOpen(false)}
            />
          </PopoverContent>
        </Popover>
        {natureErrors.map((err, i) => (
          <FieldError key={i} message={err.message} severity={err.severity} className="px-1.5" />
        ))}
      </div>

      {/* Tera chip — hidden when format doesn't support Tera */}
      {showTera && (
        <Popover open={teraOpen} onOpenChange={setTeraOpen}>
          <PopoverTrigger
            render={
              <button type="button" className={s.chipLabeled} />
            }
          >
            <span className={s.chipPrefix}>tera</span>
            <span className="flex items-center gap-1.5">
              {pokemon.tera_type ? (
                <>
                  <TypeDot t={pokemon.tera_type} size={10} />
                  <span className={s.chipValue}>{pokemon.tera_type}</span>
                </>
              ) : (
                <span className={cn(s.chipValue, "text-muted-foreground/50 italic")}>—</span>
              )}
            </span>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-0">
            <TypePicker
              value={pokemon.tera_type}
              onPick={(type) => onUpdate({ tera_type: type })}
              onClose={() => setTeraOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
