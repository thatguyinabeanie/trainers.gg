"use client";

import { toast } from "sonner";

import { getMoveData } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useCalcStateContext } from "../calc/calc-state-context";
import { useDefenderMoves } from "../calc/use-defender-moves";
import { type CalcOutput } from "../../use-calc-state";
import { TypeSymbolIcon } from "../../type-symbol-icon";
import { getDisplayRangeAndKoTier } from "./calc-display-helpers";
import { useTeamLayoutMode } from "../use-team-layout";

// =============================================================================
// CalcReverseColumn (full-width bottom strip)
// =============================================================================

interface CalcReverseColumnProps {
  pokemon: Tables<"pokemon"> | null;
  teammates: Tables<"pokemon">[];
}

const KO_TEXT: Record<string, string> = {
  "1": "text-destructive",
  "2": "text-yellow-600 dark:text-yellow-300",
  "3": "text-orange-500 dark:text-orange-400",
  "4": "text-muted-foreground",
};

const KO_LABEL: Record<string, string> = {
  "1": "OHKO",
  "2": "2HKO",
  "3": "3HKO",
  "4": "4HKO+",
};

/**
 * Full-width strip at the bottom of ActiveRow showing incoming damage
 * from the defender's 4 moves. Renders as inline strip in 1x6 layout,
 * or as an aligned table in vertical/grid layouts.
 */
export function CalcReverseColumn({ pokemon, teammates }: CalcReverseColumnProps) {
  const calc = useCalcStateContext();
  const layoutMode = useTeamLayoutMode();
  const { effectiveMoves } = useDefenderMoves({
    defenderSpecies: calc.defenderSpecies,
    defenderMoves: calc.defenderMoves,
    teammates,
  });
  const outputs = calc.computeReverseOutputsForRow(pokemon, effectiveMoves);
  const hasPokemon = pokemon !== null;
  const hasDefender = Boolean(calc.defenderSpecies);

  if (!hasDefender) return null;

  const moves = ([0, 1, 2, 3] as const).map((idx) => {
    const moveName = effectiveMoves[idx] ?? null;
    const output = outputs[idx] ?? null;
    const moveData = moveName ? getMoveData(moveName) : null;
    const isStatus = moveData?.category === "Status";
    const hasCalc =
      hasPokemon && moveName !== null && output !== null && !isStatus;

    const { displayMin, displayMax, koTier } = getDisplayRangeAndKoTier({
      moveName,
      output,
      hasCalc,
      foesAlive: calc.field.foesAlive,
      allyAlive: calc.field.allyAlive,
    });

    return { moveName, moveData, isStatus, hasCalc, displayMin, displayMax, koTier, koChance: output?.koChance ?? null, desc: output?.desc ?? null };
  });

  const activeMoves = moves.filter((m) => m.moveName !== null);
  const isVertical = layoutMode !== "1x6";

  if (isVertical) {
    return (
      <div className="flex items-center border-t border-border/40 bg-destructive/[0.03] px-2 py-1">
        <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-destructive/80 mr-2">
          Incoming
        </span>
        <div className="flex flex-col">
            {activeMoves.map((m, i) => {
              const moveType = m.moveData?.type ?? null;
              return (
                <Tooltip key={i}>
                  <TooltipTrigger
                    render={
                      m.hasCalc && m.desc ? (
                        <button
                          type="button"
                          aria-label={`Copy damage calc for ${m.moveName}`}
                          className="flex items-center gap-1 py-px cursor-pointer hover:bg-muted/50 rounded"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(m.desc!);
                            } catch {
                              toast.error("Couldn't copy to clipboard");
                            }
                          }}
                        />
                      ) : (
                        <span
                          className="flex items-center gap-1 py-px"
                        />
                      )
                    }
                  >
                    {/* Bullet + Type icon */}
                    <span className="flex items-center gap-1 w-[28px] shrink-0">
                      <span className="text-border text-[9px]">•</span>
                      {moveType && (
                        <TypeSymbolIcon
                          type={moveType as Parameters<typeof TypeSymbolIcon>[0]["type"]}
                        />
                      )}
                    </span>
                    {/* Move name */}
                    <span className="whitespace-nowrap text-[9px] font-medium text-foreground/80 mr-2">
                      {m.moveName}
                    </span>
                    {/* Damage range */}
                    <span className="whitespace-nowrap font-mono text-[9px] tabular-nums text-foreground/60 mr-1">
                      {m.hasCalc
                        ? `${m.displayMin.toFixed(1)}–${m.displayMax.toFixed(1)}%`
                        : m.isStatus
                          ? "—"
                          : ""}
                    </span>
                    {/* KO tier */}
                    <span className={cn("whitespace-nowrap font-mono text-[9px] font-black uppercase", m.hasCalc && m.koTier ? KO_TEXT[m.koTier] : "")}>
                      {m.hasCalc && m.koTier
                        ? m.koChance != null && m.koChance > 0 && m.koChance < 100
                          ? `${m.koChance % 1 === 0 ? m.koChance.toFixed(0) : m.koChance.toFixed(1)}% ${KO_LABEL[m.koTier]}`
                          : KO_LABEL[m.koTier]
                        : ""}
                    </span>
                    {/* Copy icon */}
                    {m.hasCalc && m.desc && (
                      <span className="ml-1 text-muted-foreground/60">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="5" y="5" width="9" height="9" rx="1.5" />
                          <path d="M4 11H3.5A1.5 1.5 0 012 9.5V3.5A1.5 1.5 0 013.5 2h6A1.5 1.5 0 0111 3.5V4" />
                        </svg>
                      </span>
                    )}
                  </TooltipTrigger>
                  {m.hasCalc && m.desc && (
                    <TooltipContent side="bottom" className="max-w-[560px] overflow-hidden border border-border bg-popover text-popover-foreground p-0">
                      <div className="flex flex-col gap-1.5 p-3">
                        <p className="text-[13px] leading-relaxed font-mono whitespace-normal">
                          {m.desc}
                        </p>
                        <span className="text-[10px] opacity-60">
                          Click to copy
                        </span>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
        </div>
      </div>
    );
  }

  // Horizontal (1x6) — inline strip
  return (
    <div className="flex items-center border-t border-border/40 bg-destructive/[0.03] px-2 py-0.5 overflow-x-auto">
      {/* Label */}
      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-destructive/80">
        Incoming
      </span>

      {/* Moves — left-aligned, wrap when narrow */}
      <div className="flex-1 flex items-center flex-wrap gap-y-0.5 ml-2">
      {activeMoves.map((m, i) => {
        const moveType = m.moveData?.type ?? null;

        return (
          <Tooltip key={i}>
            <TooltipTrigger
              render={
                m.hasCalc && m.desc ? (
                  <button
                    type="button"
                    aria-label={`Copy damage calc for ${m.moveName}`}
                    className="flex items-center shrink-0 cursor-pointer hover:bg-muted/50 rounded"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(m.desc!);
                      } catch {
                        toast.error("Couldn't copy to clipboard");
                      }
                    }}
                  />
                ) : (
                  <span
                    className="flex items-center shrink-0"
                  />
                )
              }
            >
            {/* Bullet separator */}
            <span className="text-border mr-1.5">•</span>

            {/* Type icon */}
            {moveType && (
              <TypeSymbolIcon
                type={moveType as Parameters<typeof TypeSymbolIcon>[0]["type"]}
              />
            )}

            {/* Move name */}
            <span className="text-[9px] font-medium text-foreground/80 ml-0.5 whitespace-nowrap">
              {m.moveName}
            </span>

            {/* Damage range */}
            {m.hasCalc ? (
              <span className="ml-1.5 font-mono text-[9px] tabular-nums text-foreground/60 whitespace-nowrap">
                {m.displayMin.toFixed(1)}–{m.displayMax.toFixed(1)}%
              </span>
            ) : m.isStatus ? (
              <span className="ml-1 text-[8.5px] italic text-muted-foreground/40">—</span>
            ) : null}

            {/* KO tier */}
            {m.hasCalc && m.koTier && (
              <span className={cn("ml-1 font-mono text-[9px] font-black uppercase", KO_TEXT[m.koTier])}>
                {m.koChance != null && m.koChance > 0 && m.koChance < 100
                  ? `${m.koChance % 1 === 0 ? m.koChance.toFixed(0) : m.koChance.toFixed(1)}% ${KO_LABEL[m.koTier]}`
                  : KO_LABEL[m.koTier]}
              </span>
            )}

            {/* Copy icon */}
            {m.hasCalc && m.desc && (
              <span className="ml-1 text-muted-foreground/60">
                <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" />
                  <path d="M4 11H3.5A1.5 1.5 0 012 9.5V3.5A1.5 1.5 0 013.5 2h6A1.5 1.5 0 0111 3.5V4" />
                </svg>
              </span>
            )}
            </TooltipTrigger>
            {m.hasCalc && m.desc && (
              <TooltipContent side="bottom" className="max-w-[560px] overflow-hidden border border-border bg-popover text-popover-foreground p-0">
                <div className="flex flex-col gap-1.5 p-3">
                  <p className="text-[13px] leading-relaxed font-mono whitespace-normal">
                    {m.desc}
                  </p>
                  <span className="text-[10px] opacity-60">
                    Click to copy
                  </span>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
      </div>
    </div>
  );
}
