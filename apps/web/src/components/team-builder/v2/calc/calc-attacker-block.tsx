"use client";

import { getSpeciesTypes } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type AttackerBoosts } from "../../use-calc-state";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { AttackerChipStrip } from "./attacker-chip-strip";

// =============================================================================
// Types
// =============================================================================

interface CalcAttackerBlockProps {
  /** Pre-built 6-slot array (team_position aligned), passed from the panel. */
  teamSlots: (Tables<"pokemon"> | null)[];
  /** Active attacker slot (0..5). */
  attackerIdx: number;
  /** Setter for the active attacker slot. */
  onPickAttacker: (idx: number) => void;
  attackerBoosts: AttackerBoosts;
  setAttackerBoost: (stat: keyof AttackerBoosts, v: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

const STAGE_VALUES = [-6, -4, -2, -1, 0, 1, 2, 4, 6] as const;

const STAT_KEYS: {
  key: keyof AttackerBoosts;
  label: string;
  colorClass: string;
}[] = [
  { key: "atk", label: "ATK", colorClass: "text-orange-500" },
  { key: "def", label: "DEF", colorClass: "text-amber-500" },
  { key: "spa", label: "SPA", colorClass: "text-sky-500" },
  { key: "spd", label: "SPD", colorClass: "text-emerald-500" },
  { key: "spe", label: "SPE", colorClass: "text-fuchsia-500" },
];

// =============================================================================
// CalcAttackerBlock
// =============================================================================

/**
 * Attacker column block in the calc bottom panel.
 * Shows a 6-chip team selector, a read-only mon head (sprite + name + types +
 * meta line), an "inherits from row" note, and a 5-row stat-boost grid.
 */
export function CalcAttackerBlock({
  teamSlots,
  attackerIdx,
  onPickAttacker,
  attackerBoosts,
  setAttackerBoost,
}: CalcAttackerBlockProps) {
  const attacker = teamSlots[attackerIdx] ?? null;
  const attackerTypes = attacker?.species
    ? getSpeciesTypes(attacker.species)
    : [];

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-3 shadow-sm">
      {/* col head */}
      <div className="mb-2.5 flex items-center justify-between border-b pb-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-primary">
          Attacker
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          your team
        </span>
      </div>

      {/* chip strip */}
      <AttackerChipStrip
        pokemon={teamSlots}
        activeIdx={attackerIdx}
        onPick={onPickAttacker}
      />

      {/* mon head — read only */}
      {attacker ? (
        <div className="mt-2.5 flex gap-2.5">
          <div className="size-[60px] flex-shrink-0 overflow-hidden rounded-md">
            <Sprite
              species={attacker.species ?? ""}
              types={attackerTypes}
              size={60}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold">{attacker.species}</div>
            <div className="mb-1 mt-0.5 flex gap-1">
              {attackerTypes.map((t) => (
                <TypePill key={t} t={t} />
              ))}
            </div>
            <div className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {attacker.nature ?? "—"} · Lv {attacker.level ?? 50}
              <br />@ {attacker.held_item ?? "—"} · {attacker.ability ?? "—"}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No attacker selected.
        </p>
      )}

      {/* inherits-from note */}
      <div className="mt-2.5 rounded bg-muted/40 px-2 py-1.5 text-[10px] italic leading-snug text-muted-foreground">
        ↳ Inherits spread &amp; moves from row{" "}
        {String(attackerIdx + 1).padStart(2, "0")}. Edit the row to change.
      </div>

      {/* stat boosts grid */}
      <div className="mt-3">
        <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Stat boosts
        </div>
        <div className="grid grid-cols-[30px_1fr] items-center gap-x-2 gap-y-1">
          {STAT_KEYS.map(({ key, label, colorClass }) => (
            <div key={key} className="contents">
              <span
                className={cn(
                  "font-mono text-[9.5px] font-semibold tracking-[0.05em]",
                  colorClass
                )}
              >
                {label}
              </span>
              <div className="flex gap-[2px]">
                {STAGE_VALUES.map((v) => {
                  const isOn = attackerBoosts[key] === v;
                  const isZero = v === 0;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAttackerBoost(key, v)}
                      aria-pressed={isOn}
                      className={cn(
                        "flex-1 rounded-sm border py-[3px] text-center font-mono text-[9.5px]",
                        isOn &&
                          "border-primary bg-primary text-primary-foreground",
                        !isOn &&
                          isZero &&
                          "border-transparent bg-muted/50 font-semibold text-foreground",
                        !isOn &&
                          !isZero &&
                          "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
