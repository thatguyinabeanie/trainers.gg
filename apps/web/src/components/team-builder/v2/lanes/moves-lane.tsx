"use client";

import { useState, useCallback, type ReactNode } from "react";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { type ValidationError } from "../../validation-hooks";
import { CATEGORY_ICON_URLS_MONO } from "../../move-category-ui";
import { TypeSymbolIcon } from "../../type-symbol-icon";
import { MovePicker } from "../pickers/move-picker";
import {
  useCalcStateContext,
  useCalcEnabled,
} from "../calc/calc-state-context";
import { CalcDetailCard } from "../calc/calc-detail-card";
import { getDisplayRangeAndKoTier } from "./calc-display-helpers";
import { FieldErrors } from "../validation/field-error";
import { DescriptionTooltip } from "./description-tooltip";

// =============================================================================
// Types
// =============================================================================

interface MovesLaneProps {
  pokemon: Tables<"pokemon"> | null;
  format?: GameFormat;
  onUpdate?: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to move fields (move1–move4). */
  fieldErrors?: ValidationError[];
}

type MoveSlot = "move1" | "move2" | "move3" | "move4";

/** Which popover panel is open for a tile. */
type TilePanel = "detail" | "picker" | null;

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS: MoveSlot[] = ["move1", "move2", "move3", "move4"];

/** Map move slot key to parallel array index. */
const SLOT_IDX: Record<MoveSlot, number> = {
  move1: 0,
  move2: 1,
  move3: 2,
  move4: 3,
};

// =============================================================================
// CalcRange — displays the damage percentage range (e.g., "41.5–49.0%")
// =============================================================================

function CalcRange({
  min,
  max,
  empty,
}: {
  min: number;
  max: number;
  empty?: boolean;
}) {
  return (
    <span className="text-[11px] font-medium tabular-nums">
      {empty ? "—" : `${min.toFixed(1)}–${max.toFixed(1)}%`}
    </span>
  );
}

// =============================================================================
// KoLabel — displays the KO tier badge (OHKO, 2HKO, 3HKO, 4HKO+)
// =============================================================================

const KO_LABELS: Record<string, string> = {
  "1": "OHKO",
  "2": "2HKO",
  "3": "3HKO",
  "4": "4HKO+",
};

const KO_COLORS: Record<string, string> = {
  "1": "text-[var(--ko-red)]",
  "2": "text-[var(--ko-amber2-fg)]",
  "3": "text-[var(--ko-yellow-fg)]",
  "4": "text-muted-foreground",
};

function KoLabel({ tier, koChance }: { tier: string; koChance?: number | null }) {
  // Show "87.5% OHKO" when chance is between 0-100 exclusive
  const showChance = koChance != null && koChance > 0 && koChance < 100;
  return (
    <span
      className={cn(
        "text-[9px] font-extrabold tracking-wide uppercase",
        KO_COLORS[tier] ?? "text-muted-foreground"
      )}
    >
      {showChance
        ? `${koChance % 1 === 0 ? koChance.toFixed(0) : koChance.toFixed(1)}% ${KO_LABELS[tier] ?? "4HKO+"}`
        : (KO_LABELS[tier] ?? "4HKO+")}
    </span>
  );
}

// =============================================================================
// CalcDescTooltip — rich tooltip showing the full calc description
// =============================================================================

function CalcDescTooltip({ desc, children }: { desc: string; children: ReactNode }) {
  return (
    <Tooltip>
      {children}
      <TooltipContent side="bottom" className="max-w-[560px] overflow-hidden border border-border bg-popover text-popover-foreground p-0">
        <div className="flex flex-col gap-1.5 p-3">
          <p className="text-[13px] leading-relaxed font-mono whitespace-normal">
            {desc}
          </p>
          <span className="text-[10px] opacity-60">
            Click to copy
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// CalcCopyButton — copies the full calc description to clipboard on click
// =============================================================================

function CalcCopyButton({ desc }: { desc: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(desc);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [desc]
  );

  return (
    <CalcDescTooltip desc={desc}>
      <TooltipTrigger
        render={<span />}
        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? (
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 8 7 12 13 4" />
          </svg>
        ) : (
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M4 11H3.5A1.5 1.5 0 012 9.5V3.5A1.5 1.5 0 013.5 2h6A1.5 1.5 0 0111 3.5V4" />
          </svg>
        )}
      </TooltipTrigger>
    </CalcDescTooltip>
  );
}

// =============================================================================
// MoveTile — one calc-aware move row (renders as <tr> inside table)
// =============================================================================

interface MoveTileProps {
  slotKey: MoveSlot;
  moveName: string | null;
  species: string;
  format: GameFormat | undefined;
  attacker: Tables<"pokemon">;
  onPick: (slotKey: MoveSlot, moveName: string) => void;
  /** Validation errors for this specific move slot. */
  slotErrors: ValidationError[];
}

function MoveTile({
  slotKey,
  moveName,
  species,
  format,
  attacker,
  onPick,
  slotErrors,
}: MoveTileProps) {
  const [panel, setPanel] = useState<TilePanel>(null);

  const calc = useCalcStateContext();
  const moveIdx = SLOT_IDX[slotKey];
  const rowOutputs = calc.computeForwardOutputsForRow(attacker);
  const output = rowOutputs[moveIdx] ?? null;

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  const hasCalc = calc.calcEnabled && output !== null && !isStatus;

  const foesAlive = calc.field.foesAlive;
  const allyAlive = calc.field.allyAlive;

  const { koTier, displayMin, displayMax } = getDisplayRangeAndKoTier({
    moveName,
    output,
    hasCalc,
    foesAlive,
    allyAlive,
  });

  const hasError = slotErrors.some((e) => e.severity === "error");

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPanel("picker");
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!moveName) {
      setPanel("picker");
      return;
    }
    if (hasCalc) {
      setPanel("detail");
    } else {
      setPanel("picker");
    }
  }

  const detailOpen = panel === "detail";
  const pickerOpen = panel === "picker";

  return (
    <>
      <Popover
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open && panel === "detail") setPanel(null);
        }}
      >
        <PopoverTrigger
          render={
            <TableRow
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              className={cn(
                "cursor-pointer border-none transition-colors",
                "[&_td]:border-y [&_td]:border-transparent [&_td]:transition-colors",
                "[&_td:first-child]:rounded-l-md [&_td:first-child]:border-l",
                "[&_td:last-child]:rounded-r-md [&_td:last-child]:border-r",
                "hover:[&_td]:border-border hover:[&_td]:bg-muted",
                koTier === "1" &&
                  "[&_td]:border-[color-mix(in_oklch,var(--ko-red)_50%,var(--border))] [&_td]:bg-[color-mix(in_oklch,var(--ko-red)_8%,transparent)]",
                koTier === "2" &&
                  "[&_td]:border-[color-mix(in_oklch,var(--ko-amber2-fg)_50%,var(--border))] [&_td]:bg-[color-mix(in_oklch,var(--ko-amber2-fg)_8%,transparent)]",
                koTier === "3" &&
                  "[&_td]:border-[color-mix(in_oklch,var(--ko-yellow-fg)_50%,var(--border))] [&_td]:bg-[color-mix(in_oklch,var(--ko-yellow-fg)_8%,transparent)]",
                koTier === "4" && "[&_td]:border-border/50 [&_td]:bg-muted/30",
                hasError && "ring-destructive/50 ring-1"
              )}
            />
          }
        >
          {/* Type icon */}
          <TableCell className="w-6 p-1 align-middle">
            {moveName && moveData?.type ? (
              <TypeSymbolIcon
                type={
                  moveData.type as Parameters<typeof TypeSymbolIcon>[0]["type"]
                }
                size={20}
              />
            ) : null}
          </TableCell>

          {/* Category icon */}
          <TableCell className="w-8 p-1 align-middle">
            {moveName &&
            moveData?.category &&
            CATEGORY_ICON_URLS_MONO[moveData.category] ? (
              <img
                src={CATEGORY_ICON_URLS_MONO[moveData.category]}
                alt={moveData.category}
                className="h-6 w-6 shrink-0"
              />
            ) : null}
          </TableCell>

          {/* Move name */}
          <TableCell className="max-w-[140px] p-1 align-middle">
            <DescriptionTooltip
              description={moveName ? moveData?.shortDesc : null}
              showContent={panel === null}
            >
              <TooltipTrigger
                render={<span />}
                className={cn(
                  "block max-w-[140px] truncate text-[13px] font-medium",
                  !moveName && "text-muted-foreground/50"
                )}
              >
                {moveName ?? "+ Add move"}
              </TooltipTrigger>
            </DescriptionTooltip>
          </TableCell>

          {/* Base Power */}
          <TableCell className="text-muted-foreground p-1 align-middle font-mono text-[11px] tabular-nums">
            {moveName && moveData?.basePower && moveData.basePower > 0
              ? moveData.basePower
              : moveName
                ? "—"
                : ""}
          </TableCell>

          {/* Accuracy */}
          <TableCell className="text-muted-foreground p-1 align-middle font-mono text-[11px] tabular-nums">
            {moveName
              ? moveData?.accuracy === true || !moveData?.accuracy
                ? "—"
                : moveData.accuracy
              : ""}
          </TableCell>

          {/* Calc damage (raw HP) */}
          {calc.calcEnabled && (
            <TableCell className="p-1 pl-2 whitespace-nowrap">
              {hasCalc && koTier && output?.rolls.length ? (
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {output.rolls[0] ?? 0}–{output.rolls[output.rolls.length - 1] ?? 0}
                </span>
              ) : (
                <span className="text-muted-foreground text-[13px]">—</span>
              )}
            </TableCell>
          )}

          {/* Calc percent */}
          {calc.calcEnabled && (
            <TableCell className="p-1 whitespace-nowrap">
              {hasCalc && koTier ? (
                <CalcRange min={displayMin} max={displayMax} />
              ) : (
                <span className="text-muted-foreground text-[13px]">—</span>
              )}
            </TableCell>
          )}

          {/* KO tier label */}
          {calc.calcEnabled && (
            <TableCell className="p-1 whitespace-nowrap">
              {hasCalc && koTier ? (
                <KoLabel tier={koTier} koChance={output?.koChance} />
              ) : (
                <span className="text-muted-foreground text-[13px]">—</span>
              )}
            </TableCell>
          )}

          {/* Copy calc description */}
          {calc.calcEnabled && (
            <TableCell className="w-6 p-0.5 align-middle">
              {hasCalc && output?.desc ? (
                <CalcCopyButton desc={output.desc} />
              ) : null}
            </TableCell>
          )}
        </PopoverTrigger>

        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          {detailOpen && moveName && output ? (
            <CalcDetailCard
              attacker={attacker}
              moveName={moveName}
              baseOutput={output}
              defender={{
                species: calc.defenderSpecies,
                ability: calc.defenderAbility,
                item: calc.defenderItem,
                nature: calc.defenderNature,
              }}
              format={format}
              foesAlive={foesAlive}
              allyAlive={allyAlive}
              weather={calc.weather || calc.inferredWeather}
              onClose={() => setPanel(null)}
              onChangeMove={() => setPanel("picker")}
            />
          ) : null}
        </PopoverContent>
      </Popover>

      {/* Move picker — centered Dialog modal */}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          if (!open && panel === "picker") setPanel(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100vh-2rem)] max-h-[1080px] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[1600px]"
        >
          <DialogTitle className="sr-only">Choose move</DialogTitle>
          <MovePicker
            value={moveName}
            species={species}
            format={format}
            onPick={(name) => {
              onPick(slotKey, name);
              setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Inline error chips — rendered as a full-colspan row */}
      {slotErrors.length > 0 && (
        <tr>
          <td colSpan={calc.calcEnabled ? 8 : 5} className="p-0 pt-0.5 pb-1">
            <FieldErrors errors={slotErrors} />
          </td>
        </tr>
      )}
    </>
  );
}

function MovesLaneTileGhost() {
  const calcEnabled = useCalcEnabled();
  return (
    <TableHeader>
      <TableRow className="border-none">
        <TableHead className="!h-auto w-6 border-none p-0 pb-0.5" />
        <TableHead className="!h-auto w-8 border-none p-0 pb-0.5" />
        <TableHead className="text-muted-foreground !h-auto border-none p-0 pb-0.5 text-[9.5px] font-medium tracking-[0.04em] uppercase">
          NAME
        </TableHead>
        <TableHead className="text-muted-foreground !h-auto w-11 border-none p-0 pb-0.5 text-[9.5px] font-medium tracking-[0.04em] uppercase">
          BP
        </TableHead>
        <TableHead className="text-muted-foreground !h-auto w-12 border-none p-0 pb-0.5 text-[9.5px] font-medium tracking-[0.04em] uppercase">
          ACC
        </TableHead>
        {calcEnabled && (
          <TableHead className="text-muted-foreground !h-auto border-none p-0 pb-0.5">
            DAMAGE
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className="text-muted-foreground !h-auto border-none p-0 pb-0.5">
            %
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className="text-muted-foreground !h-auto border-none p-0 pb-0.5">
            HITS
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className="!h-auto w-6 border-none p-0 pb-0.5" />
        )}
      </TableRow>
    </TableHeader>
  );
}

// =============================================================================
// MovesLaneGhost — purely visual placeholder, no hooks
// =============================================================================

function MovesLaneGhost() {
  const calcEnabled = useCalcEnabled();
  return (
    <div className={cn("border-border/60 flex min-w-0 flex-1 flex-col border-r border-dashed px-3 py-1 transition-[padding,flex] duration-300 ease-in-out")}>
      <Table className="w-full border-separate border-spacing-y-[3px]">
        <MovesLaneTileGhost />
        <TableBody>
          {([0, 1, 2, 3] as const).map((i) => (
            <TableRow key={i} className="border-none">
              <TableCell className="w-6 p-1" />
              <TableCell className="w-8 p-1" />
              <TableCell className="p-1">
                <span className="text-muted-foreground/30 text-[13px] font-medium">
                  + Add move
                </span>
              </TableCell>
              <TableCell className="w-11 p-1  font-mono text-[11px] tabular-nums" />
              <TableCell className="w-12 p-1  font-mono text-[11px] tabular-nums" />
              {calcEnabled && <TableCell className="p-1 pl-3" />}
              {calcEnabled && <TableCell className="p-1" />}
              {calcEnabled && <TableCell className="p-1" />}
              {calcEnabled && <TableCell className="w-6 p-0.5" />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// MovesLaneReal — calc-aware move tiles (requires pokemon)
// =============================================================================

interface MovesLaneRealProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  fieldErrors: ValidationError[];
}

function MovesLaneReal({
  pokemon,
  format,
  onUpdate,
  fieldErrors,
}: MovesLaneRealProps) {
  const calc = useCalcStateContext();
  function handlePick(slotKey: MoveSlot, name: string) {
    onUpdate({ [slotKey]: name });
  }

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col px-3 py-1 transition-[padding,flex] duration-300 ease-in-out")}>
      <Table className="w-full border-separate border-spacing-y-[3px]">
        <MovesLaneTileGhost />
        <TableBody>
          {MOVE_SLOTS.map((slotKey) => {
            const slotErrors = fieldErrors.filter((e) => e.field === slotKey);
            return (
              <MoveTile
                key={slotKey}
                slotKey={slotKey}
                moveName={pokemon[slotKey] || null}
                species={pokemon.species ?? ""}
                format={format}
                attacker={pokemon}
                onPick={handlePick}
                slotErrors={slotErrors}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// MovesLane — public export, dispatches to ghost or real branch
// =============================================================================

/**
 * Vertical stack of 4 calc-aware move tiles.
 *
 * When `pokemon` is null, renders purely visual ghost content (4 static
 * placeholder tiles) with no interactive elements and no hook calls.
 *
 * When `pokemon` is set:
 * - Left-click: opens CalcDetailCard when calc data is available, else picker.
 * - Right-click: always opens move picker.
 * - Renders inline FieldError chips for move-scoped validation issues.
 */
export function MovesLane({
  pokemon,
  format,
  onUpdate,
  fieldErrors = [],
}: MovesLaneProps) {
  if (pokemon === null) return <MovesLaneGhost />;
  return (
    <MovesLaneReal
      pokemon={pokemon}
      format={format}
      onUpdate={onUpdate ?? (() => {})}
      fieldErrors={fieldErrors}
    />
  );
}
