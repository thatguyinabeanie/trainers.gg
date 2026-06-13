import { render, screen } from "@testing-library/react";

// --- next/navigation ---
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- useCurrentUser (API-backed) ---
const mockUseCurrentUser = jest.fn();
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

// --- @/lib/tournament-utils ---
jest.mock("@/lib/tournament-utils", () => ({
  transformPhaseData: jest.fn((phase, rounds) => ({
    id: String(phase.id),
    name: phase.name,
    format: phase.phase_type ?? "swiss",
    status: phase.status ?? "pending",
    rounds: rounds.map((r: { round_number: number; matches: unknown[] }) => ({
      roundNumber: r.round_number,
      matches: r.matches,
    })),
  })),
}));

// --- BracketVisualization — capture the interactivity callbacks ---
let capturedOnMatchClick: ((id: string) => void) | null = null;
let capturedCanClickMatch: ((match: unknown) => boolean) | null = null;
jest.mock("@/components/tournament/bracket-visualization", () => ({
  BracketVisualization: ({
    phases,
    onMatchClick,
    canClickMatch,
  }: {
    phases: unknown[];
    onMatchClick: (id: string) => void;
    canClickMatch: (match: unknown) => boolean;
  }) => {
    capturedOnMatchClick = onMatchClick;
    capturedCanClickMatch = canClickMatch;
    return <div data-testid="bracket-viz" data-phase-count={phases.length} />;
  },
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Trophy: () => <svg data-testid="icon-trophy" />,
  AlertCircle: () => <svg data-testid="icon-alert" />,
}));

import { PublicPairingsView } from "../public-pairings-view";
import { type TournamentPairingsData } from "@/lib/data/tournament-pairings-endpoint";

// =============================================================================
// Helpers
// =============================================================================

type TestPhase = {
  id: number;
  name: string;
  phase_order: number;
  phase_type: string;
  status: string;
};

function makePhase(overrides: Partial<TestPhase> = {}): TestPhase {
  return {
    id: 1,
    name: "Swiss",
    phase_order: 1,
    phase_type: "swiss",
    status: "active",
    ...overrides,
  };
}

function makeMatch(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 10,
    table_number: 3,
    participant1: { id: "100", name: "Ash" },
    participant2: { id: "200", name: "Brock" },
    ...overrides,
  };
}

function makeRound(
  matches: Array<Record<string, unknown>> = [makeMatch()]
): Record<string, unknown> {
  return { id: 1, round_number: 4, status: "active", matches };
}

function makeData(
  overrides: Partial<TournamentPairingsData> = {}
): TournamentPairingsData {
  return {
    phases: [],
    allPhaseRounds: [],
    roundsWithStats: [],
    unpairedPlayers: [],
    ...overrides,
  } as TournamentPairingsData;
}

const defaultProps = {
  tournamentSlug: "kanto-cup",
};

// =============================================================================
// Tests
// =============================================================================

describe("PublicPairingsView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnMatchClick = null;
    capturedCanClickMatch = null;
    // Default: logged-out viewer (no alt).
    mockUseCurrentUser.mockReturnValue({ alt: null });
  });

  // ---------------------------------------------------------------------------
  // Empty states
  // ---------------------------------------------------------------------------

  it("shows 'No pairings yet' when there are no phases", () => {
    render(<PublicPairingsView {...defaultProps} data={makeData()} />);
    expect(screen.getByText("No pairings yet")).toBeInTheDocument();
    expect(
      screen.getByText("Pairings will appear once the tournament begins.")
    ).toBeInTheDocument();
  });

  it("shows 'No pairings yet' (rounds variant) when phases exist but have no rounds", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({ phases: [makePhase()], allPhaseRounds: [[]] })}
      />
    );
    expect(
      screen.getByText("Pairings will appear once rounds are generated.")
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Bracket rendering
  // ---------------------------------------------------------------------------

  it("renders BracketVisualization when phases and rounds exist", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    expect(screen.getByTestId("bracket-viz")).toBeInTheDocument();
    expect(screen.getByTestId("bracket-viz")).toHaveAttribute(
      "data-phase-count",
      "1"
    );
  });

  // ---------------------------------------------------------------------------
  // Unpaired players banner
  // ---------------------------------------------------------------------------

  it("renders the unpaired-players banner with names", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
          unpairedPlayers: [
            { altId: 1, displayName: "Ash", username: "ash_ketchum" },
            { altId: 2, displayName: null, username: "brock" },
          ] as TournamentPairingsData["unpairedPlayers"],
        })}
      />
    );
    expect(screen.getByText(/late arrivals/i)).toBeInTheDocument();
    expect(screen.getByText("Ash")).toBeInTheDocument();
    expect(screen.getByText("brock")).toBeInTheDocument();
  });

  it("uses singular 'arrival' for exactly one unpaired player", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
          unpairedPlayers: [
            { altId: 1, displayName: "Ash", username: "ash_ketchum" },
          ] as TournamentPairingsData["unpairedPlayers"],
        })}
      />
    );
    expect(
      screen.getByText(/1 late arrival — not paired/i)
    ).toBeInTheDocument();
  });

  it("does not render the banner when there are no unpaired players", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
          unpairedPlayers: [],
        })}
      />
    );
    expect(screen.queryByTestId("icon-alert")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Match-click navigation
  // ---------------------------------------------------------------------------

  it("navigates to the match detail route when a match is clicked", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    capturedOnMatchClick?.("10");
    expect(mockRouterPush).toHaveBeenCalledWith(
      "/tournaments/kanto-cup/r/4/t/3"
    );
  });

  it("does not navigate for an unknown match id", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    capturedOnMatchClick?.("999");
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Match-access control (canClickMatch)
  // ---------------------------------------------------------------------------

  it("allows clicking any match when canManage is true", () => {
    render(
      <PublicPairingsView
        {...defaultProps}
        canManage
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    expect(capturedCanClickMatch?.(makeMatch())).toBe(true);
  });

  it("blocks clicking when the viewer is logged out (no alt)", () => {
    mockUseCurrentUser.mockReturnValue({ alt: null });
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    expect(capturedCanClickMatch?.(makeMatch())).toBe(false);
  });

  it("allows clicking the viewer's own match (alt is a participant)", () => {
    mockUseCurrentUser.mockReturnValue({ alt: { id: 100 } });
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    expect(capturedCanClickMatch?.(makeMatch())).toBe(true);
  });

  it("blocks clicking a match the viewer is not part of", () => {
    mockUseCurrentUser.mockReturnValue({ alt: { id: 999 } });
    render(
      <PublicPairingsView
        {...defaultProps}
        data={makeData({
          phases: [makePhase()],
          allPhaseRounds: [[makeRound()]],
        })}
      />
    );
    expect(capturedCanClickMatch?.(makeMatch())).toBe(false);
  });
});
