"use client";

/**
 * team-sections.tsx
 *
 * Collapsible, keyboard-navigable section list for the team-builder landing.
 *
 * Receives pre-grouped `DraftSection[]` from the caller (produced by
 * `groupDrafts`) and renders each section as a collapsible block. A roving
 * tabindex spans all visible rows across all expanded sections so the user can
 * navigate with ArrowDown/j (next) and ArrowUp/k (previous).
 *
 * Activation (Enter/Space) is forwarded to the row's own Link or button — this
 * component only manages focus; it does NOT intercept activation events.
 *
 * When `reorderable` is true (custom sort mode, single-section views), wraps
 * the sole reorderable section in DndContext + SortableContext from @dnd-kit.
 * Each row must be rendered via TeamRow which calls useSortable internally.
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";

import { type DraftSection } from "./group-drafts";
import { type LocalDraftRecord } from "../persistence/local-drafts-types";
import { type Density } from "../persistence/landing-prefs-types";

// =============================================================================
// Types
// =============================================================================

/** Props injected by TeamSections into each rendered row via `renderRow`. */
export interface RowInjectedProps {
  /** Roving tabindex value: 0 for the active row, -1 for all others. */
  tabIndex: number;
  /** Callback ref — consumer spreads this onto the row's focusable wrapper. */
  ref: (el: HTMLElement | null) => void;
}

export interface TeamSectionsProps {
  /** Ordered sections to render. Produced by `groupDrafts`. */
  sections: readonly DraftSection[];
  /** Visual density — controls vertical spacing between rows. */
  density: Density;
  /**
   * Render prop for each row. Receives the draft record and injected
   * tabindex/ref props that must be spread onto the row's focusable wrapper.
   */
  renderRow: (record: LocalDraftRecord, rowProps: RowInjectedProps) => ReactNode;
  /** Content rendered when `sections` is empty or all sections have 0 drafts. */
  emptyState?: ReactNode;
  /**
   * When true, wraps the (single) visible section in a DndContext +
   * SortableContext so rows can be dragged to reorder. Only meaningful
   * for custom-sort all-teams and manual-folder views (which produce a
   * single section). Multi-section views should pass `false`.
   */
  reorderable?: boolean;
  /**
   * Called when a drag-drop reorder completes. Receives the draft id that
   * was dragged and the new index it was dropped at (0-based within the
   * visible flat list). The caller is responsible for renumbering sortOrder.
   */
  onDragReorder?: (fromId: string, toIndex: number) => void;
}

// =============================================================================
// Density spacing
// =============================================================================

/** Vertical gap class applied between rows depending on density setting. */
const DENSITY_CLASS: Record<Density, string> = {
  comfortable: "space-y-1",
  compact: "space-y-0",
};

// =============================================================================
// TeamSections
// =============================================================================

/**
 * Renders `sections` as collapsible blocks with roving tabindex keyboard nav.
 *
 * Collapse state is per-section (`useState` keyed by section id); all sections
 * start expanded. Collapsed sections' rows are excluded from the roving order.
 *
 * Key bindings on the section list container:
 *   ArrowDown / j → move active index forward (clamp at last row)
 *   ArrowUp   / k → move active index backward (clamp at first row)
 *   Enter / Space  → forwarded to the row element natively (no hijack)
 */
export function TeamSections({
  sections,
  density,
  renderRow,
  emptyState,
  reorderable = false,
  onDragReorder,
}: TeamSectionsProps) {
  // Per-section collapsed state, keyed by section.id.
  // All sections start expanded (not in the map = expanded).
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  // Active roving-tabindex index (into the flat ordered list of visible rows).
  const [activeIndex, setActiveIndex] = useState(0);

  // Container ref used to querySelector the active row by its data-roving-idx
  // attribute. This avoids the previous rowRefs Map pattern where
  // rowRefs.current was read/written inside inline callback refs — React
  // Compiler flags ref access inside functions created during render.
  const containerRef = useRef<HTMLDivElement>(null);

  // Track whether the last navigation was via keyboard so we can move focus.
  const lastNavByKeyboard = useRef(false);

  // -------------------------------------------------------------------------
  // dnd-kit sensors — used only when reorderable is true.
  // Sensors are always initialised (Rules of Hooks) but do nothing unless the
  // DndContext is rendered (which only happens when reorderable is true).
  // -------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8px movement before activating drag so accidental touches
      // on mobile don't hijack link taps.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onDragReorder) return;

    // Compute new index from the visible drafts in the first (and only)
    // reorderable section. The SortableContext receives the flat id list in
    // display order, so we need to locate the `over` item's position in it.
    const reorderableSection = sections[0];
    if (!reorderableSection) return;

    const draftsInOrder = reorderableSection.drafts;
    const toIndex = draftsInOrder.findIndex((d) => d.id === over.id);
    if (toIndex === -1) return;

    onDragReorder(String(active.id), toIndex);
  }

  // -------------------------------------------------------------------------
  // Compute the total number of visible (non-collapsed) rows for clamping.
  // -------------------------------------------------------------------------
  let totalVisible = 0;
  for (const section of sections) {
    if (!collapsedMap[section.id]) {
      totalVisible += section.drafts.length;
    }
  }

  // The effective active index, clamped to the current visible row count.
  const effectiveActive =
    totalVisible === 0 ? 0 : Math.min(activeIndex, totalVisible - 1);

  // -------------------------------------------------------------------------
  // Focus management: move DOM focus to the active row after keyboard nav.
  //
  // The active row is identified by tabIndex={0} (all others are -1), so
  // querySelector('[tabindex="0"]') reliably finds the one focusable row.
  // Reading containerRef.current inside useEffect is safe per react-patterns.md
  // ("Read refs inside effects, event handlers, and subscription callbacks").
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!lastNavByKeyboard.current) return;
    lastNavByKeyboard.current = false;
    const el = containerRef.current?.querySelector<HTMLElement>(
      '[tabindex="0"]'
    );
    if (el) {
      el.focus();
    }
  });

  // -------------------------------------------------------------------------
  // Keyboard handler — installed on the wrapping div so the whole list area
  // receives ArrowDown/j/ArrowUp/k.
  // -------------------------------------------------------------------------
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (totalVisible === 0) return;

    const isDown = e.key === "ArrowDown" || e.key === "j";
    const isUp = e.key === "ArrowUp" || e.key === "k";

    if (!isDown && !isUp) return;

    e.preventDefault();
    lastNavByKeyboard.current = true;

    if (isDown) {
      setActiveIndex((prev) => Math.min(prev + 1, totalVisible - 1));
    } else {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  }

  // -------------------------------------------------------------------------
  // Early exit: empty state
  // -------------------------------------------------------------------------
  const hasAnyDrafts = sections.some((s) => s.drafts.length > 0);
  if (sections.length === 0 || !hasAnyDrafts) {
    return emptyState ? <>{emptyState}</> : null;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  // Build a lookup: sectionId → starting flat index.
  // We need this to map each section's local row position to a flat index.
  const sectionStartMap = new Map<string, number>();
  let startIdx = 0;
  for (const section of sections) {
    const isCollapsed = Boolean(collapsedMap[section.id]);
    if (!isCollapsed) {
      sectionStartMap.set(section.id, startIdx);
      startIdx += section.drafts.length;
    }
  }

  return (
    // Outer div: keyboard navigation container only — no list role so the
    // onKeyDown does not conflict with a non-interactive ARIA role.
    // tabIndex={-1} makes it programmatically focusable without inserting it
    // into the tab order. The role="list" / role="listitem" semantics are
    // carried by the inner markup below.
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="space-y-4 outline-none"
    >
      {sections.map((section) => {
        const isCollapsed = Boolean(collapsedMap[section.id]);
        const count = section.drafts.length;
        const sectionStart = sectionStartMap.get(section.id) ?? 0;

        return (
          <div key={section.id} data-section-id={section.id}>
            {/* Section header */}
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setCollapsedMap((prev) => ({
                  ...prev,
                  [section.id]: !prev[section.id],
                }))
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
                "text-left text-sm font-medium",
                "hover:bg-accent/40 focus-visible:ring-ring",
                "focus-visible:outline-none focus-visible:ring-2",
                "transition-colors"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{section.title}</span>
              <span
                className="text-muted-foreground text-xs tabular-nums"
                aria-label={`${count} draft${count !== 1 ? "s" : ""}`}
              >
                {count}
              </span>
            </button>

            {/* Section rows — role="list" here (not on the keyboard-nav outer
                container) so the interactive onKeyDown div has no non-
                interactive ARIA role conflict. */}
            {!isCollapsed && (
              <div
                role="list"
                className={cn("mt-1 pl-2", DENSITY_CLASS[density])}
                data-density={density}
              >
                {/* When reorderable, wrap in dnd-kit context for drag support */}
                {reorderable ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={section.drafts.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {section.drafts.map((record, localIdx) => {
                        const flatIdx = sectionStart + localIdx;
                        const isActive = flatIdx === effectiveActive;

                        return (
                          <div key={record.id} role="listitem">
                            {renderRow(record, {
                              tabIndex: isActive ? 0 : -1,
                              // No-op ref: focus is managed via querySelector on
                              // the container (see useEffect above). The consumer
                              // may safely ignore or spread this.
                              ref: () => {},
                            })}
                          </div>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                ) : (
                  section.drafts.map((record, localIdx) => {
                    const flatIdx = sectionStart + localIdx;
                    const isActive = flatIdx === effectiveActive;

                    return (
                      <div key={record.id} role="listitem">
                        {renderRow(record, {
                          tabIndex: isActive ? 0 : -1,
                          // No-op ref: focus is managed via querySelector on
                          // the container (see useEffect above). The consumer
                          // may safely ignore or spread this.
                          ref: () => {},
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
