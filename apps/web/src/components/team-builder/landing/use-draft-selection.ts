"use client";

import { useState } from "react";

// =============================================================================
// Types
// =============================================================================

/** Return value of `useDraftSelection`. */
export interface UseDraftSelectionReturn {
  /** The currently selected draft IDs. Pruned to only ids present in `orderedIds`. */
  selected: ReadonlySet<string>;
  /** Returns true if `id` is in the current selection. */
  isSelected: (id: string) => boolean;
  /** Number of currently selected drafts. */
  count: number;
  /**
   * Toggle membership of `id` in the selection and update the range anchor.
   * No-ops silently when `id` is not in `orderedIds`.
   */
  toggle: (id: string) => void;
  /**
   * Shift-click semantics: select the inclusive contiguous range in `orderedIds`
   * between the current anchor and `id` (range-add — existing selections outside
   * the range are preserved). If there is no anchor, behaves identically to
   * `toggle`. No-ops silently when `id` is not in `orderedIds`.
   */
  toggleRange: (id: string) => void;
  /** Select all ids in `orderedIds`. */
  selectAll: () => void;
  /** Empty the selection and reset the range anchor. */
  clear: () => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Multi-select selection model for the team-builder landing bulk actions.
 *
 * Manages which draft ids are selected and tracks a "range anchor" (the last
 * individually toggled id) so that shift-click range selection works correctly.
 *
 * State is pure React — no localStorage side-effects.
 *
 * When `orderedIds` shrinks (e.g. drafts are deleted), selected ids that are
 * no longer present are pruned automatically during render.
 *
 * @param orderedIds - The current ordered list of draft ids as displayed in the
 *   landing list. The order determines the range computed by `toggleRange`.
 */
export function useDraftSelection(
  orderedIds: readonly string[]
): UseDraftSelectionReturn {
  // Build a lookup Set from orderedIds for O(1) membership checks.
  const validIds = new Set(orderedIds);

  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const [anchor, setAnchor] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: prune selected to only ids still present in orderedIds.
  // This runs synchronously during render so consumers always see a consistent
  // view without requiring an effect.
  // ---------------------------------------------------------------------------
  const prunedSelected: ReadonlySet<string> = (() => {
    // Fast-path: if every selected id is still valid, reuse the same Set object
    // so referential equality is stable and the compiler can skip re-renders.
    for (const id of selected) {
      if (!validIds.has(id)) {
        // At least one stale id — build a new pruned set.
        const next = new Set<string>();
        for (const id of selected) {
          if (validIds.has(id)) next.add(id);
        }
        return next;
      }
    }
    return selected;
  })();

  // If pruning produced a new Set, schedule a state sync so the stored Set
  // stays consistent. This avoids the set-state-in-effect anti-pattern by
  // computing during render; the deferred setSelected is a reconciliation
  // flush that React batches after paint.
  //
  // Guard: only call setSelected when the pruned set ACTUALLY differs from the
  // stored selection. Without the guard, every render allocates a new Set and
  // schedules an extra render of every `isSelected` consumer — even when no
  // ids were removed. Compare size first (cheap), then membership (O(n) but
  // only reached when sizes match and at least one id was removed above).
  if (prunedSelected !== selected) {
    const differs =
      prunedSelected.size !== selected.size ||
      [...prunedSelected].some((id) => !selected.has(id));
    if (differs) {
      // React allows calling setState during render for this exact pattern
      // (derived-state reconciliation). See react-patterns.md.
      setSelected(prunedSelected);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function isSelected(id: string): boolean {
    return prunedSelected.has(id);
  }

  function toggle(id: string): void {
    if (!validIds.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setAnchor(id);
  }

  function toggleRange(id: string): void {
    if (!validIds.has(id)) return;

    if (anchor === null || !validIds.has(anchor)) {
      // No valid anchor — behave like toggle.
      toggle(id);
      return;
    }

    const anchorIdx = orderedIds.indexOf(anchor);
    const targetIdx = orderedIds.indexOf(id);

    if (anchorIdx === -1 || targetIdx === -1) {
      // Defensive: fall back to toggle if either index is missing.
      toggle(id);
      return;
    }

    const lo = Math.min(anchorIdx, targetIdx);
    const hi = Math.max(anchorIdx, targetIdx);

    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) {
        const rangeId = orderedIds[i];
        if (rangeId !== undefined) {
          next.add(rangeId);
        }
      }
      return next;
    });
    // Range operations do NOT update the anchor (only toggle does).
  }

  function selectAll(): void {
    setSelected(new Set(orderedIds));
  }

  function clear(): void {
    setSelected(new Set<string>());
    setAnchor(null);
  }

  return {
    selected: prunedSelected,
    isSelected,
    count: prunedSelected.size,
    toggle,
    toggleRange,
    selectAll,
    clear,
  };
}
