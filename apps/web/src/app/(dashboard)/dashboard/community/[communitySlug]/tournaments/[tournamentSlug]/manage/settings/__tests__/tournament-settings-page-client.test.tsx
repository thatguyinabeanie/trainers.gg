import { render, screen } from "@testing-library/react";
import { TournamentSettingsPageClient } from "../tournament-settings-page-client";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: jest.fn(),
  }),
}));

const mockUseCurrentUser = jest.fn();
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (queryFn: unknown, deps: unknown[]) =>
    mockUseSupabaseQuery(queryFn, deps),
}));

// Avoid pulling in the full TournamentSettings tree.
jest.mock("@/components/tournaments", () => ({
  TournamentSettings: ({
    tournament,
  }: {
    tournament: { id: number; name: string };
  }) => (
    <div data-testid="tournament-settings">
      Settings for {tournament.name}
    </div>
  ),
}));

// =============================================================================
// Fixtures
// =============================================================================

const mockUser = { id: "user-1" };
const mockOrganization = {
  id: 1,
  slug: "test-org",
  name: "Test Org",
  owner_user_id: "user-1",
};
const mockTournament = {
  id: 1,
  slug: "test-tournament",
  name: "Test Tournament",
  status: "draft",
  game: "sv",
  game_format: "reg-i",
  platform: "cartridge",
  battle_format: "doubles",
  max_participants: 32,
  start_date: null,
  end_date: null,
  registration_type: "open",
  check_in_required: false,
  allow_late_registration: false,
  late_check_in_max_round: null,
  phases: [],
};

function setupQueries({
  organization,
  tournament,
}: {
  organization: typeof mockOrganization | null;
  tournament: typeof mockTournament | null;
}) {
  mockUseSupabaseQuery.mockImplementation(
    (_fn: unknown, deps: readonly unknown[]) => {
      // First call: organization (deps = [communitySlug])
      // Second call: tournament (deps = [tournamentSlug])
      const [dep] = deps;
      if (dep === "test-org") {
        return { data: organization, isLoading: false };
      }
      return { data: tournament, isLoading: false };
    }
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("TournamentSettingsPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    setupQueries({
      organization: mockOrganization,
      tournament: mockTournament,
    });
  });

  it("renders the TournamentSettings UI when user is owner and data is loaded", () => {
    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />
    );

    expect(screen.getByTestId("tournament-settings")).toBeInTheDocument();
    expect(screen.getByText(/Settings for Test Tournament/)).toBeInTheDocument();
  });

  it("renders empty DOM and does not push to /sign-in when currentUser is null", () => {
    // Auth is enforced server-side by the (dashboard) layout. Pushing
    // here used to race with loading state and bounce real users to
    // /dashboard via proxy.ts.
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { container } = render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders an error card when useCurrentUser surfaces an error", () => {
    mockUseCurrentUser.mockReturnValue({
      user: undefined,
      isLoading: false,
      error: new Error("PostgrestError: rls denied"),
    });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />
    );

    expect(
      screen.getByText(/couldn['’]t load your account/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows the Access Denied card when user is not the owner", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: "different-user" },
      isLoading: false,
    });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it("shows 'Tournament not found' when the tournament query returns null", () => {
    setupQueries({ organization: mockOrganization, tournament: null });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="missing-tournament"
      />
    );

    expect(screen.getByText(/tournament not found/i)).toBeInTheDocument();
  });
});
