/**
 * Tests for useDraftSelection
 *
 * Covers:
 *   - toggle add/remove + count; isSelected
 *   - toggleRange after an anchor selects the inclusive contiguous range
 *   - reversed-direction range works
 *   - no-anchor toggleRange acts like toggle
 *   - selectAll selects everything
 *   - clear empties + resets anchor
 *   - ids removed from orderedIds are pruned from selected
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

import { useDraftSelection } from "../use-draft-selection";

// =============================================================================
// Helpers
// =============================================================================

const IDS = ["a", "b", "c", "d", "e"] as const;

/** Render the hook with the standard 5-id list. */
function setup(orderedIds: readonly string[] = IDS) {
  return renderHook(({ ids }) => useDraftSelection(ids), {
    initialProps: { ids: orderedIds },
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("useDraftSelection", () => {
  // ---------------------------------------------------------------------------
  // toggle — add / remove / count / isSelected
  // ---------------------------------------------------------------------------
  describe("toggle", () => {
    it("starts with an empty selection", () => {
      const { result } = setup();
      expect(result.current.count).toBe(0);
      expect(result.current.selected.size).toBe(0);
    });

    it("adds an id to the selection", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("b");
      });

      expect(result.current.count).toBe(1);
      expect(result.current.isSelected("b")).toBe(true);
      expect(result.current.isSelected("a")).toBe(false);
    });

    it("removes an id that is already selected", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("c");
      });
      act(() => {
        result.current.toggle("c");
      });

      expect(result.current.count).toBe(0);
      expect(result.current.isSelected("c")).toBe(false);
    });

    it("accumulates multiple individually toggled ids", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("a");
        result.current.toggle("c");
        result.current.toggle("e");
      });

      expect(result.current.count).toBe(3);
      expect(result.current.isSelected("a")).toBe(true);
      expect(result.current.isSelected("c")).toBe(true);
      expect(result.current.isSelected("e")).toBe(true);
      expect(result.current.isSelected("b")).toBe(false);
    });

    it("no-ops when id is not in orderedIds", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("NONEXISTENT");
      });

      expect(result.current.count).toBe(0);
    });

    it("isSelected returns false for an unknown id regardless of selection state", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("a");
      });

      expect(result.current.isSelected("UNKNOWN")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // toggleRange — range add semantics
  // ---------------------------------------------------------------------------
  describe("toggleRange", () => {
    it("acts like toggle when there is no anchor", () => {
      const { result } = setup();

      act(() => {
        result.current.toggleRange("c");
      });

      // No anchor → toggle behaviour: c gets added
      expect(result.current.isSelected("c")).toBe(true);
      expect(result.current.count).toBe(1);
    });

    it("selects the inclusive range from anchor to target (forward)", () => {
      const { result } = setup();

      // Anchor at index 1 ("b")
      act(() => {
        result.current.toggle("b");
      });

      // Range from "b" (idx 1) to "d" (idx 3) → b, c, d
      act(() => {
        result.current.toggleRange("d");
      });

      expect(result.current.isSelected("b")).toBe(true);
      expect(result.current.isSelected("c")).toBe(true);
      expect(result.current.isSelected("d")).toBe(true);
      expect(result.current.isSelected("a")).toBe(false);
      expect(result.current.isSelected("e")).toBe(false);
      expect(result.current.count).toBe(3);
    });

    it("selects the inclusive range from anchor to target (reversed direction)", () => {
      const { result } = setup();

      // Anchor at index 3 ("d")
      act(() => {
        result.current.toggle("d");
      });

      // Range from "d" (idx 3) to "a" (idx 0) → a, b, c, d
      act(() => {
        result.current.toggleRange("a");
      });

      expect(result.current.isSelected("a")).toBe(true);
      expect(result.current.isSelected("b")).toBe(true);
      expect(result.current.isSelected("c")).toBe(true);
      expect(result.current.isSelected("d")).toBe(true);
      expect(result.current.isSelected("e")).toBe(false);
      expect(result.current.count).toBe(4);
    });

    it("range-adds to existing selection (does not deselect out-of-range ids)", () => {
      const { result } = setup();

      // Pre-select "e" independently
      act(() => {
        result.current.toggle("e");
      });

      // Set anchor at "a" (toggle flips state; "e" stays selected)
      act(() => {
        result.current.toggle("a");
      });

      // Range from "a" (idx 0) to "c" (idx 2) → a, b, c (range-add)
      act(() => {
        result.current.toggleRange("c");
      });

      expect(result.current.isSelected("a")).toBe(true);
      expect(result.current.isSelected("b")).toBe(true);
      expect(result.current.isSelected("c")).toBe(true);
      // "e" was independently selected — must NOT be deselected by the range op
      expect(result.current.isSelected("e")).toBe(true);
      expect(result.current.count).toBe(4);
    });

    it("single-element range (anchor === target) adds that id", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("c");
      });
      // Deselect c so we can verify the range re-adds it
      act(() => {
        result.current.toggle("c");
      });
      // Now anchor is c, selection is empty — range to c should add c
      act(() => {
        result.current.toggleRange("c");
      });

      expect(result.current.isSelected("c")).toBe(true);
      expect(result.current.count).toBe(1);
    });

    it("no-ops when target id is not in orderedIds", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("b");
      });
      act(() => {
        result.current.toggleRange("NONEXISTENT");
      });

      // Only "b" should be selected — the invalid target is ignored
      expect(result.current.count).toBe(1);
      expect(result.current.isSelected("b")).toBe(true);
    });

    it("does not update the anchor after a range operation", () => {
      const { result } = setup();

      // Set anchor at "a"
      act(() => {
        result.current.toggle("a");
      });
      // Range to "c" — anchor should still be "a"
      act(() => {
        result.current.toggleRange("c");
      });
      // Another range from same anchor "a" to "e"
      act(() => {
        result.current.toggleRange("e");
      });

      // All ids from index 0 to 4 should be selected
      for (const id of IDS) {
        expect(result.current.isSelected(id)).toBe(true);
      }
      expect(result.current.count).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // selectAll
  // ---------------------------------------------------------------------------
  describe("selectAll", () => {
    it("selects every id in orderedIds", () => {
      const { result } = setup();

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.count).toBe(IDS.length);
      for (const id of IDS) {
        expect(result.current.isSelected(id)).toBe(true);
      }
    });

    it("works from a partial selection", () => {
      const { result } = setup();

      act(() => {
        result.current.toggle("b");
      });
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.count).toBe(IDS.length);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------
  describe("clear", () => {
    it("empties the selection", () => {
      const { result } = setup();

      act(() => {
        result.current.selectAll();
      });
      act(() => {
        result.current.clear();
      });

      expect(result.current.count).toBe(0);
      expect(result.current.selected.size).toBe(0);
    });

    it("resets the anchor so subsequent toggleRange acts like toggle", () => {
      const { result } = setup();

      // Set an anchor
      act(() => {
        result.current.toggle("d");
      });
      // Clear — anchor reset
      act(() => {
        result.current.clear();
      });
      // toggleRange without anchor → toggle semantics
      act(() => {
        result.current.toggleRange("b");
      });

      expect(result.current.count).toBe(1);
      expect(result.current.isSelected("b")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Pruning — ids removed from orderedIds are dropped from selected
  // ---------------------------------------------------------------------------
  describe("pruning on orderedIds change", () => {
    it("removes selected ids that are no longer in orderedIds", () => {
      const { result, rerender } = setup(["x", "y", "z"]);

      act(() => {
        result.current.toggle("x");
        result.current.toggle("y");
        result.current.toggle("z");
      });
      expect(result.current.count).toBe(3);

      // Remove "x" from the list (draft deleted)
      rerender({ ids: ["y", "z"] });

      expect(result.current.isSelected("x")).toBe(false);
      expect(result.current.isSelected("y")).toBe(true);
      expect(result.current.isSelected("z")).toBe(true);
      expect(result.current.count).toBe(2);
    });

    it("returns an empty selection when all selected ids are removed", () => {
      const { result, rerender } = setup(["p", "q"]);

      act(() => {
        result.current.selectAll();
      });

      rerender({ ids: [] });

      expect(result.current.count).toBe(0);
    });

    it("stable selection is unchanged when no ids are removed", () => {
      const { result, rerender } = setup(["a", "b", "c"]);

      act(() => {
        result.current.toggle("b");
      });

      const snapshotBefore = result.current.selected;

      // Rerender with same list — no pruning needed
      rerender({ ids: ["a", "b", "c"] });

      // Referential equality: same Set object (fast-path)
      expect(result.current.selected).toBe(snapshotBefore);
      expect(result.current.count).toBe(1);
    });
  });
});
