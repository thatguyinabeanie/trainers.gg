"use client";

/**
 * MobileMoveRow — compact single-move row for the mobile moves stack inside
 * CalcVersusView. Extracted from calc-versus-view.tsx so both the layout and
 * any future mobile-moves surface can import it without coupling to the full
 * versus-view module.
 *
 * Shares KO_COLORS / KO_LABELS / MOVE_SLOTS with MovesLane and CalcColumn via
 * calc-display-helpers so the two layouts stay visually consistent.
 */

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { MovePickerMobile } from "../pickers/move-picker-mobile";
import { type CalcOutput } from "../use-calc-state";
import {
  KO_COLORS,
  KO_LABELS,
  type MoveSlot,
  getDisplayRangeAndKoTier,
} from "./calc-display-helpers";

// =============================================================================
// Types
// =============================================================================

export interface MobileMoveRowProps {
  moveName: string | null;
  output: CalcOutput | null;
  format: GameFormat | undefined;
  calcEnabled: boolean;
  foesAlive: number;
  allyAlive: boolean;
  species: string;
  slotKey: MoveSlot;
  /** Whether the move is a Status-category move (no damage range to show). */
  isStatus: boolean;
  onPick: (slotKey: MoveSlot, moveName: string) => void;
}

// =============================================================================
// MobileMoveRow
// =============================================================================

/**
 * A single tappable move row for the mobile calc layout.
 *
 * Renders the move name on the left and the calc result (damage % + KO tier) on
 * the right when calc is enabled. Tapping opens a MovePickerMobile Drawer gated
 * behind `pickerOpen` so the Drawer only mounts when it needs to be visible —
 * prevents 8 live Drawers on a fully-loaded team card.
 */
export function MobileMoveRow({
  moveName,
  output,
  format,
  calcEnabled,
  foesAlive,
  allyAlive,
  species,
  slotKey,
  isStatus,
  onPick,
}: MobileMoveRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasCalc = calcEnabled && output !== null && !isStatus && !!moveName;

  const { koTier, displayMin, displayMax } = getDisplayRangeAndKoTier({
    moveName,
    output,
    hasCalc,
    foesAlive,
    allyAlive,
  });

  const koChance = output?.koChance ?? null;
  const showChance = koChance != null && koChance > 0 && koChance < 100;

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5",
          koTier === "1" &&
            "bg-[color-mix(in_oklch,var(--ko-red)_8%,transparent)]",
          koTier === "2" &&
            "bg-[color-mix(in_oklch,var(--ko-amber2-fg)_8%,transparent)]",
          koTier === "3" &&
            "bg-[color-mix(in_oklch,var(--ko-yellow-fg)_8%,transparent)]",
          koTier === "4" && "bg-muted/30",
          !koTier && "bg-transparent"
        )}
      >
        {/* Move name — left side */}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-medium",
            !moveName && "text-muted-foreground/50"
          )}
        >
          {moveName ?? "+ Add move"}
        </span>

        {/* Calc results — right side (only when calc is on and move exists) */}
        {hasCalc && koTier ? (
          <div className="flex shrink-0 items-center gap-2">
            {/* Damage % range */}
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
            </span>
            {/* KO tier */}
            <span
              className={cn(
                "font-mono text-xs font-extrabold tracking-wide uppercase",
                KO_COLORS[koTier] ?? "text-muted-foreground"
              )}
            >
              {showChance
                ? `${koChance % 1 === 0 ? koChance.toFixed(0) : koChance.toFixed(1)}% ${KO_LABELS[koTier] ?? "4HKO+"}`
                : (KO_LABELS[koTier] ?? "4HKO+")}
            </span>
          </div>
        ) : moveName && isStatus ? (
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            Status
          </span>
        ) : null}
      </button>
      {pickerOpen && (
        <MovePickerMobile
          open={pickerOpen}
          onOpenChange={(open) => {
            if (!open) setPickerOpen(false);
          }}
          value={moveName}
          species={species}
          format={format}
          onPick={(name) => {
            onPick(slotKey, name);
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}
