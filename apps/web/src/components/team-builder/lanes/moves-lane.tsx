"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { type ValidationError } from "../validation-hooks";
import { CATEGORY_ICON_URLS_MONO } from "../move-category-ui";
import { TypeSymbolIcon } from "../type-symbol-icon";
import { MovePicker } from "../pickers/move-picker";
import { MovePickerMobile } from "../pickers/move-picker-mobile";
import { SELECTOR_DIALOG_CONTENT_CLASS } from "../pickers/selector-dialog-class";
import {
  useCalcStateContext,
  useCalcEnabled,
} from "../calc/calc-state-context";
import { CalcDetailCard } from "../calc/calc-detail-card";
import { type CalcOutput } from "../use-calc-state";
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
  /**
   * Direction of the damage calc displayed in each tile.
   * - "outgoing" (default): this mon's moves vs the defender in calc context.
   * - "incoming": opponent's moves vs this mon (for "versus" views).
   */
  direction?: "outgoing" | "incoming";
  /**
   * Pre-computed outputs for the 4 move slots. When provided, these are used
   * directly instead of calling `calc.computeForwardOutputsForRow`. Required
   * for "incoming" views where the parent has already computed the outputs.
   */
  outputs?: readonly (CalcOutput | null)[];
  /**
   * Popover descriptor for the opposing mon. When omitted, falls back to
   * `calc.defenderSpecies / defenderAbility / defenderItem / defenderNature`.
   */
  opponent?: {
    species: string;
    ability: string;
    item: string;
    nature: string;
  };
  /**
   * Presentation variant.
   * - "list" (default): the existing single-column table with optional calc
   *   columns. Calc-on always uses this path regardless of this prop.
   * - "cards-2x2": a 2×2 grid of compact move cards showing type icon,
   *   category icon, move name, BP, and ACC. Only active when calc is OFF;
   *   when calc is ON the table path renders as usual.
   */
  presentation?: "list" | "cards-2x2";
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
    <span className="text-xs font-medium tabular-nums">
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

function KoLabel({
  tier,
  koChance,
}: {
  tier: string;
  koChance?: number | null;
}) {
  // Show "87.5% OHKO" when chance is between 0-100 exclusive
  const showChance = koChance != null && koChance > 0 && koChance < 100;
  return (
    <span
      className={cn(
        "text-xs font-extrabold tracking-wide uppercase",
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

function CalcDescTooltip({
  desc,
  children,
}: {
  desc: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      {children}
      <TooltipContent
        side="bottom"
        className="border-border bg-popover text-popover-foreground max-w-xl overflow-hidden border p-0"
      >
        <div className="flex flex-col gap-1.5 p-3">
          <p className="font-mono text-sm leading-relaxed whitespace-normal">
            {desc}
          </p>
          <span className="text-xs opacity-60">Click to copy</span>
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount to avoid setting state on an unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(desc);
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <CalcDescTooltip desc={desc}>
      <TooltipTrigger
        render={<span />}
        className="text-muted-foreground/60 hover:bg-muted hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors"
        onClick={handleCopy}
      >
        {copied ? (
          <svg
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 8 7 12 13 4" />
          </svg>
        ) : (
          <svg
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
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
  /**
   * Pre-computed outputs for all 4 slots. When provided, overrides forward
   * calc computation — used for injecting incoming damage outputs.
   */
  rowOutputs?: readonly (CalcOutput | null)[];
  /** Popover defender descriptor. When provided, overrides calc context defaults. */
  popoverDefender?: {
    species: string;
    ability: string;
    item: string;
    nature: string;
  };
}

function MoveTile({
  slotKey,
  moveName,
  species,
  format,
  attacker,
  onPick,
  slotErrors,
  rowOutputs: injectedOutputs,
  popoverDefender,
}: MoveTileProps) {
  const [panel, setPanel] = useState<TilePanel>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const calc = useCalcStateContext();
  const moveIdx = SLOT_IDX[slotKey];
  // When injectedOutputs are provided (e.g. incoming direction), use them directly.
  // Otherwise compute forward outputs as today (default behavior unchanged).
  const rowOutputs =
    injectedOutputs ?? calc.computeForwardOutputsForRow(attacker);
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
    if (moveName && hasCalc) {
      setPanel("detail");
    } else {
      setPanel("picker");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (moveName && hasCalc) {
        setPanel("detail");
      } else {
        setPanel("picker");
      }
    }
  }

  const detailOpen = panel === "detail";
  const pickerOpen = panel === "picker";
  const isMobile = useIsMobile();

  return (
    <>
      <Popover
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open && panel === "detail") setPanel(null);
        }}
      >
        <TableRow
          ref={rowRef}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
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
          <TableCell className="max-w-36 p-1 align-middle">
            <DescriptionTooltip
              description={moveName ? moveData?.shortDesc : null}
              showContent={panel === null}
            >
              <TooltipTrigger
                render={<span />}
                className={cn(
                  "block max-w-36 truncate text-sm font-medium",
                  !moveName && "text-muted-foreground/50"
                )}
              >
                {moveName ?? "+ Add move"}
              </TooltipTrigger>
            </DescriptionTooltip>
          </TableCell>

          {/* Base Power */}
          <TableCell className="text-muted-foreground p-1 align-middle font-mono text-xs tabular-nums">
            {moveName && moveData?.basePower && moveData.basePower > 0
              ? moveData.basePower
              : moveName
                ? "—"
                : ""}
          </TableCell>

          {/* Accuracy */}
          <TableCell className="text-muted-foreground p-1 align-middle font-mono text-xs tabular-nums">
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
                <span className="text-muted-foreground text-xs tabular-nums">
                  {output.rolls[0] ?? 0}–
                  {output.rolls[output.rolls.length - 1] ?? 0}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
          )}

          {/* Calc percent */}
          {calc.calcEnabled && (
            <TableCell className="p-1 whitespace-nowrap">
              {hasCalc && koTier ? (
                <CalcRange min={displayMin} max={displayMax} />
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
          )}

          {/* KO tier label */}
          {calc.calcEnabled && (
            <TableCell className="p-1 whitespace-nowrap">
              {hasCalc && koTier ? (
                <KoLabel tier={koTier} koChance={output?.koChance} />
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
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
        </TableRow>

        <PopoverContent
          side="bottom"
          align="start"
          anchor={rowRef}
          className="w-auto p-0"
        >
          {detailOpen && moveName && output ? (
            <CalcDetailCard
              attacker={attacker}
              moveName={moveName}
              baseOutput={output}
              defender={
                popoverDefender ?? {
                  species: calc.defenderSpecies,
                  ability: calc.defenderAbility,
                  item: calc.defenderItem,
                  nature: calc.defenderNature,
                }
              }
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

      {/* Move picker — mobile bottom drawer or desktop centered Dialog */}
      {isMobile ? (
        <MovePickerMobile
          open={pickerOpen}
          onOpenChange={(open) => {
            if (!open && panel === "picker") setPanel(null);
          }}
          value={moveName}
          species={species}
          format={format}
          onPick={(name) => {
            onPick(slotKey, name);
            setPanel(null);
          }}
        />
      ) : (
        <Dialog
          open={pickerOpen}
          onOpenChange={(open) => {
            if (!open && panel === "picker") setPanel(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className={SELECTOR_DIALOG_CONTENT_CLASS}
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
      )}

      {/* Inline error chips — rendered as a full-colspan row */}
      {slotErrors.length > 0 && (
        <TableRow className="border-none hover:bg-transparent">
          <TableCell
            colSpan={calc.calcEnabled ? 8 : 5}
            className="p-0 pt-0.5 pb-1"
          >
            <FieldErrors errors={slotErrors} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function MovesLaneTileGhost() {
  const calcEnabled = useCalcEnabled();
  return (
    <TableHeader>
      <TableRow className="border-none">
        <TableHead className="!h-auto w-6 border-none p-0 pb-0.5">
          <span className="sr-only">Type</span>
        </TableHead>
        <TableHead className="!h-auto w-8 border-none p-0 pb-0.5">
          <span className="sr-only">Category</span>
        </TableHead>
        <TableHead className="text-muted-foreground/30 !h-auto border-none p-0 pb-0.5 text-xs font-medium tracking-[0.04em] uppercase">
          NAME
        </TableHead>
        <TableHead className="text-muted-foreground/30 !h-auto w-11 border-none p-0 pb-0.5 text-xs font-medium tracking-[0.04em] uppercase">
          BP
        </TableHead>
        <TableHead className="text-muted-foreground/30 !h-auto w-12 border-none p-0 pb-0.5 text-xs font-medium tracking-[0.04em] uppercase">
          ACC
        </TableHead>
        {calcEnabled && (
          <TableHead className="text-muted-foreground/30 !h-auto border-none p-0 pb-0.5">
            DAMAGE
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className="text-muted-foreground/30 !h-auto border-none p-0 pb-0.5">
            %
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className="text-muted-foreground/30 !h-auto border-none p-0 pb-0.5">
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
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col px-6 py-1 transition-[padding,flex] duration-300 ease-in-out"
      )}
    >
      <Table
        className="w-full border-separate border-spacing-y-[3px]" /* border-spacing-y-[3px]: 3px hairline row gap — no Tailwind scale token */
      >
        <MovesLaneTileGhost />
        <TableBody>
          {([0, 1, 2, 3] as const).map((i) => (
            <TableRow key={i} className="border-none">
              <TableCell className="w-6 p-1" />
              <TableCell className="w-8 p-1" />
              <TableCell className="p-1">
                <span className="text-muted-foreground/30 text-sm font-medium">
                  + Add move
                </span>
              </TableCell>
              <TableCell className="w-11 p-1 font-mono text-xs tabular-nums" />
              <TableCell className="w-12 p-1 font-mono text-xs tabular-nums" />
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
// MoveCard — compact card for the 2×2 grid (no calc, no table row)
// =============================================================================

interface MoveCardProps {
  slotKey: MoveSlot;
  moveName: string | null;
  species: string;
  format: GameFormat | undefined;
  onPick: (slotKey: MoveSlot, moveName: string) => void;
  slotErrors: ValidationError[];
}

function MoveCard({
  slotKey,
  moveName,
  species,
  format,
  onPick,
  slotErrors,
}: MoveCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isMobile = useIsMobile();

  const moveData = moveName ? getMoveData(moveName) : null;

  const hasError = slotErrors.some((e) => e.severity === "error");

  function handleClick() {
    setPickerOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPickerOpen(true);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {/* Card button */}
        <button
          type="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "border-border bg-card hover:bg-muted flex cursor-pointer flex-col gap-1.5 rounded-md border p-2 text-left transition-colors",
            hasError && "border-destructive/50 ring-destructive/30 ring-1"
          )}
        >
          {/* Top row: type icon + category icon */}
          <div className="flex items-center gap-1.5">
            {moveName && moveData?.type ? (
              <TypeSymbolIcon
                type={
                  moveData.type as Parameters<typeof TypeSymbolIcon>[0]["type"]
                }
                size={16}
              />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            {moveName &&
            moveData?.category &&
            CATEGORY_ICON_URLS_MONO[moveData.category] ? (
              <img
                src={CATEGORY_ICON_URLS_MONO[moveData.category]}
                alt={moveData.category}
                className="h-4 w-4 shrink-0"
              />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            {/* BP / ACC meta — small, right-aligned */}
            <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">
              {moveName
                ? moveData?.basePower && moveData.basePower > 0
                  ? `${moveData.basePower} / ${
                      moveData.accuracy === true || !moveData.accuracy
                        ? "—"
                        : moveData.accuracy
                    }`
                  : "— / —"
                : ""}
            </span>
          </div>

          {/* Move name */}
          <span
            className={cn(
              "block truncate text-sm font-medium",
              !moveName && "text-muted-foreground/50"
            )}
          >
            {moveName ?? "+ Add move"}
          </span>
        </button>

        {/* Inline error chips */}
        {slotErrors.length > 0 && <FieldErrors errors={slotErrors} />}
      </div>

      {/* Move picker */}
      {isMobile ? (
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
      ) : (
        <Dialog
          open={pickerOpen}
          onOpenChange={(open) => {
            if (!open) setPickerOpen(false);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className={SELECTOR_DIALOG_CONTENT_CLASS}
          >
            <DialogTitle className="sr-only">Choose move</DialogTitle>
            <MovePicker
              value={moveName}
              species={species}
              format={format}
              onPick={(name) => {
                onPick(slotKey, name);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
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
  direction: "outgoing" | "incoming";
  outputs: readonly (CalcOutput | null)[] | undefined;
  opponent:
    | { species: string; ability: string; item: string; nature: string }
    | undefined;
  presentation: "list" | "cards-2x2";
}

function MovesLaneReal({
  pokemon,
  format,
  onUpdate,
  fieldErrors,
  direction: _direction,
  outputs,
  opponent,
  presentation,
}: MovesLaneRealProps) {
  const calc = useCalcStateContext();

  function handlePick(slotKey: MoveSlot, name: string) {
    onUpdate({ [slotKey]: name });
  }

  // Resolve the defender descriptor for popovers:
  // - When `opponent` is explicitly provided, use it (e.g. for incoming views).
  // - Otherwise fall back to the calc context's current defender values.
  const popoverDefender = opponent ?? {
    species: calc.defenderSpecies,
    ability: calc.defenderAbility,
    item: calc.defenderItem,
    nature: calc.defenderNature,
  };

  // 2×2 card grid: only when presentation is "cards-2x2" AND calc is OFF.
  // When calc is ON, always fall through to the standard table (direction seam
  // and calc columns must remain intact).
  if (presentation === "cards-2x2" && !calc.calcEnabled) {
    return (
      <div className="px-6 py-1">
        <div className="grid grid-cols-2 gap-2">
          {MOVE_SLOTS.map((slotKey) => {
            const slotErrors = fieldErrors.filter((e) => e.field === slotKey);
            return (
              <MoveCard
                key={slotKey}
                slotKey={slotKey}
                moveName={pokemon[slotKey] || null}
                species={pokemon.species ?? ""}
                format={format}
                onPick={handlePick}
                slotErrors={slotErrors}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col px-6 py-1 transition-[padding,flex] duration-300 ease-in-out"
      )}
    >
      <Table
        className="w-full border-separate border-spacing-y-[3px]" /* border-spacing-y-[3px]: 3px hairline row gap — no Tailwind scale token */
      >
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
                rowOutputs={outputs}
                popoverDefender={popoverDefender}
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
 *
 * New optional props for direction-agnostic rendering (all default to today's
 * forward-calc behavior so existing callers are unaffected):
 * - `direction` — "outgoing" (default) or "incoming"
 * - `outputs` — pre-computed outputs to inject; omit to compute forward as usual
 * - `opponent` — popover defender descriptor; omit to use calc context defaults
 *
 * The computed direction-aware header label is:
 *   "Outgoing — vs {opponentSpecies}" | "Incoming — from {opponentSpecies}"
 * MovesLane does not render a standalone lane header today (the parent owns
 * that DOM), so the label is a derivable string for callers that need it.
 */
export function MovesLane({
  pokemon,
  format,
  onUpdate,
  fieldErrors = [],
  direction = "outgoing",
  outputs,
  opponent,
  presentation = "list",
}: MovesLaneProps) {
  if (pokemon === null) return <MovesLaneGhost />;
  return (
    <MovesLaneReal
      pokemon={pokemon}
      format={format}
      onUpdate={onUpdate ?? (() => {})}
      fieldErrors={fieldErrors}
      direction={direction}
      outputs={outputs}
      opponent={opponent}
      presentation={presentation}
    />
  );
}
