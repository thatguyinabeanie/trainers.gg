"use client";

import { useState } from "react";

import { getMoveData, type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { MovePicker } from "../pickers/move-picker";

// =============================================================================
// Types
// =============================================================================

export interface CalcDefenderMovesProps {
  /** Effective 4 move slots (after default resolution). */
  effectiveMoves: [string, string, string, string];
  /** Defender species — passed to MovePicker. */
  defenderSpecies: string;
  /** Active game format — passed to MovePicker. */
  format: GameFormat | undefined;
  /** Called when the user picks a move for a slot. */
  onPick: (slotIdx: number, moveName: string) => void;
}

// =============================================================================
// DefenderMoveTile — one card in the 4-tile stack
// =============================================================================

interface DefenderMoveTileProps {
  slotIdx: number;
  moveName: string;
  defenderSpecies: string;
  format: GameFormat | undefined;
  onPick: (slotIdx: number, moveName: string) => void;
}

function DefenderMoveTile({
  slotIdx,
  moveName,
  defenderSpecies,
  format,
  onPick,
}: DefenderMoveTileProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEmpty = !moveName;
  const moveData = moveName ? getMoveData(moveName) : null;
  const moveType = moveData?.type ?? null;

  // Accuracy note
  const _accuracy =
    moveData?.accuracy === true || !moveData?.accuracy
      ? null
      : (moveData.accuracy as number);

  // Base power — omit for status moves (basePower === 0)
  const basePower = moveData?.basePower ?? 0;

  return (
    <Dialog
      open={pickerOpen}
      onOpenChange={(open) => {
        setPickerOpen(open);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "bg-card w-full rounded-md border p-2 text-left",
              "hover:border-border transition-colors",
              isEmpty ? "border-border/50 border-dashed" : "border-border/60"
            )}
            onClick={() => setPickerOpen(true)}
            aria-label={moveName ? `Change move: ${moveName}` : "Add move"}
          />
        }
      >
        {/* Type badge + move name + BP + accuracy + chevron */}
        <div className="flex items-center gap-1.5">
          {moveType ? (
            <TypeSymbolIcon
              type={moveType as Parameters<typeof TypeSymbolIcon>[0]["type"]}
              size={16}
            />
          ) : (
            <span className="inline-block size-4" aria-hidden />
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
            <span className="text-muted-foreground font-mono text-[9px]">
              BP {basePower}
            </span>
          )}
          <span className="text-muted-foreground text-[10px]" aria-hidden>
            ▾
          </span>
        </div>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100vh-2rem)] max-h-[1080px] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[1600px]"
      >
        <DialogTitle className="sr-only">Choose move</DialogTitle>
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
      </DialogContent>
    </Dialog>
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
  defenderSpecies,
  format,
  onPick,
}: CalcDefenderMovesProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Move list */}
      <div className="flex flex-col gap-1.5">
        {([0, 1, 2, 3] as const).map((slotIdx) => {
          const moveName = effectiveMoves[slotIdx] ?? "";

          return (
            <DefenderMoveTile
              key={slotIdx}
              slotIdx={slotIdx}
              moveName={moveName}
              defenderSpecies={defenderSpecies}
              format={format}
              onPick={onPick}
            />
          );
        })}
      </div>
    </div>
  );
}
