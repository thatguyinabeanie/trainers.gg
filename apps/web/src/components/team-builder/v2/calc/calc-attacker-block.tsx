"use client";

import { type GameFormat, getSpeciesTypes } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { formatSupportsTera } from "../format-gating";

// =============================================================================
// Types
// =============================================================================

interface CalcAttackerBlockProps {
  attacker: Tables<"pokemon">;
  attackerIdx: number;
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  setActiveIdx: (idx: number) => void;
  atkTera: boolean;
  onToggleAtkTera: () => void;
}

// =============================================================================
// CalcAttackerBlock
// =============================================================================

/**
 * Attacker identity block in the Calc Drawer.
 * Shows sprite, name, types, meta line, 6 team pip buttons, and tera checkbox.
 */
export function CalcAttackerBlock({
  attacker,
  attackerIdx,
  team,
  format,
  setActiveIdx,
  atkTera,
  onToggleAtkTera,
}: CalcAttackerBlockProps) {
  const species = attacker.species ?? "";
  const nick = attacker.nickname ?? species;
  const types = getSpeciesTypes(species);
  const hasTera = formatSupportsTera(format);

  // Build stable 6-slot array — same as team-workspace-v2.tsx buildSlots
  const slots: (Tables<"pokemon"> | null)[] = Array.from({ length: 6 }, (_, i) => {
    const entry = [...(team.team_pokemon ?? [])].sort(
      (a, b) => a.team_position - b.team_position
    )[i];
    return entry?.pokemon ?? null;
  });

  return (
    <section className="cd-block">
      {/* Block header */}
      <div className="cd-block-head">
        <span className="cd-eyebrow">ATTACKER</span>
        <span className="cd-attacker-pill">live</span>
      </div>

      {/* Mon identity row */}
      <div className="cd-mon">
        <Sprite species={species} types={types} size={44} />
        <div className="cd-mon-body">
          <div className="cd-mon-name">
            <b className="text-sm font-semibold">{nick}</b>
            <div className="flex gap-1">
              {types.map((t) => (
                <TypePill key={t} t={t} />
              ))}
            </div>
          </div>
          <div className="cd-mon-meta">
            <span>{attacker.ability ?? "—"}</span>
            <span className="cd-dot">·</span>
            <span>@ {attacker.held_item ?? "None"}</span>
            <span className="cd-dot">·</span>
            <span>{attacker.nature ?? "Hardy"}</span>
            {atkTera && attacker.tera_type && (
              <>
                <span className="cd-dot">·</span>
                <span>Tera {attacker.tera_type}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team pips */}
      <div className="cd-team-pips">
        {slots.map((slot, i) => {
          const slotSpecies = slot?.species ?? "";
          const slotNick = slot?.nickname ?? slotSpecies;
          const isActive = i === attackerIdx;
          const isEmpty = !slot;

          return (
            <button
              key={i}
              type="button"
              disabled={isEmpty}
              onClick={() => !isEmpty && setActiveIdx(i)}
              aria-label={isEmpty ? "Empty slot" : slotNick}
              aria-pressed={isActive}
              className={cn(
                "cd-pip",
                isActive && "cd-pip--active",
                isEmpty && "cd-pip--empty"
              )}
              title={isEmpty ? "Empty" : slotNick}
            >
              {isEmpty
                ? "—"
                : (slotNick[0] ?? "?").toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Tera checkbox — hidden when format doesn't support Tera */}
      {hasTera && (
        <label className="cd-check">
          <input
            type="checkbox"
            checked={atkTera}
            onChange={onToggleAtkTera}
            className="size-3.5 cursor-pointer accent-teal-500"
          />
          <span className="text-xs">Attacker terastalized</span>
          {attacker.tera_type && (
            <span className="cd-tera-tag">{attacker.tera_type}</span>
          )}
        </label>
      )}
    </section>
  );
}
