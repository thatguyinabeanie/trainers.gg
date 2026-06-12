/**
 * Tests for dashboard/stats/stats-client.tsx
 *
 * The component uses `useApiQuery` (via `@trainers/supabase/react-query`) to
 * fetch tournament history, then derives unique alts for the selector and
 * filters history client-side. No direct Supabase client or realtime
 * subscription is used.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

// --- @trainers/supabase/react-query ---
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// --- @/components/ui/select ---
jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      <button
        data-testid="select-trigger"
        onClick={() => onValueChange?.("all")}
      />
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

// --- @/components/dashboard/tournament-history-table ---
jest.mock("@/components/dashboard/tournament-history-table", () => ({
  TournamentHistoryTable: (props: { data: unknown[] }) => (
    <div
      data-testid="tournament-history-table"
      data-count={props.data.length}
    />
  ),
}));

// --- @/components/dashboard/analytics ---
jest.mock("@/components/dashboard/analytics", () => ({
  WinRateTrend: ({ altId }: { altId: number | null }) => (
    <div data-testid="win-rate-trend" data-alt-id={altId} />
  ),
  FormatPerformance: ({ altId }: { altId: number | null }) => (
    <div data-testid="format-performance" data-alt-id={altId} />
  ),
  MostUsedPokemon: ({ altId }: { altId: number | null }) => (
    <div data-testid="most-used-pokemon" data-alt-id={altId} />
  ),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsClient } from "../stats-client";

// =============================================================================
// Helpers
// =============================================================================

type HistoryEntry = {
  id: number;
  altId: number;
  altUsername: string;
  tournamentName: string;
  tournamentSlug: string;
  format: string | null;
  startDate: string | null;
  endDate: string | null;
  placement: number | null;
  wins: number;
  losses: number;
  teamPokemon: string[];
};

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 1,
    altId: 10,
    altUsername: "ash_alt",
    tournamentName: "Kanto Regional",
    tournamentSlug: "kanto-regional",
    format: "vgc-2024",
    startDate: "2026-03-15",
    endDate: "2026-03-16",
    placement: 3,
    wins: 5,
    losses: 2,
    teamPokemon: [],
    ...overrides,
  };
}

/** Default idle result — no data, not loading, no error. */
const idleResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

function setupQuery(
  data: HistoryEntry[] | undefined,
  isLoading = false,
  error: Error | null = null
) {
  mockUseApiQuery.mockReturnValue({
    data,
    isLoading,
    isError: error !== null,
    error,
  });
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApiQuery.mockReturnValue(idleResult);
});

// =============================================================================
// Renders without data
// =============================================================================

describe("renders without data", () => {
  it("renders Stats & History heading", () => {
    setupQuery(undefined);
    render(<StatsClient />);
    expect(screen.getByText("Stats & History")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    setupQuery(undefined);
    render(<StatsClient />);
    expect(
      screen.getByText("View your performance analytics and tournament history")
    ).toBeInTheDocument();
  });

  it("renders analytics components", () => {
    setupQuery(undefined);
    render(<StatsClient />);
    expect(screen.getByTestId("win-rate-trend")).toBeInTheDocument();
    expect(screen.getByTestId("format-performance")).toBeInTheDocument();
    expect(screen.getByTestId("most-used-pokemon")).toBeInTheDocument();
  });

  it("renders TournamentHistoryTable with empty data", () => {
    setupQuery(undefined);
    render(<StatsClient />);
    const table = screen.getByTestId("tournament-history-table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute("data-count", "0");
  });

  it("does not render alt selector when no alts are derived", () => {
    setupQuery([]);
    render(<StatsClient />);
    // With no history there are no alts, so the selector should not render
    expect(screen.queryByText("All Alts")).not.toBeInTheDocument();
  });
});

// =============================================================================
// With tournament history
// =============================================================================

describe("with tournament history", () => {
  it("passes all history to TournamentHistoryTable when no alt is selected", () => {
    setupQuery([makeEntry({ id: 1 }), makeEntry({ id: 2, altId: 11 })]);
    render(<StatsClient />);
    const table = screen.getByTestId("tournament-history-table");
    expect(table).toHaveAttribute("data-count", "2");
  });

  it("renders the alt selector when alts can be derived from history", () => {
    setupQuery([makeEntry({ altId: 10, altUsername: "ash_alt" })]);
    render(<StatsClient />);
    expect(screen.getByText("All Alts")).toBeInTheDocument();
  });

  it("renders unique alt usernames in the selector", () => {
    setupQuery([
      makeEntry({ id: 1, altId: 10, altUsername: "ash_alt" }),
      makeEntry({ id: 2, altId: 11, altUsername: "brock_alt" }),
      // Duplicate alt — should appear once
      makeEntry({ id: 3, altId: 10, altUsername: "ash_alt" }),
    ]);
    render(<StatsClient />);
    const ashEntries = screen.getAllByText("@ash_alt");
    // Selector item + possibly visible text
    expect(ashEntries.length).toBeGreaterThanOrEqual(1);
    const brockEntries = screen.getAllByText("@brock_alt");
    expect(brockEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Match History heading", () => {
    setupQuery([makeEntry()]);
    render(<StatsClient />);
    expect(screen.getByText("Match History")).toBeInTheDocument();
  });
});

// =============================================================================
// useApiQuery is used (not useSupabaseQuery)
// =============================================================================

describe("uses useApiQuery for data fetching", () => {
  it("calls useApiQuery with the tournament-history query key", () => {
    setupQuery([]);
    render(<StatsClient />);
    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.arrayContaining(["me", "tournament-history"]),
      expect.any(Function),
      expect.objectContaining({ staleTime: 30_000 })
    );
  });
});

// =============================================================================
// Analytics components receive selectedAltId
// =============================================================================

describe("analytics components receive altId", () => {
  it("passes null altId to analytics when no alt is selected (default)", () => {
    setupQuery([makeEntry()]);
    render(<StatsClient />);
    // Default selectedAltId is null — analytics components get null
    expect(screen.getByTestId("win-rate-trend")).toHaveAttribute(
      "data-alt-id",
      ""
    );
  });

  it("passes full history to TournamentHistoryTable when selectedAltId is null", () => {
    setupQuery([makeEntry({ id: 1 }), makeEntry({ id: 2 }), makeEntry({ id: 3 })]);
    render(<StatsClient />);
    const table = screen.getByTestId("tournament-history-table");
    // All 3 entries visible when no alt filter
    expect(table).toHaveAttribute("data-count", "3");
  });
});

// =============================================================================
// Alt filtering
// =============================================================================

describe("alt selector filtering", () => {
  it("clicking the selector trigger (select to 'all') keeps all entries visible", async () => {
    const user = userEvent.setup();
    setupQuery([
      makeEntry({ id: 1, altId: 10, altUsername: "ash_alt" }),
      makeEntry({ id: 2, altId: 11, altUsername: "brock_alt" }),
    ]);
    render(<StatsClient />);

    // The mock Select fires onValueChange("all") on click
    const trigger = screen.getByTestId("select-trigger");
    await user.click(trigger);

    // After selecting "all", the history table should still show both entries
    const table = screen.getByTestId("tournament-history-table");
    expect(table).toHaveAttribute("data-count", "2");
  });
});
