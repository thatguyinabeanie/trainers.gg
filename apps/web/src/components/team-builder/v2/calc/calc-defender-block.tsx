"use client";

import {
  type GameFormat,
  getSpeciesTypes,
  getValidAbilities,
  getValidNatures,
  getLegalAbilities,
  getMetaSpeedTiers,
  isLegalSpecies,
  isChampionsFormat,
  legalSetOrPermissive,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  type DefenderEvs,
  type DefenderBoosts,
  type UseCalcStateReturn,
} from "../../use-calc-state";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
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
  /** The user's team — available as extra target options in the picker */
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
 * Shows target select, sprite, meta line, HP/DEF/SPD EV inputs,
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
  teammates,
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

  // Meta options for the target group (already curated per format)
  const meta = format ? getMetaSpeedTiers(format.id) : [];

  // Filter the hardcoded VGC presets down to species legal in the active
  // format. For Champions Reg M-A this drops the entire VGC roster (Flutter
  // Mane, Calyrex, Miraidon, etc.) and only the Meta optgroup + teammates
  // remain — which is correct.
  const presets = formatId
    ? CALC_TARGETS.filter((t) => isLegalSpecies(t.species, formatId))
    : CALC_TARGETS;

  // Defensive: also filter teammates by legality so a stale team can't
  // surface a non-legal defender via the "Your team" optgroup.
  const legalTeammates = formatId
    ? teammates.filter(
        (p) => p.species && isLegalSpecies(p.species, formatId)
      )
    : teammates;

  // The item select shows QUICK_ITEMS plus the current item if not already there
  const itemOptions = [
    ...(defenderItem && !QUICK_ITEMS.includes(defenderItem) ? [defenderItem] : []),
    ...QUICK_ITEMS,
  ];

  function handleTargetChange(value: string) {
    // Check the format-filtered presets first for full spread
    const preset = presets.find((t) => t.species === value);
    if (preset) {
      resetDefenderForSpecies(preset.species, {
        ability: preset.ability,
        item: preset.item,
        nature: preset.nature,
        evs: preset.evs,
      });
      return;
    }
    // Team mate — reset with just the species name
    resetDefenderForSpecies(value);
  }

  return (
    <section className="cd-block">
      {/* Block header with target select */}
      <div className="cd-block-head">
        <span className="cd-eyebrow">DEFENDER</span>
        <select
          className={cn(selectClass, "max-w-[160px]")}
          value={defenderSpecies}
          onChange={(e) => handleTargetChange(e.target.value)}
          aria-label="Defender target"
        >
          {presets.map((t) => (
            <option key={t.species} value={t.species}>
              {t.name}
            </option>
          ))}
          {meta.length > 0 && (
            <optgroup label="Meta">
              {meta.map((m) => (
                <option key={`meta-${m.species}`} value={m.displayName}>
                  {m.displayName}
                </option>
              ))}
            </optgroup>
          )}
          {legalTeammates.length > 0 && (
            <optgroup label="Your team">
              {legalTeammates.map((p) => (
                <option key={`team-${p.id}`} value={p.species ?? ""}>
                  {p.nickname ?? p.species ?? "—"}
                </option>
              ))}
            </optgroup>
          )}
        </select>
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
              className={cn("cd-stage", defenderBoosts.def === s && "cd-stage--on")}
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
              className={cn("cd-stage", defenderBoosts.spd === s && "cd-stage--on")}
            >
              {s > 0 ? `+${s}` : s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
