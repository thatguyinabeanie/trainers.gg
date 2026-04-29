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

import { TypeDot } from "../type-dot";
import { formatSupportsTera } from "../format-gating";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { TypePicker } from "../pickers/type-picker";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface SetupLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

// =============================================================================
// SetupLane
// =============================================================================

/**
 * Four stacked setup rows: item / ability / nature / tera.
 * Each row is a trigger button that opens the appropriate picker popover.
 * Tera row is hidden when the format does not support Terastallization.
 */
export function SetupLane({
  pokemon,
  format,
  teamItems,
  onUpdate,
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

  return (
    <div className={cn(s.laneSetup, "flex flex-col justify-center gap-0.5 border-r border-dashed border-border/60 px-3 py-2")} style={{ minWidth: 140 }}>
      {/* Item row */}
      <Popover open={itemOpen} onOpenChange={setItemOpen}>
        <PopoverTrigger>
          <button
            type="button"
            className="grid gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
            style={{ gridTemplateColumns: "30px 1fr" }}
          >
            <span className="text-muted-foreground self-baseline font-mono text-[9px] font-medium tracking-wider uppercase">
              item
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                !pokemon.held_item && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.held_item ?? "—"}
            </span>
          </button>
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

      {/* Ability row */}
      <Popover open={abilityOpen} onOpenChange={setAbilityOpen}>
        <PopoverTrigger>
          <button
            type="button"
            className="grid gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
            style={{ gridTemplateColumns: "30px 1fr" }}
          >
            <span className="text-muted-foreground self-baseline font-mono text-[9px] font-medium tracking-wider uppercase">
              abil
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                !pokemon.ability && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.ability || "—"}
            </span>
          </button>
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

      {/* Nature row */}
      <Popover open={natureOpen} onOpenChange={setNatureOpen}>
        <PopoverTrigger>
          <button
            type="button"
            className="relative grid gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
            style={{ gridTemplateColumns: "30px 1fr" }}
          >
            <span className="text-muted-foreground self-baseline font-mono text-[9px] font-medium tracking-wider uppercase">
              nat
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                !pokemon.nature && "text-muted-foreground/50 italic"
              )}
            >
              {pokemon.nature || "—"}
            </span>
            {natUp && natDown && (
              <span className="text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[8.5px] tracking-wide">
                +{statShortLabel[natUp] ?? natUp}/−{statShortLabel[natDown] ?? natDown}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          <NaturePicker
            value={pokemon.nature ?? ""}
            onPick={(nature) => onUpdate({ nature })}
            onClose={() => setNatureOpen(false)}
          />
        </PopoverContent>
      </Popover>

      {/* Tera row — hidden when format doesn't support Tera */}
      {showTera && (
        <Popover open={teraOpen} onOpenChange={setTeraOpen}>
          <PopoverTrigger>
            <button
              type="button"
              className="grid gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
              style={{ gridTemplateColumns: "30px 1fr" }}
            >
              <span className="text-muted-foreground self-baseline font-mono text-[9px] font-medium tracking-wider uppercase">
                tera
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                {pokemon.tera_type ? (
                  <>
                    <TypeDot t={pokemon.tera_type} size={10} />
                    {pokemon.tera_type}
                  </>
                ) : (
                  <span className="text-muted-foreground/50 italic">—</span>
                )}
              </span>
            </button>
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
