"use client";

/**
 * SpriteTabStrip — horizontal 6-tab strip for the single-focus carousel.
 *
 * BOUNDARY CONTRACT: This component must be rendered inside a
 * `<SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>`.
 * The parent (single-focus-view) owns the `<DndContext>` and
 * `<SortableContext>`. This component renders only the sortable tabs — each
 * tab calls `useSortable` internally. Do NOT add a DndContext here.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getSpeciesTypes, getTypeColor } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { Sprite } from "../sprite";

// =============================================================================
// Types
// =============================================================================

interface SpriteTabStripProps {
  /** 6 pokemon slots — null means the slot is empty. */
  slots: (Tables<"pokemon"> | null)[];
  /** Index of the currently active (selected) tab. */
  activeIdx: number;
  /** Called when a tab is clicked — should update the parent's active index. */
  onActivate: (idx: number) => void;
  /**
   * The dnd-kit ids the parent SortableContext uses — same order as `slots`.
   * Filled tabs become sortable drag handles; empty tabs are non-draggable.
   */
  itemIds: string[];
  /** Slots with validation errors — renders a small dot badge on the tab. */
  errorsBySlot?: Map<number, unknown[]>;
}

// =============================================================================
// Individual tab
// =============================================================================

interface SpriteTabProps {
  idx: number;
  pokemon: Tables<"pokemon"> | null;
  isActive: boolean;
  sortableId: string;
  hasError: boolean;
  onActivate: (idx: number) => void;
}

function SpriteTab({
  idx,
  pokemon,
  isActive,
  sortableId,
  hasError,
  onActivate,
}: SpriteTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    // Empty slots are not draggable — they have no pokemon to reorder.
    disabled: pokemon === null,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  // ── Derive type ring color from the pokemon's primary type ──────────────────
  const types = pokemon ? getSpeciesTypes(pokemon.species ?? "") : [];
  const primaryTypeColor = types.length > 0 ? getTypeColor(types[0]!) : null;

  // Slot number display: 01–06
  const slotLabel = String(idx + 1).padStart(2, "0");

  // ── Ring styles ─────────────────────────────────────────────────────────────
  // Filled + active → type-colored solid ring
  // Empty + active → teal dashed ring (uses CSS var for the project's teal token)
  const ringStyle: React.CSSProperties =
    isActive && pokemon && primaryTypeColor
      ? {
          outline: `2px solid ${primaryTypeColor}`,
          outlineOffset: "2px",
        }
      : {};

  return (
    <button
      ref={setNodeRef}
      style={{ ...style, ...ringStyle }}
      className={cn(
        // Base tab — min 40px tap target per mobile-responsiveness rule
        "relative flex min-h-10 min-w-10 flex-col items-center justify-center gap-0.5",
        "rounded-lg px-1 py-1 transition-all duration-150",
        // Active lift
        isActive && "-translate-y-0.5",
        // Active empty tab — teal dashed ring (no inline style needed — Tailwind)
        isActive &&
          !pokemon &&
          "outline outline-2 outline-offset-2 outline-teal-500 outline-dashed",
        // Drag ghost opacity
        isDragging && "opacity-40",
        // Hover state for interactive feedback
        !isActive && "hover:bg-muted/50",
        // Draggable cursor only for filled slots
        pokemon !== null && "cursor-grab active:cursor-grabbing",
        pokemon === null && "cursor-pointer"
      )}
      onClick={() => onActivate(idx)}
      aria-label={
        pokemon
          ? `Slot ${slotLabel}: ${pokemon.species ?? "Unknown"}`
          : `Slot ${slotLabel}: empty`
      }
      // Spread sortable attributes + listeners for keyboard + pointer drag.
      // aria-pressed is overridden after attributes to avoid the duplicate-prop
      // TS error (useSortable attributes include aria-pressed for draggable items).
      {...attributes}
      {...listeners}
      aria-pressed={isActive}
    >
      {/* Sprite or placeholder */}
      {pokemon ? (
        <Sprite species={pokemon.species ?? ""} size={32} types={types} />
      ) : (
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            "bg-muted/40 text-muted-foreground text-sm font-light"
          )}
          aria-hidden
        >
          +
        </div>
      )}

      {/* Slot number */}
      <span
        className={cn(
          "text-xs leading-none font-medium tabular-nums",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
        aria-hidden
      >
        {slotLabel}
      </span>

      {/* Error dot badge — rendered when the slot has validation errors */}
      {hasError && (
        <span
          className="bg-destructive absolute top-0.5 right-0.5 size-1.5 rounded-full"
          aria-label="validation error"
        />
      )}
    </button>
  );
}

// =============================================================================
// SpriteTabStrip
// =============================================================================

/**
 * Horizontal row of 6 mini-sprite tabs for the single-focus carousel.
 *
 * Each tab displays a 32px `Sprite` (filled) or a `+` placeholder (empty),
 * a two-digit slot number, and an optional error dot. The active tab receives
 * a type-colored ring (filled) or a teal dashed ring (empty). Filled tabs are
 * sortable drag handles via dnd-kit `useSortable`.
 *
 * Render this inside a `<SortableContext strategy={horizontalListSortingStrategy}>`.
 */
export function SpriteTabStrip({
  slots,
  activeIdx,
  onActivate,
  itemIds,
  errorsBySlot,
}: SpriteTabStripProps) {
  return (
    <div
      className="flex w-full items-end justify-center gap-1 px-2 py-1"
      role="tablist"
      aria-label="Team slots"
    >
      {slots.map((pokemon, idx) => {
        const sortableId = itemIds[idx] ?? `__empty__${idx}`;
        const hasError = (errorsBySlot?.get(idx)?.length ?? 0) > 0;

        return (
          <SpriteTab
            key={sortableId}
            idx={idx}
            pokemon={pokemon}
            isActive={idx === activeIdx}
            sortableId={sortableId}
            hasError={hasError}
            onActivate={onActivate}
          />
        );
      })}
    </div>
  );
}
