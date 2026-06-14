import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Tournament read — getTournamentBySlug from @trainers/supabase
const mockGetTournamentBySlug = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getTournamentBySlug: (...args: unknown[]) =>
    mockGetTournamentBySlug(...args),
}));

// createClient — browser Supabase client used by useQuery queryFn
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
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
// Helpers
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

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
 * - mockGetTournamentBySlug returns the tournament (via useQuery queryFn)
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

  mockGetTournamentBySlug.mockResolvedValue(tournament);
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

  it("renders the TournamentSettings UI when user is owner and data is loaded", async () => {
    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId("tournament-settings")).toBeInTheDocument();
    });
    expect(screen.getByText(/Settings for Test Tournament/)).toBeInTheDocument();
  });

  it("renders empty DOM and does not push to /sign-in when currentUser is null", async () => {
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
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders an error card when useCurrentUser surfaces an error", async () => {
    mockUseCurrentUser.mockReturnValue({
      user: undefined,
      isLoading: false,
      error: new Error("PostgrestError: rls denied"),
    });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(
        screen.getByText(/couldn['']t load your account/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows the Access Denied card when user is not the owner", async () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: "different-user" },
      isLoading: false,
    });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="test-tournament"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });
  });

  it("shows 'Tournament not found' when the tournament query returns null", async () => {
    setupQueries({ organization: mockOrganization, tournament: null });

    render(
      <TournamentSettingsPageClient
        communitySlug="test-org"
        tournamentSlug="missing-tournament"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/tournament not found/i)).toBeInTheDocument();
    });
  });

  // ── Tournament read — useQuery wiring ──────────────────────────────────────

  describe("tournament read — useQuery wiring", () => {
    it("calls getTournamentBySlug with the correct slug", async () => {
      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockGetTournamentBySlug).toHaveBeenCalledWith(
          expect.anything(),
          "test-tournament"
        );
      });
    });

    it("shows loading spinner while tournament is fetching", () => {
      // Keep it in loading state by never resolving
      mockGetTournamentBySlug.mockReturnValue(new Promise(() => {}));

      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      // Spinner rendered while any of the three loading flags are true
      expect(
        document.querySelector(".animate-spin")
      ).toBeInTheDocument();
    });
  });

  // ── Community read — useApiQuery wiring ────────────────────────────────────

  describe("community read — useApiQuery wiring", () => {
    it("queries /api/v1/communities/[slug] via useApiQuery with staleTime:30s", async () => {
      render(
        <TournamentSettingsPageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      const call = mockUseApiQuery.mock.calls.find(
        ([queryKey]: [string[]]) =>
          Array.isArray(queryKey) && queryKey[0] === "community"
      );
      expect(call).toBeDefined();
      const [queryKey, , options] = call as [
        string[],
        unknown,
        { staleTime: number },
      ];
      expect(queryKey).toEqual(["community", "test-org"]);
      expect(options).toMatchObject({ staleTime: 30_000 });
    });

    it("shows 'Couldn't load community' card when useApiQuery isError is true", async () => {
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
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(
          screen.getByText(/couldn['']t load community/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("shows 'Organization not found' card when useApiQuery data is null", async () => {
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
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/organization not found/i)).toBeInTheDocument();
      });
    });
  });
});
