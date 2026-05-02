"use client";

import { useState } from "react";

import { getMoveData, getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  getVerdict,
  type CalcOutput,
} from "../../use-calc-state";
import { formatSupportsTera } from "../format-gating";
import { TypeDot } from "../type-dot";
import {
  getMoveTargetInfo,
  getMoveTargetLabel,
  getMoveTargetDesc,
} from "./move-target-info";
import { getMoveEffectiveness } from "./move-effectiveness";

// =============================================================================
// Types
// =============================================================================

/** Minimal defender shape exposed from CalcStateContext. */
export interface CalcDetailDefender {
  species: string;
  ability: string;
  item: string;
  nature: string;
}

interface CalcDetailCardProps {
  attacker: Tables<"pokemon">;
  moveName: string;
  /** Base calc output (no local overrides applied yet). */
  baseOutput: CalcOutput;
  defender: CalcDetailDefender;
  format: GameFormat | undefined;
  /** foesAlive from the workspace field state. */
  foesAlive: 1 | 2;
  /** allyAlive from the workspace field state. */
  allyAlive: boolean;
  /** Active or weather-ability-inferred weather, used to resolve Weather Ball type. */
  weather: string | null;
  onClose: () => void;
  /** Opens the move picker for this slot — keyboard / affordance shortcut. */
  onChangeMove: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Apply local override modifiers to a calc output.
 * Crit multiplies damage by 1.5; screen halves it.
 * The verdict is recomputed from the modified percentages.
 */
function applyOverrides(
  output: CalcOutput,
  opts: { crit: boolean; screen: boolean; spreadApplied: boolean }
): { minPct: number; maxPct: number; factor: number } {
  const factor =
    (opts.crit ? 1.5 : 1) *
    (opts.screen ? 0.5 : 1) *
    (opts.spreadApplied ? 0.75 : 1);

  return {
    minPct: output.minPercent * factor,
    maxPct: output.maxPercent * factor,
    factor,
  };
}

// =============================================================================
// CalcDetailCard
// =============================================================================

/**
 * Detailed per-move calc popover content.
 *
 * Shows attacker → move → defender identity, damage % range, KO label,
 * raw damage / HP, effectiveness, target classification, and local override
 * toggles (crit / terastallized / screen up).  When the move is a spread move
 * a field row is also shown.
 *
 * All toggles are LOCAL — they don't mutate workspace state.
 */
export function CalcDetailCard({
  attacker,
  moveName,
  baseOutput,
  defender,
  format,
  foesAlive,
  allyAlive,
  weather,
  onClose,
  onChangeMove,
}: CalcDetailCardProps) {
  const [crit, setCrit] = useState(false);
  const [screen, setScreen] = useState(false);
  const showTera = formatSupportsTera(format);
  const [localFoesAlive, setLocalFoesAlive] = useState<1 | 2>(foesAlive);
  const [localAllyAlive, setLocalAllyAlive] = useState(allyAlive);

  const moveData = getMoveData(moveName);
  const targetInfo = getMoveTargetInfo(moveName);
  const isSpread = targetInfo.isSpread;

  // Spread reduction applies when: doubles + spread move + ≥2 foes alive
  // (or for all-others: ≥2 targets alive, which includes the ally)
  const spreadApplied =
    isSpread &&
    (targetInfo.kind === "all-foes"
      ? localFoesAlive >= 2
      : // all-others: 2 targets when ally is alive, or still 2 foes
        localFoesAlive >= 2 || localAllyAlive);

  const { minPct, maxPct, factor } = applyOverrides(baseOutput, {
    crit,
    screen,
    spreadApplied,
  });

  // Tera type display for attacker header
  const attackerSpeciesTypes = getSpeciesTypes(attacker.species ?? "");
  const attackerType =
    showTera && attacker.tera_type
      ? attacker.tera_type
      : (attackerSpeciesTypes[0] ?? "Normal");

  // Prefer the recovery-aware tier when no local overrides are active (crit /
  // screen / spread). When overrides modify the damage, the recovery simulation
  // is no longer valid since it was computed from raw rolls.
  const baseVerdict = getVerdict(minPct, maxPct);
  const verdict: string | null =
    factor === 1 && baseOutput.recoveryTier
      ? baseOutput.recoveryTier
      : baseVerdict;

  const eff = getMoveEffectiveness(moveName, defender.species, weather);

  // Raw damage range from rolls — scaled by the same override factor used
  // for the percentages so the two readouts stay consistent.
  const rolls = baseOutput.rolls;
  const rawMin = rolls.length > 0 ? (rolls[0] ?? 0) : 0;
  const rawMax = rolls.length > 0 ? (rolls[rolls.length - 1] ?? 0) : 0;
  const dmgMin = Math.round(rawMin * factor);
  const dmgMax = Math.round(rawMax * factor);
  const defHp = baseOutput.defenderMaxHP;

  // KO tier styling
  const koClass =
    verdict === "OHKO"
      ? "mvdetail-ko--1"
      : verdict === "2HKO"
        ? "mvdetail-ko--2"
        : verdict === "3HKO"
          ? "mvdetail-ko--3"
          : "mvdetail-ko--4";

  return (
    <div className="mvdetail-card">
      {/* Header */}
      <div className="mvdetail-head">
        <span className="mvdetail-eyebrow">DAMAGE CALC</span>
        <div className="mvdetail-head-r">
          <button
            type="button"
            className="mvdetail-change-btn"
            onClick={onChangeMove}
            title="Change move"
          >
            Change move ▾
          </button>
          <button
            type="button"
            className="mvdetail-close"
            onClick={onClose}
            aria-label="Close damage detail"
          >
            ×
          </button>
        </div>
      </div>

      {/* Identity row: attacker → move → defender */}
      <div className="mvdetail-identity">
        <span className="mvdetail-mon">
          <TypeDot t={attackerType} size={9} />
          <b>{attacker.nickname ?? attacker.species ?? "—"}</b>
          {showTera && attacker.tera_type && (
            <span className="mvdetail-tera-tag">◇ Tera</span>
          )}
        </span>
        <span className="mvdetail-arrow">→</span>
        <span className="mvdetail-move">
          <TypeDot t={moveData?.type ?? "Normal"} size={9} />
          <b>{moveName}</b>
          {moveData?.basePower ? (
            <span className="mvdetail-bp muted">BP {moveData.basePower}</span>
          ) : null}
        </span>
        <span className="mvdetail-arrow">→</span>
        <span className="mvdetail-mon">
          <TypeDot
            t={
              (getSpeciesTypes(defender.species)[0] ?? "Normal") as string
            }
            size={9}
          />
          <b>{defender.species}</b>
        </span>
      </div>

      {/* Result block */}
      <div className="mvdetail-result">
        <div className={cn("mvdetail-bigpct", koClass !== "mvdetail-ko--4" && koClass)}>
          {minPct.toFixed(1)}
          <span className="mvdetail-pct-sep">–</span>
          {maxPct.toFixed(1)}
          <span className="mvdetail-pct-unit">%</span>
        </div>

        {verdict && (
          <div className={cn("mvdetail-ko", koClass)}>
            {verdict}
            {baseOutput.recoverySuffix && (
              <span className="mvdetail-recovery-tag">
                {" "}
                · {baseOutput.recoverySuffix}
              </span>
            )}
            {spreadApplied && (
              <span className="mvdetail-spread-tag"> · spread −25%</span>
            )}
          </div>
        )}

        <div className="mvdetail-meta">
          {dmgMin}–{dmgMax} dmg · vs {defHp} HP · {eff}× eff
        </div>
      </div>

      {/* Target row */}
      <div className="mvdetail-target-row">
        <span className="mvdetail-target-tag">
          {getMoveTargetLabel(targetInfo.kind)}
        </span>
        <span className="mvdetail-target-desc">
          {getMoveTargetDesc(targetInfo.kind)}
        </span>
      </div>

      {/* Toggle row: Crit / Terastallized / Screen up */}
      <div className="mvdetail-toggles">
        <label className="mvdetail-tog">
          <input
            type="checkbox"
            checked={crit}
            onChange={(e) => setCrit(e.target.checked)}
            className="mvdetail-tog-checkbox"
          />
          Crit
        </label>
        <label className="mvdetail-tog">
          <input
            type="checkbox"
            checked={screen}
            onChange={(e) => setScreen(e.target.checked)}
            className="mvdetail-tog-checkbox"
          />
          Screen up
        </label>
      </div>

      {/* Field row — only for spread moves */}
      {isSpread && (
        <div className="mvdetail-field-row">
          <span className="mvdetail-field-l">FIELD</span>

          <span className="mvdetail-field-grp">
            <span className="mvdetail-field-lbl">Foes</span>
            <button
              type="button"
              className={cn(
                "mvdetail-tog-btn",
                localFoesAlive === 1 && "mvdetail-tog-btn--on"
              )}
              onClick={() => setLocalFoesAlive(1)}
            >
              1
            </button>
            <button
              type="button"
              className={cn(
                "mvdetail-tog-btn",
                localFoesAlive === 2 && "mvdetail-tog-btn--on"
              )}
              onClick={() => setLocalFoesAlive(2)}
            >
              2
            </button>
          </span>

          {targetInfo.kind === "all-others" && (
            <span className="mvdetail-field-grp">
              <span className="mvdetail-field-lbl">Ally</span>
              <button
                type="button"
                className={cn(
                  "mvdetail-tog-btn",
                  localAllyAlive && "mvdetail-tog-btn--on"
                )}
                onClick={() => setLocalAllyAlive(true)}
              >
                alive
              </button>
              <button
                type="button"
                className={cn(
                  "mvdetail-tog-btn",
                  !localAllyAlive && "mvdetail-tog-btn--on"
                )}
                onClick={() => setLocalAllyAlive(false)}
              >
                fainted
              </button>
            </span>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div className="mvdetail-foot">
        Click outside to close. Right-click move cell to pick a different move.
      </div>
    </div>
  );
}
