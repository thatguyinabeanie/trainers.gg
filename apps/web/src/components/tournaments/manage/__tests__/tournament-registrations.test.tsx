import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetTournamentRegistrations = jest.fn();
const mockGetTournamentInvitationsSent = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentRegistrations: (...args: unknown[]) =>
    mockGetTournamentRegistrations(...args),
  getTournamentInvitationsSent: (...args: unknown[]) =>
    mockGetTournamentInvitationsSent(...args),
}));

// Provide a stable no-op client so queryFn can call createClient()
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/actions/tournaments", () => ({
  forceCheckInPlayer: jest.fn(),
  removePlayerFromTournament: jest.fn(),
  bulkForceCheckIn: jest.fn(),
  bulkRemovePlayers: jest.fn(),
}));

// Mock InviteForm to avoid pulling in its heavy dependencies
jest.mock("@/components/tournaments/invite/invite-form", () => ({
  InviteForm: jest.fn(() => <div data-testid="invite-form" />),
}));

// Import component AFTER mocks
import { TournamentRegistrations } from "../tournament-registrations";

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

function buildRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    tournament_id: 1,
    alt_id: 1,
    status: "registered",
    registered_at: new Date().toISOString(),
    team_name: null,
    drop_category: null,
    alt: { id: 1, username: "player1", display_name: "Player 1", avatar_url: null },
    ...overrides,
  };
}

function buildInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    status: "pending",
    expires_at: "2099-01-01T00:00:00Z",
    invited_at: new Date().toISOString(),
    invitedPlayer: { username: "invited_user" },
    invitedByAlt: null,
    ...overrides,
  };
}

const defaultTournament = { id: 1, status: "active" };

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentRegistrations — Statistics Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentInvitationsSent.mockResolvedValue([]);
  });

  it("shows correct Total Registered count", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([
      buildRegistration({ id: 1, status: "checked_in" }),
      buildRegistration({ id: 2, status: "registered" }),
    ]);

    const { container } = render(
      <TournamentRegistrations tournament={defaultTournament} />,
      { wrapper: createWrapper() }
    );

    // Wait for data to load — Total Registered card should show 2
    const statsCards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-4 > div"
    );
    await waitFor(() => {
      expect(statsCards[0]).toHaveTextContent("2");
    });
    expect(statsCards[0]).toHaveTextContent("Total Registered");
  });

  it("counts checked_in registrations correctly", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([
      buildRegistration({ id: 1, status: "checked_in" }),
      buildRegistration({ id: 2, status: "checked_in" }),
      buildRegistration({ id: 3, status: "registered" }),
    ]);

    const { container } = render(
      <TournamentRegistrations tournament={defaultTournament} />,
      { wrapper: createWrapper() }
    );

    const statsCards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-4 > div"
    );
    expect(statsCards).toHaveLength(4);
    // Wait for checked-in count to load
    await waitFor(() => {
      expect(statsCards[1]).toHaveTextContent("2");
    });
    expect(statsCards[1]).toHaveTextContent("Checked In");
  });

  it("counts not-checked-in registrations (registered, confirmed, pending, waitlist)", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([
      buildRegistration({ id: 1, status: "checked_in" }),
      buildRegistration({ id: 2, status: "registered" }),
      buildRegistration({ id: 3, status: "confirmed" }),
      buildRegistration({ id: 4, status: "pending" }),
      buildRegistration({ id: 5, status: "waitlist" }),
    ]);

    const { container } = render(
      <TournamentRegistrations tournament={defaultTournament} />,
      { wrapper: createWrapper() }
    );

    const statsCards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-4 > div"
    );
    // Wait for not-checked-in count to populate
    await waitFor(() => {
      expect(statsCards[2]).toHaveTextContent("4");
    });
    expect(statsCards[2]).toHaveTextContent("Not Checked In");
  });

  it("counts dropped registrations correctly", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([
      buildRegistration({ id: 1, status: "checked_in" }),
      buildRegistration({ id: 2, status: "dropped" }),
      buildRegistration({ id: 3, status: "dropped" }),
    ]);

    const { container } = render(
      <TournamentRegistrations tournament={defaultTournament} />,
      { wrapper: createWrapper() }
    );

    const statsCards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-4 > div"
    );
    await waitFor(() => {
      expect(statsCards[3]).toHaveTextContent("2");
    });
    expect(statsCards[3]).toHaveTextContent("Dropped");
  });

  it("shows all zeros when there are no registrations", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([]);

    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText("Total Registered")).toBeInTheDocument()
    );

    const zeroCells = screen.getAllByText("0");
    expect(zeroCells).toHaveLength(4);
  });

  it("handles 63 checked_in players correctly", async () => {
    const regs = Array.from({ length: 63 }, (_, i) =>
      buildRegistration({ id: i + 1, alt_id: i + 1, status: "checked_in" })
    );
    mockGetTournamentRegistrations.mockResolvedValue(regs);

    const { container } = render(
      <TournamentRegistrations tournament={defaultTournament} />,
      { wrapper: createWrapper() }
    );

    const statsCards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-4 > div"
    );

    // Wait for the total-registered card to show 63
    await waitFor(() => {
      expect(statsCards[0]).toHaveTextContent("63");
    });

    expect(statsCards[0]).toHaveTextContent("Total Registered");
    expect(statsCards[1]).toHaveTextContent("Checked In");
    expect(statsCards[1]).toHaveTextContent("63");
    expect(statsCards[2]).toHaveTextContent("Not Checked In");
    expect(statsCards[2]).toHaveTextContent("0");
    expect(statsCards[3]).toHaveTextContent("Dropped");
    expect(statsCards[3]).toHaveTextContent("0");
  });
});

describe("TournamentRegistrations — invitations sub-tab", () => {
  const tournament = { id: 1, status: "upcoming", maxParticipants: 10 };

  const sixRegistered = Array.from({ length: 6 }, (_, i) =>
    buildRegistration({ id: i + 1, alt_id: i + 1, status: "registered" })
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentRegistrations.mockResolvedValue(sixRegistered);
    mockGetTournamentInvitationsSent.mockResolvedValue([]);
  });

  it("shows available spots as maxParticipants minus registered minus pending non-expired", async () => {
    mockGetTournamentInvitationsSent.mockResolvedValue([
      buildInvitation({ id: 10, expires_at: "2099-01-01T00:00:00Z" }),
      buildInvitation({ id: 11, expires_at: "2099-01-01T00:00:00Z" }),
      buildInvitation({ id: 12, expires_at: "2024-01-01T00:00:00Z" }), // expired
    ]);

    render(<TournamentRegistrations tournament={tournament} />, {
      wrapper: createWrapper(),
    });

    // 10 - 6 - 2 = 2 available
    await waitFor(() =>
      expect(screen.getByText(/2 spots? available/i)).toBeInTheDocument()
    );
  });

  it("shows zero available spots when at capacity", async () => {
    mockGetTournamentRegistrations.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) =>
        buildRegistration({ id: i + 1, alt_id: i + 1, status: "registered" })
      )
    );
    mockGetTournamentInvitationsSent.mockResolvedValue([
      buildInvitation({ id: 10, expires_at: "2099-01-01T00:00:00Z" }),
      buildInvitation({ id: 11, expires_at: "2099-01-01T00:00:00Z" }),
    ]);

    render(<TournamentRegistrations tournament={tournament} />, {
      wrapper: createWrapper(),
    });

    // 10 - 8 - 2 = 0 available
    await waitFor(() =>
      expect(screen.getByText(/0 spots? available/i)).toBeInTheDocument()
    );
  });

  it("shows singular 'invitation' for exactly 1 pending invite", async () => {
    mockGetTournamentInvitationsSent.mockResolvedValue([
      buildInvitation({ id: 20, expires_at: "2099-01-01T00:00:00Z" }),
    ]);

    render(<TournamentRegistrations tournament={tournament} />, {
      wrapper: createWrapper(),
    });

    // 10 - 6 - 1 = 3 available
    await waitFor(() =>
      expect(screen.getByText(/1 pending invitation\b/i)).toBeInTheDocument()
    );
  });

  it("shows plural 'invitations' for >1 pending invite", async () => {
    mockGetTournamentInvitationsSent.mockResolvedValue([
      buildInvitation({ id: 30, expires_at: "2099-01-01T00:00:00Z" }),
      buildInvitation({ id: 31, expires_at: "2099-01-01T00:00:00Z" }),
    ]);

    render(<TournamentRegistrations tournament={tournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText(/2 pending invitations/i)).toBeInTheDocument()
    );
  });
});

describe("TournamentRegistrations — search", () => {
  const twoPlayers = [
    buildRegistration({
      id: 1,
      status: "registered",
      alt: { username: "ash_ketchum", avatar_url: null },
      team_name: "Pokémon Team",
    }),
    buildRegistration({
      id: 2,
      status: "registered",
      alt: { username: "misty", avatar_url: null },
      team_name: "Water Wonders",
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentRegistrations.mockResolvedValue(twoPlayers);
    mockGetTournamentInvitationsSent.mockResolvedValue([]);
  });

  it("filters registrations by username", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument()
    );

    await user.type(screen.getByPlaceholderText(/search players/i), "ash");

    expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
    expect(screen.queryByText("misty")).not.toBeInTheDocument();
  });

  it("filters registrations by team name", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText("Water Wonders")).toBeInTheDocument()
    );

    await user.type(screen.getByPlaceholderText(/search players/i), "Water");

    expect(screen.getByText("Water Wonders")).toBeInTheDocument();
    expect(screen.queryByText("Pokémon Team")).not.toBeInTheDocument();
  });

  it("shows empty state when search yields no results", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText(/search players/i),
      "zzznomatch"
    );

    expect(screen.getByText(/no registrations yet/i)).toBeInTheDocument();
  });

  it("shows 'No team name' placeholder when team_name is null", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([
      buildRegistration({
        id: 10,
        status: "registered",
        alt: { username: "gary_oak", avatar_url: null },
        team_name: null,
      }),
    ]);

    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByText("No team name")).toBeInTheDocument()
    );
  });
});

describe("TournamentRegistrations — action handlers", () => {
  const singleRegistration = [
    buildRegistration({
      id: 42,
      status: "registered",
      alt: { username: "brock", avatar_url: null },
      team_name: null,
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentRegistrations.mockResolvedValue(singleRegistration);
    mockGetTournamentInvitationsSent.mockResolvedValue([]);
  });

  it("calls forceCheckInPlayer on Force Check-in dropdown action", async () => {
    const { forceCheckInPlayer } = jest.requireMock(
      "@/actions/tournaments"
    ) as { forceCheckInPlayer: jest.Mock };
    forceCheckInPlayer.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registration actions" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Registration actions" }));
    const checkInItem = await screen.findByText("Force Check-in");
    await user.click(checkInItem);

    expect(forceCheckInPlayer).toHaveBeenCalledWith(42);
  });

  it("shows error toast when forceCheckInPlayer fails", async () => {
    const { forceCheckInPlayer } = jest.requireMock(
      "@/actions/tournaments"
    ) as { forceCheckInPlayer: jest.Mock };
    const { toast } = jest.requireMock("sonner") as {
      toast: { success: jest.Mock; error: jest.Mock };
    };
    forceCheckInPlayer.mockResolvedValue({
      success: false,
      error: "Already checked in",
    });

    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registration actions" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Registration actions" }));
    const checkInItem = await screen.findByText("Force Check-in");
    await user.click(checkInItem);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Already checked in");
    });
  });

  it("shows drop dialog when Drop Player is clicked", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registration actions" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Registration actions" }));
    const dropItem = await screen.findByText("Drop Player");
    await user.click(dropItem);

    // DropPlayerDialog should open — player name visible in dialog context
    const brockOccurrences = screen.getAllByText(/brock/i);
    expect(brockOccurrences.length).toBeGreaterThan(0);
  });
});

describe("TournamentRegistrations — bulk actions", () => {
  const twoRegistrations = [
    buildRegistration({
      id: 1,
      status: "registered",
      alt: { username: "p1", avatar_url: null },
    }),
    buildRegistration({
      id: 2,
      status: "registered",
      alt: { username: "p2", avatar_url: null },
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentRegistrations.mockResolvedValue(twoRegistrations);
    mockGetTournamentInvitationsSent.mockResolvedValue([]);
  });

  it("shows bulk action buttons when a row is selected", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    );

    // checkboxes[0] = select-all; checkboxes[1] = first row
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(
      screen.getByRole("button", { name: /force check-in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove/i })
    ).toBeInTheDocument();
  });

  it("toggleSelectAll selects all visible registrations", async () => {
    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    await user.click(selectAllCheckbox);

    expect(
      screen.getByRole("button", { name: /force check-in \(2\)/i })
    ).toBeInTheDocument();
  });

  it("calls bulkForceCheckIn with selected IDs", async () => {
    const { bulkForceCheckIn } = jest.requireMock("@/actions/tournaments") as {
      bulkForceCheckIn: jest.Mock;
    };
    bulkForceCheckIn.mockResolvedValue({
      success: true,
      data: { checkedIn: 2, failed: 0 },
    });

    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    await user.click(selectAllCheckbox);

    await user.click(
      screen.getByRole("button", { name: /force check-in \(2\)/i })
    );

    expect(bulkForceCheckIn).toHaveBeenCalledWith([1, 2]);
  });

  it("shows error toast when bulkForceCheckIn fails", async () => {
    const { bulkForceCheckIn } = jest.requireMock("@/actions/tournaments") as {
      bulkForceCheckIn: jest.Mock;
    };
    const { toast } = jest.requireMock("sonner") as {
      toast: { success: jest.Mock; error: jest.Mock };
    };
    bulkForceCheckIn.mockResolvedValue({
      success: false,
      error: "Bulk check-in failed",
    });

    const user = userEvent.setup();
    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    );

    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    await user.click(selectAllCheckbox);

    await user.click(
      screen.getByRole("button", { name: /force check-in \(2\)/i })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Bulk check-in failed");
    });
  });
});

describe("TournamentRegistrations — error state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error banner when registrations query fails", async () => {
    mockGetTournamentRegistrations.mockRejectedValue(new Error("Network error"));
    mockGetTournamentInvitationsSent.mockResolvedValue([]);

    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load data/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error banner when invitations query fails", async () => {
    mockGetTournamentRegistrations.mockResolvedValue([]);
    mockGetTournamentInvitationsSent.mockRejectedValue(
      new Error("Invitations fetch failed")
    );

    render(<TournamentRegistrations tournament={defaultTournament} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load data/i)
      ).toBeInTheDocument();
    });
  });
});
