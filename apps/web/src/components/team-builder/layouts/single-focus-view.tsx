"use client";

/**
 * SingleFocusView — carousel that hosts one FocusCard at a time.
 *
 * Layout: a vertically-centered hero block — the FocusCard (or
 * EmptySlotCenterpiece) is stacked above the carousel row and dots, all
 * centered as one column inside the dotted-grid canvas.
 *
 * DND BOUNDARY CONTRACT: This component wraps SpriteTabStrip in a
 * <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>.
 * The PARENT (team-workspace) owns the <DndContext>. Do NOT add a DndContext
 * here — doing so would nest two DndContexts and break drag-reorder.
 */

import { useRef, useState } from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { FocusCard } from "./focus-card";
import { CalcVersusView } from "./calc-versus-view";
import { SpriteTabStrip } from "../shared/sprite-tab-strip";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { filterCurrentTeam } from "../shared/identity-layout-props";
import { useCalcStateContext } from "../calc/calc-state-context";
import { type ValidationError } from "../validation-hooks";

// =============================================================================
// Types
// =============================================================================

interface SingleFocusViewProps {
  /** 6-slot array; null means empty slot. Index mirrors team_position - 1. */
  slots: (Tables<"pokemon"> | null)[];
  /** Index of the currently active slot (0–5). */
  activeIdx: number;
  /** Called when a tab/arrow/dot activates a different slot. */
  onActivate: (idx: number) => void;
  /**
   * Stable string IDs for dnd-kit. Same shape as `itemIds` in team-workspace:
   * filled → String(pokemon.id), empty → `__empty__{i}`.
   */
  itemIds: string[];
  /** Active GameFormat — forwarded to FocusCard and SpriteTabStrip. */
  format: GameFormat | undefined;
  /** Sibling item names — passed to FocusCard for held-item deduplication hints. */
  teamItems?: string[];
  /**
   * Called when the user picks a species to add to the given slot index.
   * Maps directly to `handleAdd(idx, speciesId)` in team-workspace.
   * SingleFocusView owns its own SpeciesPickerDialog for the empty-slot CTA
   * path; FocusCard owns a separate instance for the sprite-click re-pick path.
   */
  onAdd: (idx: number, species: string) => void;
  /**
   * Called when the user removes the Pokémon at the given slot index.
   * Maps to `handleRemoveByIdx(idx)` in team-workspace.
   */
  onRemove: (idx: number) => void;
  /**
   * Called when a field on the active Pokémon changes.
   * Maps to `handlePokemonUpdate(pokemonId, fields)` in team-workspace.
   */
  onPokemonUpdate: (
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) => void;
  /** Validation errors keyed by SLOT index (not pokemon id). */
  errorsBySlot?: Map<number, ValidationError[]>;
}

// =============================================================================
// Constants
// =============================================================================

const SLOT_COUNT = 6;
const SWIPE_THRESHOLD = 40; // px horizontal delta to trigger a slot switch

// =============================================================================
// SingleFocusView
// =============================================================================

export function SingleFocusView({
  slots,
  activeIdx,
  onActivate,
  itemIds,
  format,
  teamItems,
  onAdd,
  onRemove,
  onPokemonUpdate,
  errorsBySlot,
}: SingleFocusViewProps) {
  // ── Empty-slot species picker ──────────────────────────────────────────────
  // Opened by the EmptySlotCenterpiece CTA. FocusCard manages its own separate
  // picker for the sprite-click re-pick path on filled slots.
  const [emptyPickerOpen, setEmptyPickerOpen] = useState(false);

  // ── Direction tracking for transition ──────────────────────────────────────
  // When activeIdx changes, figure out which direction the slide should go.
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [animKey, setAnimKey] = useState<number>(0); // bumped to restart animation

  const UNINITIALIZED = Symbol();
  const [prevActiveIdx, setPrevActiveIdx] = useState<
    number | typeof UNINITIALIZED
  >(UNINITIALIZED);

  if (prevActiveIdx !== activeIdx) {
    setPrevActiveIdx(activeIdx);
    if (prevActiveIdx !== UNINITIALIZED) {
      setSlideDir(activeIdx > prevActiveIdx ? "right" : "left");
    }
    setAnimKey((k) => k + 1);
  }

  // ── Safe nav helper ─────────────────────────────────────────────────────────
  function activateClamped(idx: number) {
    const clamped = Math.max(0, Math.min(SLOT_COUNT - 1, idx));
    if (clamped !== activeIdx) onActivate(clamped);
  }

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const stageRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Only handle arrow keys when no interactive child has focus and no dialog is open.
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable;
    if (isEditable) return;

    // Skip if any dialog/modal is open (aria-modal ancestor check)
    if (target.closest('[role="dialog"]')) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      activateClamped(activeIdx - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      activateClamped(activeIdx + 1);
    }
  }

  // ── Swipe (touch + pointer) ─────────────────────────────────────────────────
  const swipeStartX = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only capture touch-like pointers on the stage (not buttons/inputs inside)
    if (e.pointerType === "mouse") return;
    swipeStartX.current = e.clientX;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (swipeStartX.current === null) return;
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    // Swipe left → next; swipe right → previous
    activateClamped(activeIdx + (delta < 0 ? 1 : -1));
  }

  // ── Calc state ──────────────────────────────────────────────────────────────
  const calc = useCalcStateContext();

  // ── Active pokemon + errors ─────────────────────────────────────────────────
  const activePokemon = slots[activeIdx] ?? null;
  const activeErrors = errorsBySlot?.get(activeIdx) ?? [];

  // Team items (sibling held items) for the ItemCell deduplication hint
  const siblingItems: string[] = slots
    .filter((p, i): p is Tables<"pokemon"> => p !== null && i !== activeIdx)
    .map((p) => p.held_item ?? "")
    .filter(Boolean);
  const resolvedTeamItems = teamItems ?? siblingItems;

  // Species already on the team — passed to SpeciesPickerDialog so it can
  // highlight duplicates. filterCurrentTeam accepts { species: string | null }[].
  const currentTeam = filterCurrentTeam(
    slots.filter((p): p is Tables<"pokemon"> => p !== null)
  );

  return (
    <>
      {/* Empty-slot species picker — shared instance for the centerpiece CTA */}
      <SpeciesPickerDialog
        open={emptyPickerOpen}
        onOpenChange={setEmptyPickerOpen}
        value={null}
        format={format}
        currentTeam={currentTeam}
        onPick={(species) => {
          setEmptyPickerOpen(false);
          onAdd(activeIdx, species);
        }}
      />

      {/*
        Dotted-canvas wrapper — the scrollable region that fills the available
        height. The stage (FocusCard/empty CTA) and carousel are centered as ONE
        column inside this wrapper, matching the v7 mockup's .stagewrap rule:
          flex-direction:column; align-items:center; justify-content:center
        Keyboard and swipe handlers live here so the whole canvas is interactive.
      */}
      <div
        ref={stageRef}
        className={cn(
          "flex min-h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4",
          // Dotted canvas texture (moved here from FocusCard)
          "bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-[length:24px_24px]",
          "outline-none"
        )}
        tabIndex={0}
        aria-label="Pokémon slot carousel — use arrow keys to switch slots"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* ── Stage: FocusCard or EmptySlotCenterpiece ──────────────────────── */}
        {activePokemon !== null ? (
          /* ── Filled slot: CalcVersusView (calc on) or FocusCard (calc off) ── */
          <div
            key={animKey}
            className={cn(
              "w-full",
              // motion-safe: direction-aware slide + fade in
              // motion-reduce: instant swap (respects prefers-reduced-motion)
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
              slideDir === "right" && "motion-safe:slide-in-from-right-4",
              slideDir === "left" && "motion-safe:slide-in-from-left-4",
              slideDir === null && "motion-safe:fade-in"
            )}
          >
            {calc.calcEnabled ? (
              <CalcVersusView
                pokemon={activePokemon}
                format={format}
                teamItems={resolvedTeamItems}
                onUpdate={(fields) => onPokemonUpdate(activePokemon.id, fields)}
                calc={calc}
              />
            ) : (
              <FocusCard
                pokemon={activePokemon}
                format={format}
                teamItems={resolvedTeamItems}
                onUpdate={(fields) => onPokemonUpdate(activePokemon.id, fields)}
                onRemove={() => onRemove(activeIdx)}
                slotErrors={activeErrors}
              />
            )}
          </div>
        ) : (
          /* ── Empty slot: centerpiece CTA with ghost hints ─────────────── */
          <EmptySlotCenterpiece
            slotIdx={activeIdx}
            onAdd={() => setEmptyPickerOpen(true)}
            animKey={animKey}
            slideDir={slideDir}
          />
        )}

        {/* ── Carousel row — arrows flanking the sprite tab strip ────────── */}
        {/*
          The carousel is grouped directly under the stage as part of the same
          centered block (not pinned to the canvas bottom). Arrows flank the
          SpriteTabStrip inline, matching the v7 mockup's .carousel layout.
        */}
        <div className="flex items-center gap-2">
          {/* Previous arrow */}
          <button
            type="button"
            aria-label="Previous Pokémon slot"
            onClick={() => activateClamped(activeIdx - 1)}
            disabled={activeIdx === 0}
            className={cn(
              // ≥40px tap target on mobile per mobile-responsiveness rule
              "flex size-10 items-center justify-center rounded-full",
              "bg-background/70 text-muted-foreground backdrop-blur-sm",
              "border-border/40 border shadow-sm",
              "hover:bg-background hover:text-foreground transition-all duration-150",
              "disabled:pointer-events-none disabled:opacity-30",
              // Slightly smaller on desktop where space is less precious
              "sm:size-9"
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>

          {/* Sprite tab strip — wrapped in SortableContext for DnD reorder */}
          {/* Parent DndContext is provided by team-workspace */}
          <div className="overflow-x-auto">
            <SortableContext
              items={itemIds}
              strategy={horizontalListSortingStrategy}
            >
              <SpriteTabStrip
                slots={slots}
                activeIdx={activeIdx}
                onActivate={onActivate}
                itemIds={itemIds}
                errorsBySlot={errorsBySlot}
              />
            </SortableContext>
          </div>

          {/* Next arrow */}
          <button
            type="button"
            aria-label="Next Pokémon slot"
            onClick={() => activateClamped(activeIdx + 1)}
            disabled={activeIdx === SLOT_COUNT - 1}
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              "bg-background/70 text-muted-foreground backdrop-blur-sm",
              "border-border/40 border shadow-sm",
              "hover:bg-background hover:text-foreground transition-all duration-150",
              "disabled:pointer-events-none disabled:opacity-30",
              "sm:size-9"
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>

        {/* ── Dot row — compact position indicator below the carousel ────── */}
        <div
          className="flex items-center justify-center gap-1.5"
          role="group"
          aria-label="Slot position indicators"
        >
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slot ${i + 1}`}
              aria-pressed={i === activeIdx}
              onClick={() => activateClamped(i)}
              className={cn(
                // ≥40px hit area on mobile; shrinks on sm+ for visual compactness
                "flex size-10 items-center justify-center sm:size-5",
                "rounded-full transition-all duration-150"
              )}
            >
              <span
                className={cn(
                  "block rounded-full transition-all duration-150",
                  i === activeIdx
                    ? "bg-primary size-2"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground/70 size-1.5"
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// EmptySlotCenterpiece
// =============================================================================

interface EmptySlotCenterpieceProps {
  slotIdx: number;
  onAdd: () => void;
  animKey: number;
  slideDir: "left" | "right" | null;
}

/**
 * Shown when the active slot is empty.
 *
 * Center: prominent teal dashed-circle CTA (uses OKLCH primary token via
 * Tailwind `text-primary` / `border-primary` classes).
 *
 * Flanking ghost hints telegraph the real FocusCard layout:
 *   Left  — ghost stats hexagon (low opacity)
 *   Right — ghost "+ Add move" rows (low opacity)
 */
function EmptySlotCenterpiece({
  onAdd,
  animKey,
  slideDir,
}: EmptySlotCenterpieceProps) {
  return (
    <div
      key={animKey}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden p-4 py-12",
        // Slide + crossfade transition — same as filled-slot stage
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        slideDir === "right" && "motion-safe:slide-in-from-right-4",
        slideDir === "left" && "motion-safe:slide-in-from-left-4",
        slideDir === null && "motion-safe:fade-in"
      )}
    >
      {/* Ghost: stats hexagon (left flank) */}
      <div
        aria-hidden
        className="absolute top-1/2 left-4 hidden -translate-y-1/2 opacity-10 md:block"
      >
        <GhostStatsHexagon />
      </div>

      {/* Ghost: move rows (right flank) */}
      <div
        aria-hidden
        className="absolute top-1/2 right-4 hidden -translate-y-1/2 opacity-10 md:block"
      >
        <GhostMoveRows />
      </div>

      {/* CTA centerpiece */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add Pokémon to this slot"
          className={cn(
            // Dashed teal circle — OKLCH primary token via Tailwind classes
            "flex size-24 flex-col items-center justify-center",
            "border-primary rounded-full border-2 border-dashed",
            "text-primary bg-primary/5",
            // Hover: fills slightly
            "hover:bg-primary/10 transition-all duration-200",
            // Focus ring
            "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          )}
        >
          <Plus className="size-8" aria-hidden />
        </button>
        <p className="text-muted-foreground text-sm font-medium">Add Pokémon</p>
        <p className="text-muted-foreground/60 text-xs">
          Click or press Enter to pick a species
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Ghost hint sub-components
// =============================================================================

/** Ghost hexagon shape telegraphing the RadialStatEditor position. */
function GhostStatsHexagon() {
  // SVG hexagon approximating the stat-spider outline — decorative only
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      className="text-muted-foreground"
      aria-hidden
    >
      {/* Outer ring */}
      <polygon
        points="80,8 148,44 148,116 80,152 12,116 12,44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.6"
      />
      {/* Inner rings (smaller hexagons representing stat grid) */}
      {[0.66, 0.33].map((scale, i) => {
        const cx = 80;
        const cy = 80;
        const pts = [
          [80, 8],
          [148, 44],
          [148, 116],
          [80, 152],
          [12, 116],
          [12, 44],
        ]
          .map(([x, y]) => [cx + (x! - cx) * scale, cy + (y! - cy) * scale])
          .map(([x, y]) => `${x},${y}`)
          .join(" ");
        return (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity={0.4 - i * 0.1}
          />
        );
      })}
      {/* Spoke lines */}
      {[
        [80, 8],
        [148, 44],
        [148, 116],
        [80, 152],
        [12, 116],
        [12, 44],
      ].map(([x, y], i) => (
        <line
          key={i}
          x1="80"
          y1="80"
          x2={x}
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}
    </svg>
  );
}

/** Ghost move-row placeholders telegraphing the MovesLane position. */
function GhostMoveRows() {
  return (
    <div className="flex w-48 flex-col gap-2">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="border-muted-foreground/30 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2"
        >
          <div className="bg-muted-foreground/20 size-4 rounded" />
          <span className="text-muted-foreground/50 text-xs">
            + Add move {n}
          </span>
        </div>
      ))}
    </div>
  );
}
