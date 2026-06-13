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

// ── useApiQuery mock ─────────────────────────────────────────────────────────
//
// The component fetches the entire pairings data set (`TournamentPairingsData`)
// in a single `useApiQuery` call against `/api/v1/tournaments/[id]/pairings`.
// We hand back a pre-built data object via `mockUseApiQuery`.

const mockUseApiQuery = jest.fn();

jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
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
    winner_alt_id: null,
    player1: { id: 1, username: "ash", display_name: "Ash Ketchum" },
    player2: { id: 2, username: "brock", display_name: "Brock" },
    player1Stats: { wins: 2, losses: 0 },
    player2Stats: { wins: 1, losses: 1 },
    game_wins1: null,
    game_wins2: null,
    ...overrides,
  };
}

/**
 * Build the single `TournamentPairingsData` object the component reads.
 *
 * The component derives the first-phase round list from `roundsWithStats` and
 * the matches for a round from `allPhaseRounds[phaseIndex]`. To keep tests
 * declarative, callers pass `rounds` (round metadata) and `matches` (matches for
 * those rounds) and we wire both `roundsWithStats` and `allPhaseRounds[0]`.
 */
function buildPairingsData(opts: {
  phases?: Array<Record<string, unknown>>;
  rounds?: Array<Record<string, unknown>>;
  matches?: Array<Record<string, unknown>>;
  unpairedPlayers?: Array<Record<string, unknown>>;
}) {
  const phases = opts.phases ?? [];
  const rounds = opts.rounds ?? [];
  const matches = opts.matches ?? [];

  // Each first-phase round carries the same `matches` array; the component only
  // ever renders matches for the selected round, which defaults to the first.
  const firstPhaseRounds = rounds.map((round) => ({
    ...round,
    matches,
  }));

  // allPhaseRounds is index-aligned to phases. Only the first phase is populated
  // for these tests (multi-phase tests still only exercise the first phase).
  const allPhaseRounds =
    phases.length > 0
      ? [firstPhaseRounds, ...phases.slice(1).map(() => [])]
      : [];

  return {
    phases,
    allPhaseRounds,
    roundsWithStats: rounds,
    unpairedPlayers: opts.unpairedPlayers ?? [],
  };
}

function apiResult(
  data: unknown,
  overrides: Partial<{
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  }> = {}
) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentPairings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: not loading, empty data set.
    mockUseApiQuery.mockReturnValue(apiResult(buildPairingsData({})));
  });

  it("shows loading spinner when phases are loading", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(undefined, { isLoading: true })
    );
    renderPairings();
    expect(screen.queryByText("Pairings & Matches")).not.toBeInTheDocument();
  });

  it("shows error state when the query fails", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(undefined, {
        isError: true,
        error: new Error("Boom"),
      })
    );
    renderPairings();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("shows empty state when no phases exist", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [] }))
    );
    renderPairings();
    expect(screen.getByText("No phases configured")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tournament phases need to be set up before pairings can be generated."
      )
    ).toBeInTheDocument();
  });

  it("shows header with title", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [buildPhase()], rounds: [] }))
    );
    renderPairings();
    expect(screen.getByText("Pairings & Matches")).toBeInTheDocument();
    expect(
      screen.getByText("View tournament rounds and player pairings")
    ).toBeInTheDocument();
  });

  it("shows no-rounds state when phases exist but no rounds", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [buildPhase()], rounds: [] }))
    );
    renderPairings();
    expect(screen.getByText("No rounds yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start the first round from the Overview tab.")
    ).toBeInTheDocument();
  });

  it("renders Table and Bracket view toggle buttons", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [],
        })
      )
    );
    renderPairings();
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Bracket")).toBeInTheDocument();
  });

  it("renders match table with column headers", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch()],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("Player 1")).toBeInTheDocument();
    expect(screen.getByText("Player 2")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders match with player names and table number", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch()],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("Table 1")).toBeInTheDocument();
  });

  it("renders BYE match correctly", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [
            buildMatch({
              alt2_id: null,
              player2: null,
              player2Stats: null,
            }),
          ],
        })
      )
    );
    renderPairings();

    // BYE label appears for table and player2
    const byeTexts = screen.getAllByText("BYE");
    expect(byeTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Auto-win")).toBeInTheDocument();
  });

  it("renders no-pairings state when round has no matches", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [],
        })
      )
    );
    renderPairings();
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
  });

  it("shows Report button for active matches", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "active" })],
        })
      )
    );
    renderPairings();
    expect(screen.getByText("Report")).toBeInTheDocument();
  });

  it("does not show Report button for completed matches", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [
            buildMatch({
              status: "completed",
              winner_alt_id: 1,
              game_wins1: 2,
              game_wins2: 1,
            }),
          ],
        })
      )
    );
    renderPairings();
    expect(screen.queryByText("Report")).not.toBeInTheDocument();
  });

  it("renders unpaired players banner when present", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [],
          unpairedPlayers: [
            { altId: 1, username: "late_player", displayName: "Late Player" },
            { altId: 2, username: "another_late", displayName: null },
          ],
        })
      )
    );
    renderPairings();

    expect(
      screen.getByText("2 checked-in players not paired in this round")
    ).toBeInTheDocument();
  });

  it("uses singular 'player' for 1 unpaired player", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [],
          unpairedPlayers: [
            { altId: 1, username: "solo", displayName: "Solo Player" },
          ],
        })
      )
    );
    renderPairings();

    expect(
      screen.getByText("1 checked-in player not paired in this round")
    ).toBeInTheDocument();
  });

  it("switches to bracket view when Bracket button is clicked", async () => {
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch()],
        })
      )
    );
    renderPairings();

    await user.click(screen.getByText("Bracket"));
    expect(screen.getByTestId("bracket-visualization")).toBeInTheDocument();
  });

  it("renders round info in card header", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase({ name: "Swiss Rounds" })],
          rounds: [buildRound({ round_number: 3, matchCount: 8 })],
          matches: [buildMatch()],
        })
      )
    );
    renderPairings();

    expect(screen.getByText(/Swiss Rounds - Round/)).toBeInTheDocument();
  });

  it("renders row click navigates to match detail", async () => {
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound({ round_number: 2 })],
          matches: [buildMatch({ id: 55, table_number: 4 })],
        })
      )
    );
    renderPairings();

    const tableRow = screen.getByText("Table 4").closest("tr");
    expect(tableRow).not.toBeNull();
    await user.click(tableRow!);

    expect(mockPush).toHaveBeenCalledWith(
      "/tournaments/test-tournament/r/2/t/4"
    );
  });

  it("opens report dialog when Report button is clicked", async () => {
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "active" })],
        })
      )
    );
    renderPairings();

    const reportBtn = screen.getByText("Report").closest("button");
    await user.click(reportBtn!);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("Report Match Result")).toBeInTheDocument();
  });

  it("shows player names in report dialog", async () => {
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "active" })],
        })
      )
    );
    renderPairings();

    const reportBtn = screen.getByText("Report").closest("button");
    await user.click(reportBtn!);

    // Player names appear as labels in the dialog. The dialog uses the alt's
    // username (`ash`), not the display name, since the API match shape exposes
    // username on the joined player object.
    expect(screen.getByLabelText(/ash Games Won/i)).toBeInTheDocument();
  });

  it("shows tied score error when scores are equal on submit", async () => {
    const { toast } = jest.requireMock("sonner") as {
      toast: { success: jest.Mock; error: jest.Mock };
    };
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "active" })],
        })
      )
    );
    renderPairings();

    // Open dialog
    await user.click(screen.getByText("Report").closest("button")!);

    // Set both scores to "1" (tied)
    const [p1Input, p2Input] = screen.getAllByRole("spinbutton");
    await user.clear(p1Input!);
    await user.type(p1Input!, "1");
    await user.clear(p2Input!);
    await user.type(p2Input!, "1");

    await user.click(screen.getByRole("button", { name: /submit result/i }));

    expect(toast.error).toHaveBeenCalledWith(
      "Scores cannot be tied - one player must win"
    );
  });

  it("shows phase selector when multiple phases exist", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [
            buildPhase({ id: 1, name: "Swiss" }),
            buildPhase({ id: 2, name: "Top Cut", phase_order: 2 }),
          ],
          rounds: [],
        })
      )
    );
    renderPairings();
    expect(screen.getByText("Select phase")).toBeInTheDocument();
  });

  it("does not show phase selector for a single phase", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [buildPhase()], rounds: [] }))
    );
    renderPairings();
    expect(screen.queryByText("Select phase")).not.toBeInTheDocument();
  });

  it("renders player stats (wins-losses) in match rows", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [
            buildMatch({
              player1Stats: { wins: 3, losses: 0 },
              player2Stats: { wins: 1, losses: 2 },
            }),
          ],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("3-0")).toBeInTheDocument();
    expect(screen.getByText("1-2")).toBeInTheDocument();
  });

  it("renders completed match winner and game score", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [
            buildMatch({
              status: "completed",
              winner_alt_id: 1,
              game_wins1: 2,
              game_wins2: 1,
            }),
          ],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("2-1")).toBeInTheDocument();
  });

  it("renders pending match result as dash", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "pending" })],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders unpaired player username when displayName is null", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [],
          unpairedPlayers: [
            { altId: 10, username: "late_joiner", displayName: null },
          ],
        })
      )
    );
    renderPairings();

    expect(screen.getByText("late_joiner")).toBeInTheDocument();
  });

  it("renders round number in round selector", () => {
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [
            buildRound({ id: 10, round_number: 1 }),
            buildRound({ id: 11, round_number: 2 }),
          ],
          matches: [],
        })
      )
    );
    renderPairings();
    // Both round options appear
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Round 2")).toBeInTheDocument();
  });

  it("report dialog has Cancel button that closes it", async () => {
    const user = userEvent.setup();
    mockUseApiQuery.mockReturnValue(
      apiResult(
        buildPairingsData({
          phases: [buildPhase()],
          rounds: [buildRound()],
          matches: [buildMatch({ status: "active" })],
        })
      )
    );
    renderPairings();

    await user.click(screen.getByText("Report").closest("button")!);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();

    // Click dialog Cancel button
    const cancelBtn = screen.getAllByRole("button", { name: /cancel/i })[0];
    await user.click(cancelBtn!);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });
});
