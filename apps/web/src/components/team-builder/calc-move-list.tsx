"use client";

import { getMoveData, getTypeColor } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { type CalcOutput } from "./use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcMoveListProps {
  /** All four move slots (`null` for empty slots — they are skipped). */
  moves: readonly (string | null)[];
  /** Per-move calc outputs, parallel to {@link moves}. */
  calcOutputs: readonly (CalcOutput | null)[];
  /** Index of the active move (0-3). */
  selectedMoveIdx: number;
  /** Crit toggle per move slot. */
  critMoves: readonly boolean[];
  onSelect: (idx: number) => void;
  onToggleCrit: (idx: number) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the attacker's filled move slots inside the Move accordion section.
 * Each row shows the move's live damage % (replacing BP/ACC). Click switches
 * the active move; the crit checkbox toggles crit independently per slot.
 */
export function CalcMoveList({
  moves,
  calcOutputs,
  selectedMoveIdx,
  critMoves,
  onSelect,
  onToggleCrit,
}: CalcMoveListProps) {
  // Filter out empty slots, but keep their original index for state lookups.
  const filled = moves
    .map((name, idx) => ({ name, idx }))
    .filter((m): m is { name: string; idx: number } => Boolean(m.name));

  if (filled.length === 0) {
    return (
      <p className="text-muted-foreground px-1 text-xs">
        No moves on this Pokémon yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {filled.map(({ name, idx }) => (
        <MoveRow
          key={idx}
          name={name}
          isActive={idx === selectedMoveIdx}
          isCrit={critMoves[idx] ?? false}
          output={calcOutputs[idx] ?? null}
          onSelect={() => onSelect(idx)}
          onToggleCrit={() => onToggleCrit(idx)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// MoveRow
// =============================================================================

interface MoveRowProps {
  name: string;
  isActive: boolean;
  isCrit: boolean;
  output: CalcOutput | null;
  onSelect: () => void;
  onToggleCrit: () => void;
}

function MoveRow({
  name,
  isActive,
  isCrit,
  output,
  onSelect,
  onToggleCrit,
}: MoveRowProps) {
  const moveData = getMoveData(name);
  const typeColor = moveData?.type
    ? getTypeColor(moveData.type as Parameters<typeof getTypeColor>[0])
    : "#9ca3af";
  const isStatus = moveData?.category === "Status";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`calc-move-row-${name}`}
      data-active={isActive ? "true" : "false"}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-muted/60"
      )}
    >
      <span
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: typeColor }}
        title={moveData?.type ?? "Unknown"}
      />

      <span className="min-w-0 flex-1 truncate text-xs">{name}</span>

      {output ? (
        <span
          data-testid={`calc-move-pct-${name}`}
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {output.minPercent}–{output.maxPercent}%
        </span>
      ) : (
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          —%
        </span>
      )}

      {!isStatus && (
        <label
          className={cn(
            "ml-1 flex shrink-0 cursor-pointer items-center gap-1 text-[10px]",
            isCrit ? "text-amber-700" : "text-muted-foreground"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isCrit}
            onChange={onToggleCrit}
            className="size-3 cursor-pointer rounded accent-amber-500"
            aria-label={`Crit toggle for ${name}`}
          />
          Crit
        </label>
      )}
    </button>
  );
}
