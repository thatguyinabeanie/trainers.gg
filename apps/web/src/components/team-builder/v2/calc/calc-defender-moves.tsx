"use client";

import { useState } from "react";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { type CalcOutput, getVerdict, type UseCalcStateReturn } from "../../use-calc-state";
import { MovePicker } from "../pickers/move-picker";

// =============================================================================
// Types
// =============================================================================

export interface CalcDefenderMovesProps {
  /** Effective 4 move slots (after default resolution). */
  effectiveMoves: [string, string, string, string];
  /**
   * Function from useCalcState to compute a single reverse-direction output.
   * Passed instead of a pre-computed array so we can use effective move names
   * (which may come from preset defaults not stored in defenderMoves state).
   */
  computeReverseOutput: UseCalcStateReturn["computeReverseOutput"];
  /** Max HP of the active attacker (our pokemon), for the "X–Y / HP" line. */
  attackerHP: number | null;
  /** Defender species — passed to MovePicker. */
  defenderSpecies: string;
  /** Active game format — passed to MovePicker. */
  format: GameFormat | undefined;
  /** Called when the user picks a move for a slot. */
  onPick: (slotIdx: number, moveName: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** KO tier → Tailwind text-color class for the damage % display. */
const KO_TIER_COLOR: Record<string, string> = {
  OHKO: "text-destructive",
  "2HKO": "text-yellow-400 dark:text-yellow-300",
  "3HKO": "text-orange-400",
  "4HKO+": "text-muted-foreground",
};

/** Moves that cause an SpA self-drop after use. */
const SPA_DROP_MOVES = new Set([
  "Draco Meteor",
  "Leaf Storm",
  "Overheat",
  "Psycho Boost",
  "Glacial Lance",
]);

/** Moves that cause a Def+SpD self-drop (like Close Combat). */
const DEF_DROP_MOVES = new Set(["Close Combat", "Superpower"]);

/** Moves that switch the user out after use. */
const PIVOT_MOVES = new Set([
  "U-turn",
  "Volt Switch",
  "Flip Turn",
  "Parting Shot",
  "Teleport",
]);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve the KO tier string from a CalcOutput.
 * Returns "OHKO" | "2HKO" | "3HKO" | "4HKO+" | null.
 */
function resolveKoTierLabel(
  minPercent: number,
  maxPercent: number
): string | null {
  const verdict = getVerdict(minPercent, maxPercent);
  if (verdict === "OHKO") return "OHKO";
  if (verdict === "2HKO") return "2HKO";
  if (verdict === "3HKO") return "3HKO";
  if (maxPercent > 0) return "4HKO+";
  return null;
}

/**
 * Extra note for the detail line — self-debuff or pivot hint.
 */
function getMoveExtraNote(moveName: string): string | null {
  if (SPA_DROP_MOVES.has(moveName)) return "−2 SpA after";
  if (DEF_DROP_MOVES.has(moveName)) return "−1 Def/SpD after";
  if (PIVOT_MOVES.has(moveName)) return "pivots out";
  return null;
}

// =============================================================================
// DefenderMoveTile — one card in the 4-tile stack
// =============================================================================

interface DefenderMoveTileProps {
  slotIdx: number;
  moveName: string;
  computeReverseOutput: UseCalcStateReturn["computeReverseOutput"];
  attackerHP: number | null;
  defenderSpecies: string;
  format: GameFormat | undefined;
  onPick: (slotIdx: number, moveName: string) => void;
}

function DefenderMoveTile({
  slotIdx,
  moveName,
  computeReverseOutput,
  attackerHP,
  defenderSpecies,
  format,
  onPick,
}: DefenderMoveTileProps) {
  // Compute the reverse calc output using the effective move name. This runs
  // for both user-set overrides and preset/teammate defaults.
  const output: CalcOutput | null = moveName
    ? computeReverseOutput(moveName)
    : null;
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEmpty = !moveName;
  const moveData = moveName ? getMoveData(moveName) : null;
  const moveType = moveData?.type ?? null;

  // KO tier + damage %
  const koTierLabel =
    output && !isEmpty
      ? resolveKoTierLabel(output.minPercent, output.maxPercent)
      : null;

  // Raw damage range — rolls are sorted ascending by @smogon/calc
  const dmgMin = output?.rolls.length ? output.rolls[0] : null;
  const dmgMax = output?.rolls.length ? output.rolls[output.rolls.length - 1] : null;

  // Accuracy note
  const accuracy =
    moveData?.accuracy === true || !moveData?.accuracy
      ? null
      : (moveData.accuracy as number);

  // Base power — omit for status moves (basePower === 0)
  const basePower = moveData?.basePower ?? 0;

  // Extra note (debuff / pivot)
  const extraNote = moveName ? getMoveExtraNote(moveName) : null;

  const isOhko = koTierLabel === "OHKO";

  return (
    <Popover
      open={pickerOpen}
      onOpenChange={(open) => {
        setPickerOpen(open);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-full rounded-md border bg-card p-2 text-left",
              "transition-colors hover:border-border",
              isEmpty
                ? "border-dashed border-border/50"
                : "border-border/60",
              isOhko && "dmv-tile--ohko"
            )}
            onClick={() => setPickerOpen(true)}
            aria-label={moveName ? `Change move: ${moveName}` : "Add move"}
          />
        }
      >
        {/* Row 1: type badge + move name + BP + accuracy + chevron */}
        <div className="flex items-center gap-1.5">
          {moveType ? (
            <img
              src={getShowdownTypeIconUrl(moveType)}
              alt={moveType}
              className="h-4 w-auto [image-rendering:pixelated]"
            />
          ) : (
            <span className="inline-block h-4 w-8" aria-hidden />
          )}
          <span
            className={cn(
              "flex-1 text-[11.5px] font-medium",
              isEmpty && "text-muted-foreground/60 italic"
            )}
          >
            {moveName || "+ Add move"}
          </span>
          {basePower > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground">
              BP {basePower}
            </span>
          )}
          {accuracy !== null && (
            <span className="font-mono text-[9px] text-muted-foreground">
              · {accuracy}% acc
            </span>
          )}
          <span className="text-[10px] text-muted-foreground" aria-hidden>
            ▾
          </span>
        </div>

        {/* Row 2: damage % · KO tier · HP range · contextual notes */}
        {output && koTierLabel && (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-[12px] font-bold",
                KO_TIER_COLOR[koTierLabel] ?? "text-muted-foreground"
              )}
            >
              {output.minPercent.toFixed(1)}–{output.maxPercent.toFixed(1)}%
            </span>
            <span className="h-[10px] w-px flex-shrink-0 bg-border" aria-hidden />
            <span className="font-mono text-[9px] text-muted-foreground">
              {koTierLabel}
            </span>
            {dmgMin !== null && dmgMax !== null && (
              <>
                <span className="h-[10px] w-px flex-shrink-0 bg-border" aria-hidden />
                <span className="font-mono text-[9px] text-muted-foreground">
                  {dmgMin}–{dmgMax}
                  {attackerHP !== null ? ` / ${attackerHP} HP` : ""}
                </span>
              </>
            )}
            {extraNote && (
              <span className="font-mono text-[9px] text-teal-500 dark:text-teal-400">
                · {extraNote}
              </span>
            )}
          </div>
        )}
      </PopoverTrigger>

      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <MovePicker
          value={moveName || null}
          species={defenderSpecies}
          format={format}
          onPick={(name) => {
            onPick(slotIdx, name);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// CalcDefenderMoves
// =============================================================================

/**
 * The "Their moves" sub-column in the defender block.
 * Shows 4 vertically stacked move cards, each with:
 * - Type icon + move name + picker chevron
 * - KO tier pill with damage %
 * - Raw damage range + optional acc / debuff / pivot notes
 */
export function CalcDefenderMoves({
  effectiveMoves,
  computeReverseOutput,
  attackerHP,
  defenderSpecies,
  format,
  onPick,
}: CalcDefenderMovesProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Sub-column header */}
      <div className="mb-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-destructive">
        Their moves → your atk
      </div>

      {/* 4 move tiles */}
      {([0, 1, 2, 3] as const).map((slotIdx) => {
        const moveName = effectiveMoves[slotIdx] ?? "";

        return (
          <DefenderMoveTile
            key={slotIdx}
            slotIdx={slotIdx}
            moveName={moveName}
            computeReverseOutput={computeReverseOutput}
            attackerHP={attackerHP}
            defenderSpecies={defenderSpecies}
            format={format}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}
