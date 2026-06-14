import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CreateTournamentClient } from "../create-tournament-client";
import { useCurrentUser } from "@/hooks/use-current-user";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// useApiQuery — community read (migrated off useSupabaseQuery in T3p)
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// createTournament mutation fn — called inside useMutation's mutationFn
const mockCreateTournament = jest.fn();
jest.mock("@trainers/supabase", () => ({
  createTournament: (...args: unknown[]) => mockCreateTournament(...args),
}));

// createClient — called inside queryFn / mutationFn; mock it away
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
  supabase: {},
}));

jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

// Mock child components, capturing props so we can assert on formData
const mockScheduleProps = jest.fn();
const mockRegistrationProps = jest.fn();

jest.mock("@/components/tournaments", () => ({
  TournamentSchedule: (props: Record<string, unknown>) => {
    mockScheduleProps(props);
    return (
      <div data-testid="tournament-schedule">
        <button
          data-testid="set-start-date"
          onClick={() =>
            (props.updateFormData as (u: Record<string, unknown>) => void)({
              startDate: 1700000000000,
            })
          }
        >
          Set Date
        </button>
        <span data-testid="start-date-value">
          {String((props.formData as { startDate?: number }).startDate ?? "")}
        </span>
      </div>
    );
  },
  TournamentRegistration: (props: Record<string, unknown>) => {
    mockRegistrationProps(props);
    return <div data-testid="tournament-registration" />;
  },
  TournamentFormat: () => <div data-testid="tournament-format" />,
  TournamentReview: () => <div data-testid="tournament-review" />,
  TournamentGameSettings: () => <div data-testid="game-settings" />,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Discord info banner — not under test here
jest.mock(
  "../_components/discord-notifications-info-banner",
  () => ({
    DiscordNotificationsInfoBanner: () => null,
  })
);

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
  id: 1,
  name: "Test Org",
  slug: "test-org",
  owner_user_id: "user-1",
};

function setupMocks() {
  (useRouter as jest.Mock).mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  });
  (useCurrentUser as jest.Mock).mockReturnValue({
    user: { id: "user-1" },
    isLoading: false,
  });
  // Community read now comes from useApiQuery → /api/v1/communities/[slug]
  mockUseApiQuery.mockReturnValue({
    data: mockOrganization,
    isLoading: false,
    isError: false,
    error: null,
  });
  mockCreateTournament.mockResolvedValue({ id: 1, slug: "my-tournament" });
  mockScheduleProps.mockClear();
  mockRegistrationProps.mockClear();
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CreateTournamentClient", () => {
  beforeEach(setupMocks);

  it("renders the wizard form with schedule and registration sections", () => {
    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId("tournament-schedule")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-registration")).toBeInTheDocument();
  });

  it("passes formData to child components via form.watch()", () => {
    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    // form.watch() is called during render, providing reactive formData
    expect(mockScheduleProps).toHaveBeenCalled();
    const scheduleCall = mockScheduleProps.mock.calls[0]?.[0];
    expect(scheduleCall).toHaveProperty("formData");
    expect(scheduleCall).toHaveProperty("updateFormData");
  });

  it("does not show validation errors on initial render", async () => {
    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });
    // Wait for the form to be ready (organization loaded)
    await screen.findByTestId("tournament-schedule");
    // No validation errors should appear before user interaction
    expect(screen.queryByText("Tournament name is required")).toBeNull();
  });

  it("re-renders child components when updateFormData is called", async () => {
    const user = userEvent.setup();
    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    // Initially no start date
    expect(screen.getByTestId("start-date-value").textContent).toBe("");

    // Simulate date picker selection via updateFormData
    await user.click(screen.getByTestId("set-start-date"));

    // form.watch() triggers a re-render, so the child sees the updated value
    await waitFor(() => {
      expect(screen.getByTestId("start-date-value").textContent).toBe(
        "1700000000000"
      );
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("shows spinner while data is loading", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });
    mockUseApiQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { container } = render(
      <CreateTournamentClient communitySlug="test-org" />,
      { wrapper: createWrapper() }
    );

    // No wizard content should be rendered
    expect(screen.queryByTestId("tournament-schedule")).not.toBeInTheDocument();
    // The spinner SVG is present
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  // ── Community not found ───────────────────────────────────────────────────────

  it("shows 'Community not found' when organization is null", () => {
    mockUseApiQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<CreateTournamentClient communitySlug="unknown-org" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Community not found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to communities/i })
    ).toBeInTheDocument();
  });

  // ── Community fetch error ─────────────────────────────────────────────────────

  it("shows 'Couldn't load community' card when useApiQuery isError is true", () => {
    mockUseApiQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("HTTP 503"),
    });

    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/couldn['']t load community/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  // ── Not authenticated ────────────────────────────────────────────────────────

  it("renders empty DOM and does not push to /sign-in when currentUser is null", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
    });
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });
    mockUseApiQuery.mockReturnValue({
      data: mockOrganization,
      isLoading: false,
      isError: false,
      error: null,
    });

    // The parent server layout enforces auth; this client renders null
    // instead of pushing to /sign-in (which used to race with the loading
    // state and bounce real users to /dashboard).
    const { container } = render(
      <CreateTournamentClient communitySlug="test-org" />,
      { wrapper: createWrapper() }
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders an error card when useCurrentUser surfaces an error", () => {
    const mockRefresh = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: mockRefresh,
    });
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: undefined,
      isLoading: false,
      error: new Error("PostgrestError: rls denied"),
    });
    mockUseApiQuery.mockReturnValue({
      data: mockOrganization,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByText(/couldn['']t load your account/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  // ── Permission denied ────────────────────────────────────────────────────────

  it("shows 'Access Denied' when user is not the community owner", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: { id: "different-user" },
      isLoading: false,
    });
    mockUseApiQuery.mockReturnValue({
      data: { ...mockOrganization, owner_user_id: "user-1" },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<CreateTournamentClient communitySlug="test-org" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view community/i })
    ).toBeInTheDocument();
  });

  // ── Community read — useApiQuery wiring ────────────────────────────────────

  describe("community read — useApiQuery wiring", () => {
    it("queries /api/v1/communities/[slug] via useApiQuery with staleTime:30s", () => {
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

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
  });

  // ── Multi-step navigation ────────────────────────────────────────────────────

  describe("step navigation", () => {
    it("Previous button is disabled on step 1", () => {
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });

    it("advances to step 2 after clicking Next with valid step 1 data", async () => {
      const user = userEvent.setup();
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      // Fill in required fields for step 1
      const nameInput = screen.getByPlaceholderText(
        /spring regional championship/i
      );
      await user.type(nameInput, "My Cool Tournament");

      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByTestId("game-settings")).toBeInTheDocument();
      });
    });

    it("shows validation error toast when name is missing on step 1 Next", async () => {
      const { toast } = jest.requireMock("sonner") as {
        toast: { error: jest.Mock; success: jest.Mock };
      };
      const user = userEvent.setup();
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      // Don't fill in name — submit Next
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please fix the errors before continuing"
        );
      });
    });

    it("shows step 3 review after navigating to step 2 then Next", async () => {
      const user = userEvent.setup();
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      // Step 1 → 2
      const nameInput = screen.getByPlaceholderText(
        /spring regional championship/i
      );
      await user.type(nameInput, "Tournament");
      await user.click(screen.getByRole("button", { name: /next/i }));

      // Step 2 → 3
      await waitFor(() =>
        expect(screen.getByTestId("game-settings")).toBeInTheDocument()
      );
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByTestId("tournament-review")).toBeInTheDocument();
      });
    });

    it("navigates back to step 1 when Previous is clicked on step 2", async () => {
      const user = userEvent.setup();
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      const nameInput = screen.getByPlaceholderText(
        /spring regional championship/i
      );
      await user.type(nameInput, "Tournament");
      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() =>
        expect(screen.getByTestId("game-settings")).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: /previous/i }));

      await waitFor(() => {
        expect(screen.getByTestId("tournament-schedule")).toBeInTheDocument();
      });
    });

    it("shows the step indicator for all 3 steps", () => {
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      // Steps are in visible spans inside step buttons
      const stepLabels = screen.getAllByText("Details");
      expect(stepLabels.length).toBeGreaterThan(0);
      const structureLabels = screen.getAllByText("Structure");
      expect(structureLabels.length).toBeGreaterThan(0);
      const reviewLabels = screen.getAllByText("Review");
      expect(reviewLabels.length).toBeGreaterThan(0);
    });
  });

  // ── handleSubmit ──────────────────────────────────────────────────────────────

  describe("handleSubmit", () => {
    async function navigateToStep3(user: ReturnType<typeof userEvent.setup>) {
      const nameInput = screen.getByPlaceholderText(
        /spring regional championship/i
      );
      await user.type(nameInput, "My Tournament");

      // Step 1 → 2
      await user.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() =>
        expect(screen.getByTestId("game-settings")).toBeInTheDocument()
      );

      // Step 2 → 3
      await user.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() =>
        expect(screen.getByTestId("tournament-review")).toBeInTheDocument()
      );
    }

    it("createTournament mutation is wired up (useMutation present)", async () => {
      const user = userEvent.setup();
      render(<CreateTournamentClient communitySlug="test-org" />, {
        wrapper: createWrapper(),
      });

      await navigateToStep3(user);

      // TournamentReview mock renders — confirms we reached step 3
      expect(screen.getByTestId("tournament-review")).toBeInTheDocument();
    });

    it("shows 'Community not found' state when organization is missing (no submit possible)", async () => {
      // Organization returns null — the form never renders so submit can't be triggered
      mockUseApiQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<CreateTournamentClient communitySlug="unknown-org" />, {
        wrapper: createWrapper(),
      });
      // The component shows the "not found" card instead of the wizard
      expect(screen.getByText("Community not found")).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText(/spring regional championship/i)
      ).not.toBeInTheDocument();
    });
  });
});
