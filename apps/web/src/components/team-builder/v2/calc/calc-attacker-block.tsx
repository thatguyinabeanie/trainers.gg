"use client";

import {
  getMegaAbilityForSpecies,
  getSpeciesTypes,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type AttackerBoosts } from "../../use-calc-state";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { AttackerChipStrip } from "./attacker-chip-strip";
import { MegaToggle } from "./mega-toggle";

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
  /** Per-calc toggle: simulate attacker as mega vs base form. */
  attackerMegaActive: boolean;
  setAttackerMegaActive: (v: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const QUICK_PICKS = [0, 1, 2, 3, 6] as const;

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
  attackerMegaActive,
  setAttackerMegaActive,
}: CalcAttackerBlockProps) {
  const attacker = teamSlots[attackerIdx] ?? null;
  const attackerTypes = attacker?.species
    ? getSpeciesTypes(attacker.species)
    : [];
  const attackerIsMega =
    attacker?.species != null &&
    getMegaAbilityForSpecies(attacker.species) !== null;

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
            <div className="flex items-center gap-2">
              <div className="text-[12.5px] font-bold">{attacker.species}</div>
              {attackerIsMega && (
                <MegaToggle
                  active={attackerMegaActive}
                  onToggle={() => setAttackerMegaActive(!attackerMegaActive)}
                />
              )}
            </div>
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

      {/* Stat boosts — stepper + quick-pick chips */}
      <div className="mt-3">
        <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Stat boosts
        </div>
        <div className="grid grid-cols-[28px_1fr] items-center gap-x-2 gap-y-1.5">
          {STAT_KEYS.map(({ key, label, colorClass }) => {
            const current = attackerBoosts[key];
            return (
              <div key={key} className="contents">
                <span className={cn("font-mono text-[9.5px] font-semibold tracking-[0.05em]", colorClass)}>
                  {label}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAttackerBoost(key, Math.max(-6, current - 1))}
                    aria-label={`Decrease ${label} boost`}
                    className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded border border-border bg-muted/40 font-mono text-[13px] leading-none hover:bg-muted"
                  >
                    −
                  </button>
                  <span
                    className={cn(
                      "flex h-[20px] min-w-[32px] items-center justify-center rounded border font-mono text-[10px] font-bold",
                      current > 0 && "border-primary/40 bg-primary/10 text-primary",
                      current < 0 && "border-destructive/40 bg-destructive/10 text-destructive",
                      current === 0 && "border-border bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {current > 0 ? `+${current}` : current}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttackerBoost(key, Math.min(6, current + 1))}
                    aria-label={`Increase ${label} boost`}
                    className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded border border-border bg-muted/40 font-mono text-[13px] leading-none hover:bg-muted"
                  >
                    +
                  </button>
                  <div className="flex gap-[3px]">
                    {QUICK_PICKS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAttackerBoost(key, v)}
                        aria-pressed={current === v}
                        className={cn(
                          "rounded border px-[5px] py-[2px] font-mono text-[8.5px]",
                          current === v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* inherits-from note */}
      <div className="mt-2.5 rounded bg-muted/40 px-2 py-1.5 text-[10px] italic leading-snug text-muted-foreground">
        ↳ Inherits spread &amp; moves from row{" "}
        {String(attackerIdx + 1).padStart(2, "0")}. Edit the row to change.
      </div>
    </div>
  );
}
