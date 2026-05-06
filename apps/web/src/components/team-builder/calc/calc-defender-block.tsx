"use client";

import { useState } from "react";

import {
  type GameFormat,
  getSpeciesTypes,
  getValidAbilities,
  getValidNatures,
  getLegalAbilities,
  isChampionsFormat,
  legalSetOrPermissive,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  type DefenderEvs,
  type DefenderBoosts,
  type UseCalcStateReturn,
} from "../use-calc-state";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { CALC_TARGETS } from "./calc-target-options";

// =============================================================================
// Types
// =============================================================================

interface CalcDefenderBlockProps {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderEvs: DefenderEvs;
  defenderBoosts: DefenderBoosts;
  defenderHpPercent: number;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderHpPercent: (v: number) => void;
  resetDefenderForSpecies: UseCalcStateReturn["resetDefenderForSpecies"];
  format: GameFormat | undefined;
  /** The user's team — currently unused; kept on the interface for callers. */
  teammates: Tables<"pokemon">[];
}

// =============================================================================
// Constants
// =============================================================================

const QUICK_ITEMS = [
  "Sitrus Berry",
  "Leftovers",
  "Assault Vest",
  "Eviolite",
  "None",
];

const DEF_STAT_LABELS: { key: keyof DefenderEvs; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
];

const selectClass = cn(
  "border-border bg-background h-6 w-full rounded border px-1 text-[11px]",
  "focus:ring-1 focus:ring-primary focus:outline-none"
);

// =============================================================================
// CalcDefenderBlock
// =============================================================================

/**
 * Defender configuration block in the Calc Drawer.
 * Shows target picker trigger, sprite, meta line, HP/DEF/SPD EV inputs,
 * nature/item selects, HP% slider, and stage buttons.
 */
export function CalcDefenderBlock({
  defenderSpecies,
  defenderAbility,
  defenderItem,
  defenderNature,
  defenderEvs,
  defenderBoosts,
  defenderHpPercent,
  setDefenderSpecies: _setDefenderSpecies,
  setDefenderAbility,
  setDefenderItem,
  setDefenderNature,
  setDefenderEv,
  setDefenderBoost,
  setDefenderHpPercent,
  resetDefenderForSpecies,
  format,
  teammates: _teammates,
}: CalcDefenderBlockProps) {
  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];
  const natures = getValidNatures();

  const formatId = format?.id;
  const abilities = formatId
    ? Array.from(
        legalSetOrPermissive(getLegalAbilities(defenderSpecies, formatId)) ??
          getValidAbilities(defenderSpecies)
      )
    : getValidAbilities(defenderSpecies);

  // The item select shows QUICK_ITEMS plus the current item if not already there
  const itemOptions = [
    ...(defenderItem && !QUICK_ITEMS.includes(defenderItem) ? [defenderItem] : []),
    ...QUICK_ITEMS,
  ];

  const [pickerOpen, setPickerOpen] = useState(false);

  function handleTargetChange(value: string) {
    if (value === defenderSpecies) return;
    // If the picked species matches a hardcoded preset, apply the preset's
    // full spread (ability/item/nature/EVs). Otherwise reset to species
    // defaults — works for any legal species the user picks via the picker.
    const preset = CALC_TARGETS.find((t) => t.species === value);
    if (preset) {
      resetDefenderForSpecies(preset.species, {
        ability: preset.ability,
        item: preset.item,
        nature: preset.nature,
        evs: preset.evs,
      });
      return;
    }
    resetDefenderForSpecies(value);
  }

  return (
    <section className="cd-block">
      {/* Block header with target picker trigger */}
      <div className="cd-block-head">
        <span className="cd-eyebrow">DEFENDER</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Defender target"
          className={cn(
            "border-border bg-background hover:border-primary focus-visible:border-primary",
            "flex h-6 max-w-[160px] flex-1 items-center gap-1 rounded border px-2 text-left text-[11px]",
            "outline-none transition-colors focus:ring-1 focus:ring-primary"
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              defenderSpecies ? "text-foreground font-medium" : "text-muted-foreground"
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
          onPick={handleTargetChange}
        />
      </div>

      {/* Mon identity row */}
      {defenderSpecies && (
        <div className="cd-mon">
          <Sprite species={defenderSpecies} types={types} size={44} />
          <div className="cd-mon-body">
            <div className="cd-mon-name">
              <b className="text-sm font-semibold">{defenderSpecies}</b>
              <div className="flex gap-1">
                {types.map((t) => (
                  <TypePill key={t} t={t} />
                ))}
              </div>
            </div>
            <div className="cd-mon-meta">
              <span>{defenderAbility || "—"}</span>
              <span className="cd-dot">·</span>
              <span>@ {defenderItem || "None"}</span>
              <span className="cd-dot">·</span>
              <span>{defenderNature || "Hardy"}</span>
            </div>
          </div>
        </div>
      )}

      {/* EV inputs for HP, DEF, SPD */}
      <div className="cd-defstats">
        {DEF_STAT_LABELS.map(({ key, label }) => (
          <div key={key} className="cd-defstat">
            <span className="cd-defstat-l">{label}</span>
            {(() => {
              const isChampions = isChampionsFormat(format);
              const perStatMax = isChampions ? 32 : 252;
              const step = isChampions ? 1 : 4;
              return (
                <input
                  type="number"
                  min={0}
                  max={perStatMax}
                  step={step}
                  value={defenderEvs[key]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v))
                      setDefenderEv(key, Math.max(0, Math.min(perStatMax, v)));
                  }}
                  aria-label={`${label} ${isChampions ? "Stat Points" : "EVs"}`}
                  className="cd-num"
                />
              );
            })()}
          </div>
        ))}
      </div>

      {/* Nature row */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">Nature</label>
        <select
          className={selectClass}
          value={defenderNature}
          onChange={(e) => setDefenderNature(e.target.value)}
          aria-label="Defender nature"
        >
          {natures.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Ability row */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">Ability</label>
        <select
          className={selectClass}
          value={defenderAbility}
          onChange={(e) => setDefenderAbility(e.target.value)}
          aria-label="Defender ability"
        >
          <option value="">—</option>
          {abilities.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Item row */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">Item</label>
        <select
          className={selectClass}
          value={defenderItem}
          onChange={(e) => setDefenderItem(e.target.value)}
          aria-label="Defender item"
        >
          <option value="">—</option>
          {itemOptions.map((item) => (
            <option key={item} value={item === "None" ? "" : item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* HP % slider */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">HP</label>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={defenderHpPercent}
          onChange={(e) => setDefenderHpPercent(Number(e.target.value))}
          aria-label="Defender HP percent"
          className="cd-slider"
        />
        <span className="cd-num-out">{defenderHpPercent}%</span>
      </div>

      {/* Def stage row */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">Def</label>
        <div className="cd-stages">
          {([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={defenderBoosts.def === s}
              onClick={() => setDefenderBoost("def", s)}
              className={cn(
                "cd-stage",
                defenderBoosts.def === s &&
                  "bg-[color-mix(in_oklch,var(--primary)_15%,var(--background))] border-primary text-primary font-semibold"
              )}
            >
              {s > 0 ? `+${s}` : s}
            </button>
          ))}
        </div>
      </div>

      {/* SpD stage row */}
      <div className="cd-defrow">
        <label className="cd-defrow-l">SpD</label>
        <div className="cd-stages">
          {([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={defenderBoosts.spd === s}
              onClick={() => setDefenderBoost("spd", s)}
              className={cn(
                "cd-stage",
                defenderBoosts.spd === s &&
                  "bg-[color-mix(in_oklch,var(--primary)_15%,var(--background))] border-primary text-primary font-semibold"
              )}
            >
              {s > 0 ? `+${s}` : s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
