"use client";

import {
  getMegaAbilityForSpecies,
  getSpeciesTypes,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

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
  /** Per-calc toggle: simulate attacker as mega vs base form. */
  attackerMegaActive: boolean;
  setAttackerMegaActive: (v: boolean) => void;
}

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
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-primary">
          Attacker
        </span>
        <span className="font-mono text-xs text-muted-foreground">
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
              <div className="text-sm font-bold">{attacker.species}</div>
            </div>
            <div className="mb-1 mt-0.5 flex gap-1">
              {attackerTypes.map((t) => (
                <TypePill key={t} t={t} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
              <span>{attacker.nature ?? "—"} · Lv {attacker.level ?? 50}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
              <span>@ {attacker.held_item ?? "—"}</span>
              {attackerIsMega && (
                <MegaToggle
                  active={attackerMegaActive}
                  onToggle={() => setAttackerMegaActive(!attackerMegaActive)}
                />
              )}
            </div>
            <div className="font-mono text-xs leading-relaxed text-muted-foreground">
              {attacker.ability ?? "—"}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No attacker selected.
        </p>
      )}

      {/* inherits-from note */}
      <div className="mt-2.5 rounded bg-muted/40 px-2 py-1.5 text-xs italic leading-snug text-muted-foreground">
        ↳ Inherits spread &amp; moves from row{" "}
        {String(attackerIdx + 1).padStart(2, "0")}. Edit the row to change.
      </div>
    </div>
  );
}
