"use client";

import Image from "next/image";

import { type MoveData } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { CATEGORY_ICON_URLS } from "../move-category-ui";
import { TypeSymbolIcon } from "../type-symbol-icon";

// =============================================================================
// Types
// =============================================================================

interface MoveMobileRowProps {
  move: MoveData;
  /** Whether this row reflects the currently selected move. */
  isSelected?: boolean;
  /** Pre-looked-up usage % for this move, or undefined when no data exists. */
  usagePct?: number;
  /** Called when the row is tapped to pick this move. */
  onPick: (moveName: string) => void;
}

// =============================================================================
// MoveMobileRow
// =============================================================================

/**
 * Compact two-line move row for the mobile move picker drawer.
 *
 * Line 1: type icon + category icon + move name (bold, truncated) + BP + ACC + USG chip
 * Line 2: move's shortDesc (muted, truncated) — omitted when it's the
 *          generic "No additional effect." placeholder.
 *
 * Mirrors the visual density of SpeciesMobileRow without the expand/collapse
 * affordance — moves are simpler data objects.
 */
export function MoveMobileRow({
  move,
  isSelected,
  usagePct,
  onPick,
}: MoveMobileRowProps) {
  const categoryUrl = CATEGORY_ICON_URLS[move.category];
  const bp = move.basePower > 0 ? String(move.basePower) : "—";
  const acc =
    move.accuracy === true || !move.accuracy ? "—" : `${move.accuracy}%`;
  const desc =
    move.shortDesc && move.shortDesc !== "No additional effect."
      ? move.shortDesc
      : "";

  return (
    <button
      type="button"
      data-testid="move-mobile-row"
      aria-label={move.name}
      aria-pressed={isSelected}
      onClick={() => onPick(move.name)}
      className={cn(
        "flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left",
        "transition-colors active:bg-muted/50 hover:bg-muted/30",
        isSelected && "bg-primary/5"
      )}
    >
      {/* Type icon */}
      <div className="mt-0.5 shrink-0">
        <TypeSymbolIcon
          type={move.type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
          size={20}
        />
      </div>

      {/* Category icon */}
      <div className="mt-0.5 shrink-0">
        {categoryUrl ? (
          <Image
            src={categoryUrl}
            alt={move.category}
            width={32}
            height={14}
            unoptimized
            className="h-3.5 w-auto [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Content — name + stats + desc */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Line 1: name + BP + ACC + USG chip */}
        <span className="flex items-baseline justify-between gap-1">
          <span className="grow min-w-0 truncate text-sm font-semibold text-foreground">
            {move.name}
          </span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
            {/* BP */}
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase text-muted-foreground/60 text-[9px] mr-0.5">
                BP
              </span>
              {bp}
            </span>
            {/* ACC */}
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase text-muted-foreground/60 text-[9px] mr-0.5">
                ACC
              </span>
              {acc}
            </span>
            {/* USG chip — only when usage data exists and is non-zero */}
            {usagePct != null && usagePct > 0 && (
              <span
                className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                data-testid={`usg-move-${move.name}`}
              >
                {usagePct.toFixed(1)}%
              </span>
            )}
          </span>
        </span>

        {/* Line 2: short description */}
        {desc && (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            {desc}
          </span>
        )}
      </span>
    </button>
  );
}
