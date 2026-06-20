"use client";

import {
  getMoveData,
  getSpeciesTypes,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { getVerdict, type CalcOutput } from "../use-calc-state";
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
  /** Active or weather-ability-inferred weather, used to resolve Weather Ball type. */
  weather: string | null;
}

// =============================================================================
// CalcDetailCard
// =============================================================================

/**
 * Read-only per-move calc hover panel.
 *
 * Shows attacker → move → defender identity, damage % range, KO label,
 * raw damage / HP, effectiveness, and target classification. Shown on row
 * hover — no interactive toggles (Crit lives in the Sides field controls).
 */
export function CalcDetailCard({
  attacker,
  moveName,
  baseOutput,
  defender,
  format,
  weather,
}: CalcDetailCardProps) {
  const showTera = formatSupportsTera(format);

  const moveData = getMoveData(moveName, format?.id);
  const targetInfo = getMoveTargetInfo(moveName);

  // Render directly from baseOutput — no local override state
  const minPct = baseOutput.minPercent;
  const maxPct = baseOutput.maxPercent;

  // Tera type display for attacker header
  const attackerSpeciesTypes = getSpeciesTypes(attacker.species ?? "");
  const attackerType =
    showTera && attacker.tera_type
      ? attacker.tera_type
      : (attackerSpeciesTypes[0] ?? "Normal");

  // Use recovery-aware tier when available, fall back to computed verdict
  const verdict: string | null =
    baseOutput.recoveryTier ?? getVerdict(minPct, maxPct);

  const eff = getMoveEffectiveness(
    moveName,
    defender.species,
    weather,
    format?.id
  );

  // Raw damage range from rolls
  const rolls = baseOutput.rolls;
  const dmgMin = rolls.length > 0 ? (rolls[0] ?? 0) : 0;
  const dmgMax = rolls.length > 0 ? (rolls[rolls.length - 1] ?? 0) : 0;
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
      <div className="mvdetail-head">
        <span className="mvdetail-eyebrow">DAMAGE CALC</span>
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
            t={(getSpeciesTypes(defender.species)[0] ?? "Normal") as string}
            size={9}
          />
          <b>{defender.species}</b>
        </span>
      </div>

      {/* Result block */}
      <div className="mvdetail-result">
        <div
          className={cn(
            "mvdetail-bigpct",
            koClass !== "mvdetail-ko--4" && koClass
          )}
        >
          {minPct.toFixed(1)}
          <span className="mvdetail-pct-sep">–</span>
          {maxPct.toFixed(1)}
          <span className="mvdetail-pct-unit">%</span>
        </div>

        {verdict && (
          <div className={cn("mvdetail-ko", koClass)}>
            {baseOutput.koChance != null &&
            baseOutput.koChance > 0 &&
            baseOutput.koChance < 100
              ? `${baseOutput.koChance % 1 === 0 ? baseOutput.koChance.toFixed(0) : baseOutput.koChance.toFixed(1)}% chance to OHKO`
              : verdict}
            {baseOutput.recoverySuffix && (
              <span className="mvdetail-recovery-tag">
                {" "}
                · {baseOutput.recoverySuffix}
              </span>
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
    </div>
  );
}
