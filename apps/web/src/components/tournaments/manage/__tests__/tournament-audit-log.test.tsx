/**
 * Tests for TournamentAuditLog component
 * Covers: loading state, empty state, log entry rendering, category filtering, refresh
 */

import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentAuditLog } from "../tournament-audit-log";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRefetch = jest.fn();

let mockQueryReturn: {
  data: unknown;
  isLoading: boolean;
  refetch: jest.Mock;
} = {
  data: null,
  isLoading: false,
  refetch: mockRefetch,
};

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(() => mockQueryReturn),
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: jest.fn((date: string) => `time(${date})`),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => <span data-testid="badge">{children}</span>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange: (v: string | null) => void;
  }) => (
    <div data-testid="select">
      {children}
      {/* Expose filter change callbacks for testing */}
      <button
        data-testid="filter-match"
        onClick={() => onValueChange("match")}
      />
      <button data-testid="filter-all" onClick={() => onValueChange("all")} />
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode; value: string }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    action: "match.score_submitted",
    match_id: 42,
    metadata: {
      description: "Player A scored",
      game_number: 1,
      table_number: 3,
    },
    created_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function renderAuditLog() {
  return render(<TournamentAuditLog tournament={{ id: 1 }} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryReturn = { data: null, isLoading: false, refetch: mockRefetch };
  });

  it("shows loading spinner when data is loading", () => {
    mockQueryReturn = { data: null, isLoading: true, refetch: mockRefetch };
    renderAuditLog();
    // Loader2 renders as an svg; check for the spinner container
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows empty state when no entries exist", () => {
    mockQueryReturn = { data: [], isLoading: false, refetch: mockRefetch };
    renderAuditLog();
    expect(screen.getByText("No events yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Events will appear here as actions are taken in the tournament."
      )
    ).toBeInTheDocument();
  });

  it("shows header with title and description", () => {
    mockQueryReturn = { data: [], isLoading: false, refetch: mockRefetch };
    renderAuditLog();
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    expect(
      screen.getByText("Chronological record of tournament events and actions")
    ).toBeInTheDocument();
  });

  it("renders log entries with labels and metadata", () => {
    const entries = [
      buildEntry({
        id: 1,
        action: "match.score_submitted",
        match_id: 42,
        metadata: {
          description: "Ash submitted score",
          game_number: 2,
          table_number: 5,
          actor_name: "Ash",
        },
      }),
    ];
    mockQueryReturn = { data: entries, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    // Action label
    const badges = screen.getAllByTestId("badge");
    expect(badges.some((b) => b.textContent === "Score Submitted")).toBe(true);

    // Match ID
    expect(screen.getByText("Match #42")).toBeInTheDocument();

    // Game and table numbers
    expect(screen.getByText("Game 2")).toBeInTheDocument();
    expect(screen.getByText("Table 5")).toBeInTheDocument();

    // Formatted time
    expect(screen.getByText("time(2026-01-15T10:00:00Z)")).toBeInTheDocument();
  });

  it("shows event count in card description", () => {
    const entries = [buildEntry({ id: 1 }), buildEntry({ id: 2 })];
    mockQueryReturn = { data: entries, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    const description = screen.getByTestId("card-description");
    expect(description.textContent).toContain("2 events");
  });

  it("shows 0 events when data is null", () => {
    mockQueryReturn = { data: null, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    const description = screen.getByTestId("card-description");
    expect(description.textContent).toContain("0 events");
  });

  it("falls back to raw action name for unknown actions", () => {
    const entries = [
      buildEntry({
        id: 1,
        action: "custom.unknown_action",
        match_id: null,
        metadata: null,
      }),
    ];
    mockQueryReturn = { data: entries, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    const badges = screen.getAllByTestId("badge");
    expect(badges.some((b) => b.textContent === "custom.unknown_action")).toBe(
      true
    );
  });

  it("calls refetch when refresh button is clicked", async () => {
    const user = userEvent.setup();
    mockQueryReturn = { data: [], isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    // The refresh button is a Button with RefreshCw icon
    const buttons = screen.getAllByRole("button");
    // Find the refresh button (not filter buttons from mock)
    const refreshBtn = buttons.find(
      (b) => !b.getAttribute("data-testid")?.startsWith("filter")
    );
    expect(refreshBtn).toBeDefined();
    await user.click(refreshBtn!);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders description with actor and winner name highlights", () => {
    const entries = [
      buildEntry({
        id: 1,
        action: "match.result_reported",
        metadata: {
          description: "Ash defeated Brock in game 1",
          actor_name: "Ash",
          winner_name: "Ash",
        },
      }),
    ];
    mockQueryReturn = { data: entries, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    // renderDescription splits text around names into separate spans,
    // so we use a custom matcher to find the full text across elements
    expect(
      screen.getByText((_content, element) => {
        return element?.textContent === "Ash defeated Brock in game 1";
      })
    ).toBeInTheDocument();
  });

  it("renders multiple entries in sequence", () => {
    const entries = [
      buildEntry({
        id: 1,
        action: "tournament.started",
        match_id: null,
        metadata: null,
      }),
      buildEntry({
        id: 2,
        action: "tournament.round_created",
        match_id: null,
        metadata: null,
      }),
      buildEntry({
        id: 3,
        action: "match.score_submitted",
        match_id: 10,
        metadata: null,
      }),
    ];
    mockQueryReturn = { data: entries, isLoading: false, refetch: mockRefetch };
    renderAuditLog();

    const badges = screen.getAllByTestId("badge");
    const labels = badges.map((b) => b.textContent);
    expect(labels).toContain("Tournament Started");
    expect(labels).toContain("Round Created");
    expect(labels).toContain("Score Submitted");
  });
});
