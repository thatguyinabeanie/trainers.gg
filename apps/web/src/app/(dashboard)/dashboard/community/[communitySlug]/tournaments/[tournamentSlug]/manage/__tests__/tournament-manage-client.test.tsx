import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { TournamentManageClient } from "../tournament-manage-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// getTournamentBySlug + getTournamentPhases — called inside useQuery queryFns
const mockGetTournamentBySlug = jest.fn();
const mockGetTournamentPhases = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getTournamentBySlug: (...args: unknown[]) =>
    mockGetTournamentBySlug(...args),
  getTournamentPhases: (...args: unknown[]) =>
    mockGetTournamentPhases(...args),
}));

// createClient — called inside queryFn closures; mock it away
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
  supabase: {},
}));

// useApiQuery — used for community read via /api/v1/communities/[slug]
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// useCurrentUser — API-backed; hook itself is tested separately
jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

// Child components
jest.mock("@/components/tournaments", () => ({
  TournamentOverview: () => <div data-testid="overview-tab">Overview</div>,
  TournamentRegistrations: () => (
    <div data-testid="players-tab">Players</div>
  ),
  TournamentStandings: () => (
    <div data-testid="standings-content">Standings</div>
  ),
  TournamentAuditLog: () => (
    <div data-testid="audit-content">Audit Log</div>
  ),
}));

jest.mock(
  "@/components/tournaments/manage/tournament-pairings-judge",
  () => ({
    TournamentPairingsJudge: () => (
      <div data-testid="pairings-content">Pairings</div>
    ),
  })
);

// Server actions (next/cache not available in Jest)
jest.mock("@/actions/tournaments", () => ({
  publishTournament: jest
    .fn()
    .mockResolvedValue({ success: true, data: { success: true } }),
}));

// Sheet components
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

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

const mockOrganization = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  owner_user_id: "user-1",
};

const mockTournament = {
  id: 1,
  name: "Test Tournament",
  slug: "test-tournament",
  status: "draft",
  current_phase_id: null,
  registrations: [
    { status: "registered" },
    { status: "checked_in" },
    { status: "dropped" },
  ],
  max_participants: null,
  start_date: null,
  end_date: null,
  tournament_format: "swiss_with_cut",
  format: "VGC 2025",
  current_round: null,
  round_time_minutes: 50,
  swiss_rounds: null,
  top_cut_size: null,
  rental_team_photos_enabled: false,
  rental_team_photos_required: false,
  description: null,
  registration_type: "open",
  check_in_required: false,
  allow_late_registration: false,
  late_check_in_max_round: null,
};

const mockPhases: Array<{ id: number; name: string; tournament_id: bigint }> =
  [];

const mockUser = { id: "user-1", email: "test@example.com" };

/**
 * Set up mocks for a successful render:
 * - useApiQuery returns the community (for /api/v1/communities/[slug] fetch)
 * - mockGetTournamentBySlug + mockGetTournamentPhases return tournament data
 *   (used inside useQuery queryFns — migrated off useSupabaseQuery)
 */
function setupQueryMocks() {
  // Community read — useApiQuery (migrated off useSupabaseQuery in T3p)
  mockUseApiQuery.mockReturnValue({
    data: mockOrganization,
    isLoading: false,
    isError: false,
    error: null,
  });

  // Tournament reads — useQuery with @trainers/supabase fns (tournament-context)
  mockGetTournamentBySlug.mockResolvedValue(mockTournament);
  mockGetTournamentPhases.mockResolvedValue(mockPhases);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentManageClient - Consolidated 3-Tab Layout", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
  });

  describe("Tab Navigation", () => {
    it("should show overview tab by default when no tab parameter is provided", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });

    it("should show the correct tab when tab parameter is in URL", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=live")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("pairings-content")).toBeVisible();
        expect(screen.getByTestId("standings-content")).toBeVisible();
      });
    });

    it("should update URL when switching tabs", async () => {
      const user = userEvent.setup();

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on the Players tab
      const playersTab = screen.getByRole("tab", {
        name: /players/i,
      });
      await user.click(playersTab);

      // Check that router.replace was called with the correct URL
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("tab=players"),
        { scroll: false }
      );
    });

    it.each([
      { param: "overview", testId: "overview-tab" },
      { param: "players", testId: "players-tab" },
      { param: "live", testId: "pairings-content" },
    ])(
      "should render $param tab content when tab=$param",
      async ({ param, testId }) => {
        jest.clearAllMocks();

        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${param}`)
        );
        (useCurrentUser as jest.Mock).mockReturnValue({
          user: mockUser,
          isLoading: false,
        });
        setupQueryMocks();

        const { unmount } = render(
          <TournamentManageClient
            communitySlug="test-org"
            tournamentSlug="test-tournament"
          />,
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeVisible();
        });

        unmount();
      }
    );

    it("should fall back to overview tab for invalid tab parameter", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=invalid")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });
  });

  describe("Header Actions", () => {
    it("should render Settings link in header", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // Settings is a link button in the header
        const settingsLink = screen.getByRole("link", {
          name: /settings/i,
        });
        expect(settingsLink).toBeVisible();
        expect(settingsLink).toHaveAttribute(
          "href",
          "/dashboard/community/test-org/tournaments/test-tournament/manage/settings"
        );
      });
    });

    it("should open audit log sheet when Audit Log button is clicked", async () => {
      const user = userEvent.setup();
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click the Audit Log button
      const auditButton = screen.getByRole("button", {
        name: /audit log/i,
      });
      await user.click(auditButton);

      // Sheet should be open with audit content
      await waitFor(() => {
        expect(screen.getByTestId("sheet")).toBeVisible();
        expect(screen.getByTestId("audit-content")).toBeVisible();
      });
    });
  });

  describe("Live Tab", () => {
    it("should render both pairings and standings in the live tab", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=live")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("pairings-content")).toBeVisible();
        expect(screen.getByTestId("standings-content")).toBeVisible();
      });
    });
  });

  describe("Players Tab Badge", () => {
    it("should display player count badge on the Players tab", async () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // mockTournament has 2 active registrations (registered + checked_in)
        // and 1 dropped, so badge should show "2"
        const playersTab = screen.getByRole("tab", { name: /players/i });
        expect(playersTab).toHaveTextContent("2");
      });
    });
  });

  describe("Browser Navigation", () => {
    it("should preserve tab state when navigating with browser back/forward", async () => {
      const user = userEvent.setup();

      setupQueryMocks();

      const { unmount } = render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });

      // Click on Live tab
      const liveTab = screen.getByRole("tab", { name: /live/i });
      await user.click(liveTab);

      // Simulate browser back by changing the search params and remounting
      unmount();
      jest.clearAllMocks();

      (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams(""));
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByTestId("overview-tab")).toBeVisible();
      });
    });
  });

  describe("Deep Link Sharing", () => {
    it("should allow sharing direct links to specific tabs", async () => {
      // Simulate user opening a shared link with tab parameter
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("tab=players")
      );

      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      // Players tab should be immediately visible
      await waitFor(() => {
        expect(screen.getByTestId("players-tab")).toBeVisible();
      });
    });
  });

  describe("auth state", () => {
    it("renders empty DOM and does not push to /sign-in when currentUser is null", async () => {
      // Auth is enforced server-side by the (dashboard) layout. The client
      // used to push("/sign-in") here, which raced with the loading state
      // and bounced authenticated users to /dashboard via proxy.ts.
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
      });
      setupQueryMocks();

      const { container } = render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      // Wait for the tournament data to load — the component returns null only
      // after all loading states resolve and currentUser is null.
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("renders an error card when useCurrentUser surfaces an error", async () => {
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: undefined,
        isLoading: false,
        error: new Error("PostgrestError: rls denied"),
      });
      setupQueryMocks();

      render(
        <TournamentManageClient
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
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  describe("community read — useApiQuery wiring", () => {
    it("queries /api/v1/communities/[slug] via useApiQuery with staleTime:30s", () => {
      setupQueryMocks();

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      // useApiQuery should have been called for the community
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

    it("renders org-error card when useApiQuery isError is true", async () => {
      // Community fetch error
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("HTTP 503"),
      });
      // Tournament reads still work
      mockGetTournamentBySlug.mockResolvedValue(mockTournament);
      mockGetTournamentPhases.mockResolvedValue(mockPhases);

      render(
        <TournamentManageClient
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
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });

    it("renders 'Organization not found' card when useApiQuery data is null", async () => {
      mockUseApiQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });
      mockGetTournamentBySlug.mockResolvedValue(mockTournament);
      mockGetTournamentPhases.mockResolvedValue(mockPhases);

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/organization not found/i)).toBeInTheDocument();
      });
    });

    it("shows Access Denied when user is not the org owner", async () => {
      mockUseApiQuery.mockReturnValue({
        data: { ...mockOrganization, owner_user_id: "someone-else" },
        isLoading: false,
        isError: false,
        error: null,
      });
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: { id: "user-1" },
        isLoading: false,
      });
      mockGetTournamentBySlug.mockResolvedValue(mockTournament);
      mockGetTournamentPhases.mockResolvedValue(mockPhases);

      render(
        <TournamentManageClient
          communitySlug="test-org"
          tournamentSlug="test-tournament"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });
  });

  describe("Removed tabs", () => {
    it("should fall back to overview for old tab values (registrations, pairings, standings, audit, settings)", async () => {
      const oldTabValues = [
        "registrations",
        "pairings",
        "standings",
        "audit",
        "settings",
      ];

      for (const tabValue of oldTabValues) {
        jest.clearAllMocks();

        (useSearchParams as jest.Mock).mockReturnValue(
          new URLSearchParams(`tab=${tabValue}`)
        );
        (useCurrentUser as jest.Mock).mockReturnValue({
          user: mockUser,
          isLoading: false,
        });
        setupQueryMocks();

        const { unmount } = render(
          <TournamentManageClient
            communitySlug="test-org"
            tournamentSlug="test-tournament"
          />,
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(screen.getByTestId("overview-tab")).toBeVisible();
        });

        unmount();
      }
    });
  });
});
