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

// useApiQuery — community read (migrated off useSupabaseQuery in T3p)
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// useSupabaseQuery — tournament read (tournament-context; migrated in a later wave)
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

/**
 * Set up mocks for a render:
 * - useApiQuery returns the community (for /api/v1/communities/[slug])
 * - useSupabaseQuery returns the tournament (still on S-bucket read)
 */
function setupQueries({
  organization,
  tournament,
}: {
  organization: typeof mockOrganization | null;
  tournament: typeof mockTournament | null;
}) {
  mockUseApiQuery.mockReturnValue({
    data: organization,
    isLoading: false,
    isError: false,
    error: null,
  });

  // Tournament read — still via useSupabaseQuery
  mockUseSupabaseQuery.mockReturnValue({
    data: tournament,
    isLoading: false,
  });
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
      screen.getByText(/couldn['']t load your account/i)
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

  // ── Community read — useApiQuery wiring ────────────────────────────────────

  describe("community read — useApiQuery wiring", () => {
    it("queries /api/v1/communities/[slug] via useApiQuery with staleTime:30s", () => {
      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      const call = mockUseApiQuery.mock.calls.find(
        ([queryKey]: [string[]]) =>
          Array.isArray(queryKey) && queryKey[0] === "community"
      );
      expect(call).toBeDefined();
      const [queryKey, , options] = call as [string[], unknown, { staleTime: number }];
      expect(queryKey).toEqual(["community", "test-org"]);
      expect(options).toMatchObject({ staleTime: 30_000 });
    });

    it("shows 'Couldn't load community' card when useApiQuery isError is true", () => {
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("HTTP 503"),
      });

      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      expect(
        screen.getByText(/couldn['']t load community/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("shows 'Organization not found' card when useApiQuery data is null", () => {
      mockUseApiQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />
      );

      expect(screen.getByText(/organization not found/i)).toBeInTheDocument();
    });
  });
});
