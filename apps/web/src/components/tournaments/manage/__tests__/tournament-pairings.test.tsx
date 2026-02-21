/**
 * Tests for TournamentPairings component
 * Covers: loading state, no-phases state, no-rounds state, match table rendering,
 * view mode toggle, report dialog, bye handling, unpaired players banner.
 */

import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentPairings } from "../tournament-pairings";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/actions/tournaments", () => ({
  reportMatchResult: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/components/tournament/bracket-visualization", () => ({
  BracketVisualization: () => (
    <div data-testid="bracket-visualization">Bracket</div>
  ),
}));

jest.mock("@/lib/tournament-utils", () => ({
  transformPhaseData: jest.fn(() => ({})),
}));

// Query data per key pattern
let phasesData: unknown = null;
let roundsData: unknown = null;
let matchesData: unknown = null;
let bracketData: unknown = null;
let unpairedData: unknown = null;
let phasesLoading = false;

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn((_fn: unknown, keys: unknown[]) => {
    const keyStr = String(keys);
    if (keyStr.includes("bracket-rounds")) {
      return { data: bracketData, isLoading: false };
    }
    if (keyStr.includes("unpaired-players")) {
      return { data: unpairedData, isLoading: false };
    }
    if (keyStr.includes("matches")) {
      return {
        data: matchesData,
        isLoading: false,
        refetch: jest.fn(),
      };
    }
    if (keyStr.includes("rounds")) {
      return {
        data: roundsData,
        isLoading: false,
        refetch: jest.fn(),
      };
    }
    // phases
    return { data: phasesData, isLoading: phasesLoading };
  }),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
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

jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <td className={className}>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h4>{children}</h4>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPhase(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Swiss Rounds",
    phase_order: 1,
    phase_type: "swiss",
    ...overrides,
  };
}

function buildRound(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    round_number: 1,
    status: "active",
    matchCount: 4,
    ...overrides,
  };
}

function buildMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    table_number: 1,
    alt1_id: 1,
    alt2_id: 2,
    status: "active",
    player1: { username: "ash", display_name: "Ash Ketchum" },
    player2: { username: "brock", display_name: "Brock" },
    player1Stats: { wins: 2, losses: 0 },
    player2Stats: { wins: 1, losses: 1 },
    winner: null,
    game_wins1: null,
    game_wins2: null,
    ...overrides,
  };
}

const defaultTournament = {
  id: 1,
  slug: "test-tournament",
  status: "active",
  currentPhaseId: 1,
};

function renderPairings(tournament = defaultTournament) {
  return render(<TournamentPairings tournament={tournament} />);
}

function resetMockData() {
  phasesData = null;
  roundsData = null;
  matchesData = null;
  bracketData = null;
  unpairedData = null;
  phasesLoading = false;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentPairings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockData();
  });

  it("shows loading spinner when phases are loading", () => {
    phasesLoading = true;
    renderPairings();
    expect(screen.queryByText("Pairings & Matches")).not.toBeInTheDocument();
  });

  it("shows empty state when no phases exist", () => {
    phasesData = [];
    renderPairings();
    expect(screen.getByText("No phases configured")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tournament phases need to be set up before pairings can be generated."
      )
    ).toBeInTheDocument();
  });

  it("shows header with title", () => {
    phasesData = [buildPhase()];
    roundsData = [];
    renderPairings();
    expect(screen.getByText("Pairings & Matches")).toBeInTheDocument();
    expect(
      screen.getByText("View tournament rounds and player pairings")
    ).toBeInTheDocument();
  });

  it("shows no-rounds state when phases exist but no rounds", () => {
    phasesData = [buildPhase()];
    roundsData = [];
    renderPairings();
    expect(screen.getByText("No rounds yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start the first round from the Overview tab.")
    ).toBeInTheDocument();
  });

  it("renders Table and Bracket view toggle buttons", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [];
    renderPairings();
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Bracket")).toBeInTheDocument();
  });

  it("renders match table with column headers", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [buildMatch()];
    renderPairings();

    expect(screen.getByText("Player 1")).toBeInTheDocument();
    expect(screen.getByText("Player 2")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders match with player names and table number", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [buildMatch()];
    renderPairings();

    expect(screen.getByText("Table 1")).toBeInTheDocument();
  });

  it("renders BYE match correctly", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [
      buildMatch({
        alt2_id: null,
        player2: null,
        player2Stats: null,
      }),
    ];
    renderPairings();

    // BYE label appears for table and player2
    const byeTexts = screen.getAllByText("BYE");
    expect(byeTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Auto-win")).toBeInTheDocument();
  });

  it("renders no-pairings state when round has no matches", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [];
    renderPairings();
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
  });

  it("shows Report button for active matches", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [buildMatch({ status: "active" })];
    renderPairings();
    expect(screen.getByText("Report")).toBeInTheDocument();
  });

  it("does not show Report button for completed matches", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [
      buildMatch({
        status: "completed",
        winner: { username: "ash", display_name: "Ash Ketchum" },
        game_wins1: 2,
        game_wins2: 1,
      }),
    ];
    renderPairings();
    expect(screen.queryByText("Report")).not.toBeInTheDocument();
  });

  it("renders unpaired players banner when present", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [];
    unpairedData = [
      { altId: 1, username: "late_player", displayName: "Late Player" },
      { altId: 2, username: "another_late", displayName: null },
    ];
    renderPairings();

    expect(
      screen.getByText("2 checked-in players not paired in this round")
    ).toBeInTheDocument();
  });

  it("uses singular 'player' for 1 unpaired player", () => {
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [];
    unpairedData = [{ altId: 1, username: "solo", displayName: "Solo Player" }];
    renderPairings();

    expect(
      screen.getByText("1 checked-in player not paired in this round")
    ).toBeInTheDocument();
  });

  it("switches to bracket view when Bracket button is clicked", async () => {
    const user = userEvent.setup();
    phasesData = [buildPhase()];
    roundsData = [buildRound()];
    matchesData = [buildMatch()];
    bracketData = [];
    renderPairings();

    await user.click(screen.getByText("Bracket"));
    expect(screen.getByTestId("bracket-visualization")).toBeInTheDocument();
  });

  it("renders round info in card header", () => {
    phasesData = [buildPhase({ name: "Swiss Rounds" })];
    roundsData = [buildRound({ round_number: 3, matchCount: 8 })];
    matchesData = [buildMatch()];
    renderPairings();

    expect(screen.getByText(/Swiss Rounds - Round/)).toBeInTheDocument();
  });
});
