/**
 * Tests for useUndoableDelete.
 *
 * Covers:
 * - scheduleDelete adds ids to pendingIds and shows a toast
 * - Timer expiry calls onCommit with the batch and clears pendingIds
 * - Invoking the toast Undo action cancels the commit and restores pendingIds
 * - flushPending commits all pending batches immediately and clears timers
 * - Two concurrent batches commit/undo independently
 * - Unmount cleanup flushes all pending batches (no lost deletes, no timer leaks)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

// =============================================================================
// Module-level mock — must be hoisted before any imports of the module under test
// =============================================================================

/** Capture the last toast call so tests can invoke the Undo action. */
const mockToast = jest.fn();
jest.mock("sonner", () => ({ toast: mockToast }));

// Import after mock registration
import { useUndoableDelete } from "../use-undoable-delete";

// =============================================================================
// Helpers
// =============================================================================

function makeItem(id: string) {
  return { id };
}

/**
 * Extract the Undo `onClick` from the most recent `toast(...)` call.
 * Throws if the toast wasn't called or has no action.
 */
function getLastUndoAction(): () => void {
  const calls = mockToast.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error("toast was not called");
  const [, options] = lastCall as [string, { action?: { onClick: () => void } }];
  if (!options?.action?.onClick) throw new Error("toast had no action.onClick");
  return options.action.onClick;
}

// =============================================================================
// Tests
// =============================================================================

describe("useUndoableDelete", () => {
  let onCommit: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    onCommit = jest.fn();
    mockToast.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Basic scheduleDelete behaviour
  // ---------------------------------------------------------------------------

  describe("scheduleDelete", () => {
    it("adds item ids to pendingIds immediately and shows a toast", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      const item = makeItem("abc");

      act(() => {
        result.current.scheduleDelete([item]);
      });

      expect(result.current.pendingIds.has("abc")).toBe(true);
      expect(mockToast).toHaveBeenCalledTimes(1);
    });

    it("shows the default message when no message is provided", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("a"), makeItem("b")]);
      });

      const [message] = mockToast.mock.calls[0] as [string];
      expect(message).toBe("Deleted 2 teams");
    });

    it("shows singular form for a single item", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("x")]);
      });

      const [message] = mockToast.mock.calls[0] as [string];
      expect(message).toBe("Deleted 1 team");
    });

    it("uses the custom message when provided", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("x")], "Goodbye forever");
      });

      const [message] = mockToast.mock.calls[0] as [string];
      expect(message).toBe("Goodbye forever");
    });

    it("does nothing when items array is empty", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([]);
      });

      expect(result.current.pendingIds.size).toBe(0);
      expect(mockToast).not.toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("passes duration matching windowMs to the toast", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 3000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("a")]);
      });

      const [, options] = mockToast.mock.calls[0] as [string, { duration: number }];
      expect(options.duration).toBe(3000);
    });
  });

  // ---------------------------------------------------------------------------
  // Timer expiry → commit
  // ---------------------------------------------------------------------------

  describe("timer expiry", () => {
    it("calls onCommit with the batch items after windowMs elapses", () => {
      const item = makeItem("abc");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([item]);
      });

      expect(onCommit).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith([item]);
    });

    it("removes ids from pendingIds after the timer expires", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("abc")]);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.pendingIds.has("abc")).toBe(false);
    });

    it("does NOT call onCommit before windowMs elapses", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("abc")]);
      });

      act(() => {
        jest.advanceTimersByTime(4999);
      });

      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Undo action → cancel
  // ---------------------------------------------------------------------------

  describe("Undo action", () => {
    it("cancels the commit when Undo is invoked before expiry", () => {
      const item = makeItem("abc");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([item]);
      });

      const undo = getLastUndoAction();

      act(() => {
        undo();
      });

      // Advance past the window — no commit should fire
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onCommit).not.toHaveBeenCalled();
    });

    it("restores ids to pendingIds === false (removes them) when Undo is invoked", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("abc")]);
      });

      const undo = getLastUndoAction();

      act(() => {
        undo();
      });

      expect(result.current.pendingIds.has("abc")).toBe(false);
    });

    it("is a no-op when invoked after the timer has already committed", () => {
      const item = makeItem("abc");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([item]);
      });

      const undo = getLastUndoAction();

      // Let the timer fire first
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);

      // Now invoke undo — should not cause a second commit or throw
      act(() => {
        undo();
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // flushPending
  // ---------------------------------------------------------------------------

  describe("flushPending", () => {
    it("immediately commits all pending batches and clears pendingIds", () => {
      const items = [makeItem("a"), makeItem("b")];
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete(items);
      });

      act(() => {
        result.current.flushPending();
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith(items);
      expect(result.current.pendingIds.size).toBe(0);
    });

    it("cancels the outstanding timer so it does not fire again after flush", () => {
      const items = [makeItem("a")];
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete(items);
      });

      act(() => {
        result.current.flushPending();
      });

      // Advance past original window — onCommit should NOT be called a second time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when there are no pending batches", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.flushPending();
      });

      expect(onCommit).not.toHaveBeenCalled();
      expect(result.current.pendingIds.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple concurrent batches
  // ---------------------------------------------------------------------------

  describe("multiple concurrent batches", () => {
    it("tracks both batches in pendingIds", () => {
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([makeItem("a")]);
        result.current.scheduleDelete([makeItem("b")]);
      });

      expect(result.current.pendingIds.has("a")).toBe(true);
      expect(result.current.pendingIds.has("b")).toBe(true);
    });

    it("commits each batch independently when their timers expire", () => {
      const itemA = makeItem("a");
      const itemB = makeItem("b");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([itemA]);
      });

      // Advance 2 s, then add a second batch
      act(() => {
        jest.advanceTimersByTime(2000);
        result.current.scheduleDelete([itemB]);
      });

      // Advance 3 more s → first batch (5 s total) fires
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith([itemA]);
      expect(result.current.pendingIds.has("a")).toBe(false);
      expect(result.current.pendingIds.has("b")).toBe(true); // still pending

      // Advance 2 more s → second batch fires
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onCommit).toHaveBeenCalledTimes(2);
      expect(onCommit).toHaveBeenLastCalledWith([itemB]);
      expect(result.current.pendingIds.has("b")).toBe(false);
    });

    it("undoing one batch does not affect the other batch", () => {
      const itemA = makeItem("a");
      const itemB = makeItem("b");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([itemA]);
      });
      const undoA = getLastUndoAction();

      act(() => {
        result.current.scheduleDelete([itemB]);
      });

      // Undo batch A only
      act(() => {
        undoA();
      });

      expect(result.current.pendingIds.has("a")).toBe(false);
      expect(result.current.pendingIds.has("b")).toBe(true); // unaffected

      // Let batch B's timer expire
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // onCommit called only for B (A was undone)
      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith([itemB]);
    });

    it("flushPending commits all batches and clears all pending ids", () => {
      const itemA = makeItem("a");
      const itemB = makeItem("b");
      const { result } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([itemA]);
        result.current.scheduleDelete([itemB]);
      });

      act(() => {
        result.current.flushPending();
      });

      expect(onCommit).toHaveBeenCalledTimes(2);
      expect(result.current.pendingIds.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Unmount cleanup
  // ---------------------------------------------------------------------------

  describe("unmount cleanup", () => {
    it("flushes pending batches on unmount so no deletes are lost", () => {
      const item = makeItem("abc");
      const { result, unmount } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([item]);
      });

      expect(onCommit).not.toHaveBeenCalled();

      act(() => {
        unmount();
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith([item]);
    });

    it("does not fire the deferred timer after unmount flush", () => {
      const item = makeItem("abc");
      const { result, unmount } = renderHook(() =>
        useUndoableDelete({ onCommit, windowMs: 5000 })
      );

      act(() => {
        result.current.scheduleDelete([item]);
      });

      act(() => {
        unmount();
      });

      // Advance past the window — should NOT cause a second onCommit call
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });
});
