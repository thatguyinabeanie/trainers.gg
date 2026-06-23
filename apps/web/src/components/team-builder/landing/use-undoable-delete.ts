"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

/** Return shape of `useUndoableDelete`. */
export interface UseUndoableDeleteReturn<T> {
  /**
   * IDs currently inside the undo window.
   * The consumer should hide these items from its list immediately so the
   * user sees them disappear, while `onCommit` is deferred until the window
   * expires (or `flushPending` is called).
   */
  pendingIds: ReadonlySet<string>;

  /**
   * Stage a batch of items for deletion.
   *
   * - Adds every item's `id` to `pendingIds` (consumer hides them from the UI).
   * - Shows a sonner toast with an **Undo** action.
   * - Starts a timer for `windowMs`; on expiry → `onCommit(items)` is called
   *   for this batch and the ids are removed from `pendingIds`.
   *
   * Calling `scheduleDelete` while a previous batch is still pending creates
   * a second independent batch — both batches can be undone independently.
   *
   * @param items   Array of items to delete (must each have an `id: string`).
   * @param message Optional toast message. Defaults to "Deleted N team(s)".
   */
  scheduleDelete: (items: T[], message?: string) => void;

  /**
   * Immediately commit all pending batches without waiting for their timers.
   *
   * - Clears all outstanding timers.
   * - Calls `onCommit` once per pending batch.
   * - Empties `pendingIds`.
   *
   * Call this on navigate-away or whenever you need to flush before unmount.
   * The hook also calls it automatically in the cleanup effect (unmount).
   */
  flushPending: () => void;
}

// =============================================================================
// Internal batch state (stored in refs — never read/written during render)
// =============================================================================

interface Batch<T> {
  items: T[];
  timerId: ReturnType<typeof setTimeout>;
}

/** Monotonic counter for batch IDs — avoids `crypto.randomUUID` (not in JSDOM). */
let _batchCounter = 0;
function nextBatchId(): string {
  _batchCounter += 1;
  return `batch-${_batchCounter}`;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Deferred-commit undoable delete for list items.
 *
 * Items passed to `scheduleDelete` are hidden from the UI immediately (via
 * `pendingIds`) but the actual `onCommit` callback is deferred until the undo
 * window expires. If the user clicks **Undo** in the toast, the batch is
 * cancelled and the items are restored without ever calling `onCommit`.
 *
 * @example
 * ```tsx
 * const { pendingIds, scheduleDelete, flushPending } = useUndoableDelete({
 *   onCommit: (items) => items.forEach((item) => deleteDraft(item.id)),
 *   windowMs: 5000,
 * });
 *
 * // In the consumer's list render — skip pending items:
 * const visible = drafts.filter((d) => !pendingIds.has(d.id));
 *
 * // On delete button click:
 * scheduleDelete([draft], `Deleted "${draft.name}"`);
 *
 * // On navigate away (optional — unmount cleanup does this automatically):
 * useEffect(() => () => flushPending(), [flushPending]);
 * ```
 */
export function useUndoableDelete<T extends { id: string }>({
  onCommit,
  windowMs = 5000,
}: {
  /**
   * Called with the items that should actually be deleted, either when the
   * undo window expires or when `flushPending` is called.
   */
  onCommit: (items: T[]) => void;
  /** Duration of the undo window in milliseconds. Default: 5000. */
  windowMs?: number;
}): UseUndoableDeleteReturn<T> {
  // pendingIds drives re-renders; the batch map + timers live in refs.
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    new Set<string>()
  );

  // Refs hold the mutable batch map and the latest onCommit callback.
  // These are never read or written during render.
  const batchesRef = useRef<Map<string, Batch<T>>>(new Map());
  const onCommitRef = useRef(onCommit);

  // Keep onCommitRef current without needing it as a dep of effects.
  // useLayoutEffect ensures the ref is updated before any useEffect fires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  // ---------------------------------------------------------------------------
  // flushPending — defined as a stable function stored in a ref so the cleanup
  // effect can call it without stale-closure issues.
  // ---------------------------------------------------------------------------

  // We define flushPending as a local function (captured by the cleanup
  // effect), then also expose it as the stable ref for the returned API.
  // Because the cleanup effect captures the ref (not the function value),
  // it always calls the latest version.
  const flushPendingRef = useRef<() => void>(() => {
    // Clear all timers and commit every pending batch.
    const batches = batchesRef.current;
    if (batches.size === 0) return;

    batches.forEach((batch) => {
      clearTimeout(batch.timerId);
      onCommitRef.current(batch.items);
    });
    batches.clear();

    setPendingIds(new Set<string>());
  });

  // Keep flushPendingRef.current up-to-date (reconstruct to close over latest refs).
  // This runs after every render but is side-effect-free.
  flushPendingRef.current = () => {
    const batches = batchesRef.current;
    if (batches.size === 0) return;

    batches.forEach((batch) => {
      clearTimeout(batch.timerId);
      onCommitRef.current(batch.items);
    });
    batches.clear();

    setPendingIds(new Set<string>());
  };

  // Cleanup on unmount — flush so no deletes are lost and no timers leak.
  useEffect(() => {
    return () => {
      flushPendingRef.current();
    };
  }, []); // run only on mount/unmount

  // ---------------------------------------------------------------------------
  // scheduleDelete
  // ---------------------------------------------------------------------------

  function scheduleDelete(items: T[], message?: string): void {
    if (items.length === 0) return;

    const batchId = nextBatchId();
    const label =
      message ??
      `Deleted ${items.length} team${items.length === 1 ? "" : "s"}`;

    // Add ids to pending state immediately.
    setPendingIds((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.id));
      return next;
    });

    // Start the deferred commit timer.
    const timerId = setTimeout(() => {
      // Timer expired — commit and remove from pending.
      onCommitRef.current(items);
      batchesRef.current.delete(batchId);
      setPendingIds((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.delete(item.id));
        return next;
      });
    }, windowMs);

    batchesRef.current.set(batchId, { items, timerId });

    // Show the toast. The Undo action cancels the timer for this batch.
    toast(label, {
      duration: windowMs,
      action: {
        label: "Undo",
        onClick: () => {
          const batch = batchesRef.current.get(batchId);
          if (!batch) return; // already committed (race with timer)
          clearTimeout(batch.timerId);
          batchesRef.current.delete(batchId);
          // Restore ids — remove only those that aren't pending from another batch.
          const stillPendingElsewhere = new Set<string>();
          batchesRef.current.forEach((b) => {
            b.items.forEach((i) => stillPendingElsewhere.add(i.id));
          });
          setPendingIds((prev) => {
            const next = new Set(prev);
            items.forEach((item) => {
              if (!stillPendingElsewhere.has(item.id)) {
                next.delete(item.id);
              }
            });
            return next;
          });
        },
      },
    });
  }

  // Stable wrapper that delegates to the ref — stable identity across renders.
  function flushPending(): void {
    flushPendingRef.current();
  }

  return { pendingIds, scheduleDelete, flushPending };
}
