"use client";

import {
  getSpeciesTypes,
  getLegalAbilities,
  getValidAbilities,
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

export interface DefenderMonHeaderProps {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  format: GameFormat | undefined;
  attackerName: string;
  attackerHP: number | null;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
}

function LoadoutChip({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger className={cn(s.chipLabeled)}>
        <span className={s.chipPrefix}>{label}</span>
        <span className={cn(s.chipValue, "min-w-0 truncate")}>{value || "—"}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto p-0"
        style={{ maxHeight: "60vh", overflow: "hidden" }}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function DefenderMonHeader({
  defenderSpecies,
  defenderAbility,
  defenderItem,
  defenderNature,
  defenderTera,
  format,
  attackerName,
  attackerHP,
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

  return (
    <div className="border-b p-3 pb-2">
      <div className="flex items-start gap-3">
        {/* Sprite */}
        <div className="size-[52px] flex-shrink-0 overflow-hidden rounded-md">
          <Sprite species={defenderSpecies || "Incineroar"} types={types} size={52} />
        </div>

        {/* Identity + loadout */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* Species picker */}
            <Popover>
              <PopoverTrigger className="block min-w-0 max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-[13px] font-bold hover:bg-muted">
                {defenderSpecies || "—"}
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                className="h-[480px] w-[640px] overflow-hidden p-0"
              >
                <SpeciesPicker
                  value={defenderSpecies}
                  format={format}
                  onPick={(species) => setDefenderSpecies(species)}
                  onClose={() => undefined}
                />
              </PopoverContent>
            </Popover>
            {/* "vs X · HP" badge */}
            <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">
              vs {attackerName} · {attackerHP !== null ? `${attackerHP} HP` : "—"}
            </span>
          </div>

          {/* Types */}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {types.map((t) => (
              <TypePill key={t} t={t} />
            ))}
          </div>

          {/* Loadout chips */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {/* Item */}
            <Popover>
              <PopoverTrigger className={cn(s.chipLabeled)}>
                <span className={s.chipPrefix}>item</span>
                <span className={cn(s.chipValue, "min-w-0 truncate")}>
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

            <LoadoutChip label="abil" value={defenderAbility}>
              <AbilityPicker
                value={defenderAbility}
                species={defenderSpecies}
                format={format}
                onPick={(ability) => setDefenderAbility(ability)}
                onClose={() => undefined}
              />
            </LoadoutChip>

            <LoadoutChip label="nat" value={defenderNature}>
              <NaturePicker
                value={defenderNature}
                onPick={(nat) => setDefenderNature(nat)}
                onClose={() => undefined}
              />
            </LoadoutChip>

            {showTera && (
              <LoadoutChip
                label="tera"
                value={defenderTera ? `${defenderTera} tera` : "—"}
              >
                <TypePicker
                  value={defenderTera}
                  onPick={(type) => setDefenderTera(type)}
                  onClose={() => undefined}
                />
              </LoadoutChip>
            )}
          </div>

          {defenderSpecies && legalAbilities.length === 0 && (
            <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
              No abilities found for format
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
