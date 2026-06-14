/**
 * Tests for TournamentAuditLog component
 * Covers: loading state, empty state, log entry rendering, category filtering, refresh
 */

import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TournamentAuditLog } from "../tournament-audit-log";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetTournamentAuditLog = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentAuditLog: (...args: unknown[]) =>
    mockGetTournamentAuditLog(...args),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({})),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

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
  return render(<TournamentAuditLog tournament={{ id: 1 }} />, {
    wrapper: createWrapper(),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner when query is pending", () => {
    // Never resolve so the component stays in loading state
    mockGetTournamentAuditLog.mockReturnValue(new Promise(() => {}));
    renderAuditLog();
    // Header should not be visible while loading
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows empty state when no entries exist", async () => {
    mockGetTournamentAuditLog.mockResolvedValue([]);
    renderAuditLog();
    await waitFor(() => {
      expect(screen.getByText("No events yet")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Events will appear here as actions are taken in the tournament."
      )
    ).toBeInTheDocument();
  });

  it("shows header with title and description", async () => {
    mockGetTournamentAuditLog.mockResolvedValue([]);
    renderAuditLog();
    await waitFor(() => {
      expect(screen.getByText("Audit Log")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Chronological record of tournament events and actions")
    ).toBeInTheDocument();
  });

  it("renders log entries with labels and metadata", async () => {
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
    mockGetTournamentAuditLog.mockResolvedValue(entries);
    renderAuditLog();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(badges.some((b) => b.textContent === "Score Submitted")).toBe(
        true
      );
    });

    // Match ID
    expect(screen.getByText("Match #42")).toBeInTheDocument();

    // Game and table numbers
    expect(screen.getByText("Game 2")).toBeInTheDocument();
    expect(screen.getByText("Table 5")).toBeInTheDocument();

    // Formatted time
    expect(screen.getByText("time(2026-01-15T10:00:00Z)")).toBeInTheDocument();
  });

  it("shows event count in card description", async () => {
    const entries = [buildEntry({ id: 1 }), buildEntry({ id: 2 })];
    mockGetTournamentAuditLog.mockResolvedValue(entries);
    renderAuditLog();

    await waitFor(() => {
      const description = screen.getByTestId("card-description");
      expect(description.textContent).toContain("2 events");
    });
  });

  it("shows 0 events when query returns null", async () => {
    mockGetTournamentAuditLog.mockResolvedValue(null);
    renderAuditLog();

    await waitFor(() => {
      const description = screen.getByTestId("card-description");
      expect(description.textContent).toContain("0 events");
    });
  });

  it("falls back to raw action name for unknown actions", async () => {
    const entries = [
      buildEntry({
        id: 1,
        action: "custom.unknown_action",
        match_id: null,
        metadata: null,
      }),
    ];
    mockGetTournamentAuditLog.mockResolvedValue(entries);
    renderAuditLog();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(
        badges.some((b) => b.textContent === "custom.unknown_action")
      ).toBe(true);
    });
  });

  it("triggers a new fetch when the refresh button is clicked", async () => {
    const user = userEvent.setup();
    mockGetTournamentAuditLog.mockResolvedValue([]);
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText("No events yet")).toBeInTheDocument();
    });

    // The refresh button is the Button component with RefreshCw icon
    const buttons = screen.getAllByRole("button");
    const refreshBtn = buttons.find(
      (b) => !b.getAttribute("data-testid")?.startsWith("filter")
    );
    expect(refreshBtn).toBeDefined();

    await user.click(refreshBtn!);

    // A second call is made because the refreshKey changed the query key
    await waitFor(() => {
      expect(mockGetTournamentAuditLog).toHaveBeenCalledTimes(2);
    });
  });

  it("renders description with actor and winner name highlights", async () => {
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
    mockGetTournamentAuditLog.mockResolvedValue(entries);
    renderAuditLog();

    await waitFor(() => {
      // renderDescription splits text around names into separate spans,
      // so we use a custom matcher to find the full text across elements
      expect(
        screen.getByText((_content, element) => {
          return element?.textContent === "Ash defeated Brock in game 1";
        })
      ).toBeInTheDocument();
    });
  });

  it("renders multiple entries in sequence", async () => {
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
    mockGetTournamentAuditLog.mockResolvedValue(entries);
    renderAuditLog();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const labels = badges.map((b) => b.textContent);
      expect(labels).toContain("Tournament Started");
      expect(labels).toContain("Round Created");
      expect(labels).toContain("Score Submitted");
    });
  });

  it("passes the tournament id to getTournamentAuditLog", async () => {
    mockGetTournamentAuditLog.mockResolvedValue([]);
    renderAuditLog();

    await waitFor(() => {
      expect(mockGetTournamentAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        1,
        expect.objectContaining({ limit: 100 })
      );
    });
  });

  it("passes filtered actions when a category filter is active", async () => {
    const user = userEvent.setup();
    mockGetTournamentAuditLog.mockResolvedValue([]);
    renderAuditLog();

    await waitFor(() => {
      expect(screen.getByText("No events yet")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("filter-match"));

    await waitFor(() => {
      const calls = mockGetTournamentAuditLog.mock.calls;
      const lastCall = calls[calls.length - 1];
      // The last call should include actions array for "match" category
      expect(lastCall[2]).toHaveProperty("actions");
      expect(Array.isArray(lastCall[2].actions)).toBe(true);
    });
  });
});
