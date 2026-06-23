"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { type CalcOutput } from "../use-calc-state";
import {
  getDisplayRangeAndKoTier,
  type MoveSlot,
  MOVE_SLOTS,
  KO_COLORS,
  KO_LABELS,
} from "./calc-display-helpers";
import { FieldErrors } from "../validation/field-error";

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
   * Presentation variant.
   * - "list" (default): the existing single-column table with optional calc
   *   columns. Calc-on always uses this path regardless of this prop.
   * - "card-list": a single-column card list showing type icon, category icon,
   *   move name, BP, and ACC. Only active when calc is OFF;
   *   when calc is ON the table path renders as usual.
   */
  presentation?: "list" | "card-list";
  /**
   * When true, renders a tighter/denser move table for side-by-side layouts
   * (e.g. the damage-calc versus view). Defaults to false — the solo
   * single-focus view is unchanged.
   */
  compact?: boolean;
}

/** Which popover panel is open for a tile. */
type TilePanel = "picker" | null;

// =============================================================================
// Helpers
// =============================================================================

/** Map move slot key to parallel array index. */
const SLOT_IDX: Record<MoveSlot, number> = {
  move1: 0,
  move2: 1,
  move3: 2,
  move4: 3,
};

/**
 * Per-column width + horizontal padding classNames, shared between header
 * (`MovesLaneTileGhost`) and body (`MoveTile` / `MovesLaneGhost`) so that
 * header labels are always horizontally aligned with their data cells.
 *
 * In compact mode (versus view) the NAME column is greedy (`w-full`) so each
 * row fills the full card width. In default mode NAME keeps its `max-w-36` cap.
 * Only width and horizontal padding (px-*) come from here — vertical padding
 * and other classes remain per-renderer.
 */
function getMoveColClasses(compact: boolean) {
  return {
    type: "w-6 px-1",
    category: "w-8 px-1",
    name: cn("px-1", compact ? "w-full" : "max-w-36"),
    bp: cn("px-1", compact ? "w-9" : "w-11"),
    acc: cn("px-1", compact ? "w-10" : "w-12"),
    // pl-2 preserves the visual gap between the move-info group and the calc group
    damage: "pr-1 pl-2",
    percent: "px-1",
    hits: "px-1",
    copy: "w-6 px-0.5",
  };
}

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
  /** When true, renders a denser row for two-up versus layouts. */
  compact?: boolean;
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
  compact = false,
}: MoveTileProps) {
  const [panel, setPanel] = useState<TilePanel>(null);

  const calc = useCalcStateContext();
  const moveIdx = SLOT_IDX[slotKey];
  // When injectedOutputs are provided (e.g. incoming direction), use them directly.
  // Otherwise compute forward outputs as today (default behavior unchanged).
  const rowOutputs =
    injectedOutputs ?? calc.computeForwardOutputsForRow(attacker);
  const output = rowOutputs[moveIdx] ?? null;

  const moveData = moveName ? getMoveData(moveName, format?.id) : null;
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

  // Shared per-column width + horizontal padding — must match MovesLaneTileGhost
  const cols = getMoveColClasses(compact);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setPanel("picker");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      setPanel("picker");
    }
  }

  const pickerOpen = panel === "picker";
  const isMobile = useIsMobile();

  return (
    <>
      <TableRow
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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
        {/* Type icon — invisible placeholder keeps row height when empty */}
        <TableCell className={cn(cols.type, "py-1 align-middle")}>
          {moveName && moveData?.type ? (
            <TypeSymbolIcon
              type={
                moveData.type as Parameters<typeof TypeSymbolIcon>[0]["type"]
              }
              size={20}
            />
          ) : (
            <span className="block size-5" aria-hidden />
          )}
        </TableCell>

        {/* Category icon — invisible placeholder keeps row height when empty */}
        <TableCell className={cn(cols.category, "py-1 align-middle")}>
          {moveName &&
          moveData?.category &&
          CATEGORY_ICON_URLS_MONO[moveData.category] ? (
            <img
              src={CATEGORY_ICON_URLS_MONO[moveData.category]}
              alt={moveData.category}
              className="h-4 w-4 shrink-0"
            />
          ) : (
            <span className="block size-4" aria-hidden />
          )}
        </TableCell>

        {/* Move name — greedy (w-full) in compact so the row fills the card width */}
        <TableCell className={cn(cols.name, "py-1 align-middle")}>
          <span
            className={cn(
              "block truncate font-medium",
              /* compact: text-xs (12px) for denser rows; default: text-sm (14px) */
              compact ? "text-xs" : "text-sm",
              /* compact: w-full absorbs slack; default: max-w-36 caps long names */
              compact ? "w-full" : "max-w-36",
              !moveName && "text-muted-foreground/50"
            )}
          >
            {moveName ?? "+ Add move"}
          </span>
        </TableCell>

        {/* Base Power */}
        <TableCell
          className={cn(
            cols.bp,
            "text-muted-foreground py-1 align-middle font-mono text-xs tabular-nums"
          )}
        >
          {moveName && moveData?.basePower && moveData.basePower > 0
            ? moveData.basePower
            : moveName
              ? "—"
              : ""}
        </TableCell>

        {/* Accuracy */}
        <TableCell
          className={cn(
            cols.acc,
            "text-muted-foreground py-1 align-middle font-mono text-xs tabular-nums"
          )}
        >
          {moveName
            ? moveData?.accuracy === true || !moveData?.accuracy
              ? "—"
              : moveData.accuracy
            : ""}
        </TableCell>

        {/* Calc damage (raw HP) */}
        {calc.calcEnabled && (
          <TableCell className={cn(cols.damage, "py-1 whitespace-nowrap")}>
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
          <TableCell className={cn(cols.percent, "py-1 whitespace-nowrap")}>
            {hasCalc && koTier ? (
              <CalcRange min={displayMin} max={displayMax} />
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </TableCell>
        )}

        {/* KO tier label */}
        {calc.calcEnabled && (
          <TableCell className={cn(cols.hits, "py-1 whitespace-nowrap")}>
            {hasCalc && koTier ? (
              <KoLabel tier={koTier} koChance={output?.koChance} />
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </TableCell>
        )}

        {/* Copy calc description */}
        {calc.calcEnabled && (
          <TableCell className={cn(cols.copy, "py-1 align-middle")}>
            {hasCalc && output?.desc ? (
              <CalcCopyButton desc={output.desc} />
            ) : null}
          </TableCell>
        )}
      </TableRow>

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

function MovesLaneTileGhost({ compact = false }: { compact?: boolean }) {
  const calcEnabled = useCalcEnabled();
  // Shared per-column layout — must match MoveTile body cells
  const cols = getMoveColClasses(compact);
  return (
    <TableHeader>
      <TableRow className="border-none">
        <TableHead className={cn(cols.type, "!h-auto border-none pb-0.5")}>
          <span className="sr-only">Type</span>
        </TableHead>
        <TableHead className={cn(cols.category, "!h-auto border-none pb-0.5")}>
          <span className="sr-only">Category</span>
        </TableHead>
        <TableHead
          className={cn(
            cols.name,
            "text-muted-foreground/30 !h-auto border-none pb-0.5 text-xs font-medium tracking-[0.04em] uppercase"
          )}
        >
          NAME
        </TableHead>
        <TableHead
          className={cn(
            cols.bp,
            "text-muted-foreground/30 !h-auto border-none pb-0.5 text-xs font-medium tracking-[0.04em] uppercase"
          )}
        >
          BP
        </TableHead>
        <TableHead
          className={cn(
            cols.acc,
            "text-muted-foreground/30 !h-auto border-none pb-0.5 text-xs font-medium tracking-[0.04em] uppercase"
          )}
        >
          ACC
        </TableHead>
        {calcEnabled && (
          <TableHead
            className={cn(
              cols.damage,
              "text-muted-foreground/30 !h-auto border-none pb-0.5"
            )}
          >
            DAMAGE
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead
            className={cn(
              cols.percent,
              "text-muted-foreground/30 !h-auto border-none pb-0.5"
            )}
          >
            %
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead
            className={cn(
              cols.hits,
              "text-muted-foreground/30 !h-auto border-none pb-0.5"
            )}
          >
            HITS
          </TableHead>
        )}
        {calcEnabled && (
          <TableHead className={cn(cols.copy, "!h-auto border-none pb-0.5")} />
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
  // Ghost is always non-compact (the placeholder renders outside of versus view)
  const cols = getMoveColClasses(false);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col px-6 py-1 transition-[padding,flex] duration-300 ease-in-out"
      )}
    >
      <Table
        className="w-full border-separate border-spacing-y-[3px]" /* border-spacing-y-[3px]: 3px hairline row gap — no Tailwind scale token */
      >
        <MovesLaneTileGhost compact={false} />
        <TableBody>
          {([0, 1, 2, 3] as const).map((i) => (
            <TableRow key={i} className="border-none">
              <TableCell className={cn(cols.type, "py-1")} />
              <TableCell className={cn(cols.category, "py-1")} />
              <TableCell className={cn(cols.name, "py-1")}>
                <span className="text-muted-foreground/30 text-sm font-medium">
                  + Add move
                </span>
              </TableCell>
              <TableCell
                className={cn(cols.bp, "py-1 font-mono text-xs tabular-nums")}
              />
              <TableCell
                className={cn(cols.acc, "py-1 font-mono text-xs tabular-nums")}
              />
              {calcEnabled && <TableCell className={cn(cols.damage, "py-1")} />}
              {calcEnabled && (
                <TableCell className={cn(cols.percent, "py-1")} />
              )}
              {calcEnabled && <TableCell className={cn(cols.hits, "py-1")} />}
              {calcEnabled && <TableCell className={cn(cols.copy, "py-1")} />}
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
            "border-border bg-card hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-2 py-3 text-left transition-colors",
            hasError && "border-destructive/50 ring-destructive/30 ring-1"
          )}
        >
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
          <span
            className={cn(
              "flex-1 truncate text-sm font-medium",
              !moveName && "text-muted-foreground/50"
            )}
          >
            {moveName ?? "+ Add move"}
          </span>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
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
  presentation: "list" | "card-list";
  compact: boolean;
}

function MovesLaneReal({
  pokemon,
  format,
  onUpdate,
  fieldErrors,
  direction: _direction,
  outputs,
  presentation,
  compact,
}: MovesLaneRealProps) {
  const calc = useCalcStateContext();

  function handlePick(slotKey: MoveSlot, name: string) {
    onUpdate({ [slotKey]: name });
  }

  // Single-column card list: only when presentation is "card-list" AND calc is OFF.
  // When calc is ON, always fall through to the standard table (direction seam
  // and calc columns must remain intact).
  if (presentation === "card-list" && !calc.calcEnabled) {
    return (
      <div className="px-6 py-1">
        <div className="grid grid-cols-1 gap-2">
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
        "flex min-w-0 flex-1 flex-col transition-[padding,flex] duration-300 ease-in-out",
        /* compact=true: tighter padding for two-up versus layout */
        compact ? "px-2 py-0.5" : "px-6 py-1"
      )}
    >
      {/* The Table primitive already wraps in overflow-x-auto — no inner wrapper needed.
          Removing the redundant wrapper lets the table's w-full propagate cleanly so
          the greedy NAME column can fill the card width. */}
      <Table
        className={cn(
          "w-full border-separate",
          /* border-spacing-y: hairline row gap — no Tailwind scale token for sub-4px values */
          compact
            ? "border-spacing-y-[2px]" /* 2px hairline when compact */
            : "border-spacing-y-[3px]" /* 3px hairline default */
        )}
      >
        <MovesLaneTileGhost compact={compact} />
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
                compact={compact}
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
 * - Left-click / Enter / Space: always opens the move picker.
 * - Renders inline FieldError chips for move-scoped validation issues.
 *
 * New optional props for direction-agnostic rendering (all default to today's
 * forward-calc behavior so existing callers are unaffected):
 * - `direction` — "outgoing" (default) or "incoming"
 * - `outputs` — pre-computed outputs to inject; omit to compute forward as usual
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
  presentation = "list",
  compact = false,
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
      presentation={presentation}
      compact={compact}
    />
  );
}
