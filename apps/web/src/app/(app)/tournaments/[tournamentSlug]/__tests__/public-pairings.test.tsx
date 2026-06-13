import { render, screen } from "@testing-library/react";

// --- cached server fetcher (revoke-set reads happen here, service-role) ---
const mockGetCachedTournamentPairings = jest.fn();
jest.mock("@/lib/data/tournament-pairings-endpoint", () => ({
  getCachedTournamentPairings: (...args: unknown[]) =>
    mockGetCachedTournamentPairings(...args),
}));

// --- presentational child — stub so we only assert the server wrapper wiring ---
jest.mock("../public-pairings-view", () => ({
  PublicPairingsView: ({
    tournamentSlug,
    canManage,
    data,
  }: {
    tournamentSlug: string;
    canManage?: boolean;
    data: { phases: unknown[] };
  }) => (
    <div
      data-testid="pairings-view"
      data-slug={tournamentSlug}
      data-can-manage={String(canManage)}
      data-phase-count={data.phases.length}
    />
  ),
}));

import { PublicPairings } from "../public-pairings";

describe("PublicPairings (server component)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches pairings via the cached service-role fetcher and passes data to the view", async () => {
    const data = {
      phases: [{ id: 1 }, { id: 2 }],
      allPhaseRounds: [[], []],
      roundsWithStats: [],
      unpairedPlayers: [],
    };
    mockGetCachedTournamentPairings.mockResolvedValue(data);

    // Server components return a promise of JSX — await before rendering.
    const ui = await PublicPairings({
      tournamentId: 42,
      tournamentSlug: "kanto-cup",
      canManage: true,
    });
    render(ui);

    expect(mockGetCachedTournamentPairings).toHaveBeenCalledWith(42);

    const view = screen.getByTestId("pairings-view");
    expect(view).toHaveAttribute("data-slug", "kanto-cup");
    expect(view).toHaveAttribute("data-can-manage", "true");
    expect(view).toHaveAttribute("data-phase-count", "2");
  });

  it("defaults canManage to false when not provided", async () => {
    mockGetCachedTournamentPairings.mockResolvedValue({
      phases: [],
      allPhaseRounds: [],
      roundsWithStats: [],
      unpairedPlayers: [],
    });

    const ui = await PublicPairings({
      tournamentId: 7,
      tournamentSlug: "johto-open",
    });
    render(ui);

    expect(screen.getByTestId("pairings-view")).toHaveAttribute(
      "data-can-manage",
      "false"
    );
  });
});
