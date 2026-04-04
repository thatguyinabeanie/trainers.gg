import { render, screen } from "@testing-library/react";

// --- next/navigation ---
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- @/lib/supabase ---
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  getTournamentPhases: jest.fn(),
  getPhaseRoundsWithMatches: jest.fn(),
  getPhaseRoundsWithStats: jest.fn(),
  getUnpairedCheckedInPlayers: jest.fn(),
  getCurrentUserAlts: jest.fn(),
}));

// --- @/lib/tournament-utils ---
jest.mock("@/lib/tournament-utils", () => ({
  transformPhaseData: jest.fn((phase, rounds) => ({
    ...phase,
    rounds: rounds.map((r: { round_number: number; matches: unknown[] }) => ({
      roundNumber: r.round_number,
      matches: r.matches,
    })),
  })),
}));

// --- BracketVisualization ---
jest.mock("@/components/tournament/bracket-visualization", () => ({
  BracketVisualization: ({
    phases,
  }: {
    phases: unknown[];
    onMatchClick: (id: string) => void;
    canClickMatch: (match: unknown) => boolean;
  }) => <div data-testid="bracket-viz" data-phase-count={phases.length} />,
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  Trophy: () => <svg data-testid="icon-trophy" />,
  AlertCircle: () => <svg data-testid="icon-alert" />,
}));

import React from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { PublicPairings } from "../public-pairings";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;

// =============================================================================
// Helpers
// =============================================================================

type Phase = { id: number; name: string; format: string };
type Round = { id: number; round_number: number; matches: unknown[] };

function makePhase(overrides: Partial<Phase> = {}): Phase {
  return { id: 1, name: "Swiss", format: "swiss", ...overrides };
}

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 1,
    round_number: 1,
    matches: [{ id: 1, table_number: 1 }],
    ...overrides,
  };
}

// All queries use the same hook call, so we need to queue responses
function setupAllQueries({
  phases = null as Phase[] | null,
  phasesLoading = false,
  allPhaseRounds = null as Round[][] | null,
  roundsLoading = false,
  roundsWithStats = null as Array<{ id: number; status: string }> | null,
  unpairedPlayers = null as Array<{
    altId: number;
    displayName: string | null;
    username: string;
  }> | null,
  userAlts = null as Array<{ id: number }> | null,
} = {}) {
  mockUseSupabaseQuery
    // phases query
    .mockReturnValueOnce({
      data: phases,
      isLoading: phasesLoading,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // allPhaseRounds query
    .mockReturnValueOnce({
      data: allPhaseRounds,
      isLoading: roundsLoading,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // roundsWithStats query
    .mockReturnValueOnce({
      data: roundsWithStats,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // unpairedPlayers query
    .mockReturnValueOnce({
      data: unpairedPlayers,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>)
    // userAlts query
    .mockReturnValueOnce({
      data: userAlts,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSupabaseQuery>);
}

const defaultProps = {
  tournamentId: 1,
  tournamentSlug: "kanto-cup",
};

// =============================================================================
// Tests
// =============================================================================

describe("PublicPairings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Loading phases
  // ---------------------------------------------------------------------------

  it("shows loading spinner while phases are loading", () => {
    setupAllQueries({ phases: null, phasesLoading: true });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // No phases
  // ---------------------------------------------------------------------------

  it("shows 'No pairings yet' when phases is null", () => {
    setupAllQueries({ phases: null, phasesLoading: false });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
  });

  it("shows 'No pairings yet' when phases is empty array", () => {
    setupAllQueries({ phases: [] });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
  });

  it("shows Tournament begins message for empty phases", () => {
    setupAllQueries({ phases: [], phasesLoading: false });
    render(<PublicPairings {...defaultProps} />);
    expect(
      screen.getByText("Pairings will appear once the tournament begins.")
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Loading rounds after phases load
  // ---------------------------------------------------------------------------

  it("shows spinner while rounds are loading", () => {
    setupAllQueries({
      phases: [makePhase()],
      phasesLoading: false,
      allPhaseRounds: null,
      roundsLoading: true,
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // No rounds yet
  // ---------------------------------------------------------------------------

  it("shows 'No pairings yet' when phases exist but no rounds", () => {
    setupAllQueries({
      phases: [makePhase()],
      allPhaseRounds: [[]], // phase has no rounds
      roundsWithStats: [],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
  });

  it("shows rounds generated message for no rounds", () => {
    setupAllQueries({
      phases: [makePhase()],
      allPhaseRounds: [[]],
      roundsWithStats: [],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(
      screen.getByText("Pairings will appear once rounds are generated.")
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Has rounds and matches
  // ---------------------------------------------------------------------------

  it("renders BracketVisualization when phases and rounds exist", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "active" }],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByTestId("bracket-viz")).toBeInTheDocument();
  });

  it("renders correct phase count in BracketVisualization", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "completed" }],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByTestId("bracket-viz")).toHaveAttribute(
      "data-phase-count",
      "1"
    );
  });

  // ---------------------------------------------------------------------------
  // Unpaired players banner
  // ---------------------------------------------------------------------------

  it("renders unpaired players banner when unpairedPlayers is non-empty", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "active" }],
      unpairedPlayers: [
        { altId: 1, displayName: "Ash", username: "ash_ketchum" },
        { altId: 2, displayName: null, username: "brock" },
      ],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.getByText(/late arrivals/i)).toBeInTheDocument();
    expect(screen.getByText("Ash")).toBeInTheDocument();
    expect(screen.getByText("brock")).toBeInTheDocument();
  });

  it("shows singular 'arrival' for exactly 1 unpaired player", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "active" }],
      unpairedPlayers: [
        { altId: 1, displayName: "Ash", username: "ash_ketchum" },
      ],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(
      screen.getByText(/1 late arrival — not paired/i)
    ).toBeInTheDocument();
  });

  it("does not render unpaired banner when unpairedPlayers is empty", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "active" }],
      unpairedPlayers: [],
    });
    render(<PublicPairings {...defaultProps} />);
    expect(screen.queryByTestId("icon-alert")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // canManage prop
  // ---------------------------------------------------------------------------

  it("renders without crashing when canManage=true", () => {
    const phase = makePhase();
    const round = makeRound();
    setupAllQueries({
      phases: [phase],
      allPhaseRounds: [[round]],
      roundsWithStats: [{ id: round.id, status: "active" }],
    });
    render(<PublicPairings {...defaultProps} canManage={true} />);
    expect(screen.getByTestId("bracket-viz")).toBeInTheDocument();
  });
});
