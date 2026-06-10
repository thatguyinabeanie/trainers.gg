/**
 * Tests for RecentRuns — the admin import-runs disclosure feed.
 *
 * The component is purely presentational: it receives `runs` as props and
 * renders them in a collapsible list. Tests focus on:
 * - Empty state rendering
 * - Row rendering (source label, status badge, processed/errors, trigger, time)
 * - Status badge color class (ok=emerald, partial=amber, error=red, skipped=gray)
 * - skip_reason display
 * - Loading state renders skeleton rows
 */

// =============================================================================
// Mocks — before imports (Jest hoisting)
// =============================================================================

// Collapsible uses Base UI's internal state machine which doesn't work in
// JSDOM. Replace with a transparent wrapper that always shows content.
jest.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
}));

// Badge — render as a simple span with the className and children so we can
// inspect the Tailwind color class in assertions.
jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" data-class={className}>
      {children}
    </span>
  ),
}));

// cn — identity-ish: return classes joined so className assertions still work.
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// formatTimeAgo — deterministic output so tests don't depend on wall time.
jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (s: string) => `${s}-ago`,
}));

// lucide-react — stub icons so no canvas/SVG errors in jsdom.
jest.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="icon-chevron" />,
  History: () => <span data-testid="icon-history" />,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from "react";
import { render, screen } from "@testing-library/react";

import { RecentRuns } from "../recent-runs";
import type { ImportRunRow } from "@trainers/supabase";

// =============================================================================
// Test data helpers
// =============================================================================

function makeRun(overrides: Partial<ImportRunRow> = {}): ImportRunRow {
  return {
    id: 1,
    source: "limitless",
    trigger: "cron",
    status: "ok",
    processed: 5,
    errors: 0,
    remaining: 0,
    skip_reason: null,
    detail: null,
    started_at: "2025-01-01T00:00:00Z",
    finished_at: "2025-01-01T00:01:00Z",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("RecentRuns", () => {
  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("renders the 'No import runs recorded yet' message when runs is empty", () => {
      render(<RecentRuns runs={[]} />);

      expect(
        screen.getByText(/No import runs recorded yet/i)
      ).toBeInTheDocument();
    });

    it("does not show a run count in the header when runs is empty", () => {
      render(<RecentRuns runs={[]} />);

      // The count "(N)" only appears when runs.length > 0
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Row rendering
  // ---------------------------------------------------------------------------
  describe("row rendering", () => {
    it("renders the source label for a limitless run", () => {
      render(<RecentRuns runs={[makeRun({ source: "limitless" })]} />);

      expect(screen.getByText("Limitless")).toBeInTheDocument();
    });

    it("renders the source label for an rk9 run", () => {
      render(<RecentRuns runs={[makeRun({ source: "rk9" })]} />);

      expect(screen.getByText("RK9")).toBeInTheDocument();
    });

    it("renders the source label for a compile run", () => {
      render(<RecentRuns runs={[makeRun({ source: "compile" })]} />);

      expect(screen.getByText("Compile")).toBeInTheDocument();
    });

    it("renders the trigger ('cron' or 'manual')", () => {
      render(<RecentRuns runs={[makeRun({ trigger: "manual" })]} />);

      expect(screen.getByText("manual")).toBeInTheDocument();
    });

    it("renders processed count", () => {
      render(<RecentRuns runs={[makeRun({ processed: 12 })]} />);

      expect(screen.getByText(/12 processed/)).toBeInTheDocument();
    });

    it("shows error count only when errors > 0", () => {
      render(<RecentRuns runs={[makeRun({ errors: 3 })]} />);

      expect(screen.getByText(/3 errors/)).toBeInTheDocument();
    });

    it("does not show error count when errors = 0", () => {
      render(<RecentRuns runs={[makeRun({ errors: 0 })]} />);

      expect(screen.queryByText(/0 errors/)).not.toBeInTheDocument();
    });

    it("renders skip_reason when present", () => {
      render(
        <RecentRuns
          runs={[
            makeRun({
              status: "skipped",
              skip_reason: "auto-import disabled",
            }),
          ]}
        />
      );

      expect(screen.getByText("auto-import disabled")).toBeInTheDocument();
    });

    it("does not show skip_reason element when skip_reason is null", () => {
      render(<RecentRuns runs={[makeRun({ skip_reason: null })]} />);

      // No italic skip-reason text visible
      expect(screen.queryByText(/disabled/i)).not.toBeInTheDocument();
    });

    it("calls formatTimeAgo with started_at", () => {
      render(
        <RecentRuns runs={[makeRun({ started_at: "2025-03-01T12:00:00Z" })]} />
      );

      expect(screen.getByText("2025-03-01T12:00:00Z-ago")).toBeInTheDocument();
    });

    it("renders a run count in the header when there are rows", () => {
      render(
        <RecentRuns
          runs={[makeRun({ id: 1 }), makeRun({ id: 2 }), makeRun({ id: 3 })]}
        />
      );

      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Status badge color mapping
  // ---------------------------------------------------------------------------
  describe("status badge colors", () => {
    it.each([
      ["ok", "emerald"],
      ["partial", "amber"],
      ["error", "red"],
      ["skipped", "gray"],
      ["running", "blue"],
    ] as const)(
      "status '%s' renders a badge with '%s' color class",
      (status, colorHint) => {
        render(<RecentRuns runs={[makeRun({ status })]} />);

        const badge = screen.getByTestId("badge");
        expect(badge.getAttribute("data-class")).toContain(colorHint);
      }
    );

    it("renders the correct label text for each status", () => {
      const statusLabels = [
        ["ok", "OK"],
        ["partial", "Partial"],
        ["error", "Error"],
        ["skipped", "Skipped"],
        ["running", "Running"],
      ] as const;

      for (const [status, label] of statusLabels) {
        const { unmount } = render(<RecentRuns runs={[makeRun({ status })]} />);
        expect(screen.getByTestId("badge")).toHaveTextContent(label);
        unmount();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  describe("loading state", () => {
    it("renders skeleton rows (aria-hidden) instead of the list when loading is true", () => {
      render(<RecentRuns runs={[]} loading />);

      const skeleton = document.querySelector("[aria-hidden]");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render the empty-state message while loading", () => {
      render(<RecentRuns runs={[]} loading />);

      expect(
        screen.queryByText(/No import runs recorded yet/i)
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple rows
  // ---------------------------------------------------------------------------
  describe("multiple rows", () => {
    it("renders all rows when multiple runs are passed", () => {
      const runs: ImportRunRow[] = [
        makeRun({ id: 1, source: "limitless", status: "ok" }),
        makeRun({ id: 2, source: "rk9", status: "skipped" }),
        makeRun({ id: 3, source: "compile", status: "error" }),
      ];

      render(<RecentRuns runs={runs} />);

      expect(screen.getByText("Limitless")).toBeInTheDocument();
      expect(screen.getByText("RK9")).toBeInTheDocument();
      expect(screen.getByText("Compile")).toBeInTheDocument();
      expect(screen.getAllByTestId("badge")).toHaveLength(3);
    });
  });
});
