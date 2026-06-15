import { render, screen, waitFor, act } from "@testing-library/react";
import { TournamentPairingsJudge } from "../tournament-pairings-judge";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Realtime / Supabase mock (channels RETAINED in judge view)
// ---------------------------------------------------------------------------

// Captures the postgres_changes handlers registered per channel so tests can
// fire realtime payloads and assert the cache effect. Keyed by channel name.
const channelHandlers: Record<string, (payload: { new?: unknown }) => void> =
  {};
let currentChannelName = "";

const mockChannel = {
  on: jest.fn((_event: string, _config: unknown, handler) => {
    channelHandlers[currentChannelName] = handler;
    return mockChannel;
  }),
  subscribe: jest.fn((callback) => {
    if (typeof callback === "function") {
      callback("SUBSCRIBED", null);
    }
    return mockChannel;
  }),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
  channel: jest.fn((name: string) => {
    currentChannelName = name;
    return mockChannel;
  }),
};

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(),
}));

import { useSupabase } from "@/lib/supabase";
const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

// ---------------------------------------------------------------------------
// TanStack Query client mock — captures setQueryData / invalidateQueries so we
// can assert the realtime payload mutates the cache (matches) vs refetches
// (rounds).
// ---------------------------------------------------------------------------

const mockSetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  }),
}));

// ---------------------------------------------------------------------------
// useApiQuery mock — replaces the three useSupabaseQuery calls
// ---------------------------------------------------------------------------

const mockUseApiQuery = jest.fn();

jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal TournamentPairingsData shape for tests.
 * phases, allPhaseRounds, roundsWithStats, and unpairedPlayers mirror the
 * shape returned by GET /api/v1/tournaments/[id]/pairings.
 */
function buildPairingsData(overrides: {
  phases?: Array<{ id: number; name: string | null; phase_order: number }>;
  allPhaseRounds?: Array<
    Array<{
      id: number;
      round_number: number;
      status: string | null;
      matches: unknown[];
    }>
  >;
  roundsWithStats?: Array<{
    id: number;
    round_number: number;
    status: string | null;
    matchCount: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
  }>;
}) {
  return {
    phases: overrides.phases ?? [],
    allPhaseRounds: overrides.allPhaseRounds ?? [],
    roundsWithStats: overrides.roundsWithStats ?? [],
    unpairedPlayers: [],
  };
}

const BASE_PHASES = [{ id: 123, name: "Swiss", phase_order: 1 }];

const ACTIVE_ROUND_STATS = {
  id: 1,
  round_number: 1,
  status: "active",
  matchCount: 2,
  completedCount: 0,
  inProgressCount: 2,
  pendingCount: 0,
};

function makeMatch(overrides: {
  id: number;
  table_number: number;
  status: string;
  staff_requested?: boolean;
  is_bye?: boolean;
  game_wins1?: number;
  game_wins2?: number;
  player1_match_confirmed?: boolean;
  player2_match_confirmed?: boolean;
  player1: { id: number; username: string } | null;
  player2: { id: number; username: string } | null;
}) {
  return {
    staff_requested: false,
    is_bye: false,
    game_wins1: 0,
    game_wins2: 0,
    player1_match_confirmed: false,
    player2_match_confirmed: false,
    winner_alt_id: null,
    alt1_id: overrides.player1?.id ?? null,
    alt2_id: overrides.player2?.id ?? null,
    player1Stats: null,
    player2Stats: null,
    ...overrides,
  };
}

function apiResult(data: unknown) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TournamentPairingsJudge", () => {
  const mockTournament = {
    id: 1,
    slug: "test-tournament",
    currentPhaseId: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    for (const key of Object.keys(channelHandlers)) {
      delete channelHandlers[key];
    }
    mockUseSupabase.mockReturnValue(
      mockSupabase as ReturnType<typeof useSupabase>
    );
    // Default: empty pairings data
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [] }))
    );
  });

  // -------------------------------------------------------------------------
  // useApiQuery wiring
  // -------------------------------------------------------------------------

  describe("API query wiring", () => {
    it("calls useApiQuery with the pairings endpoint URL", () => {
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const [queryKey] = mockUseApiQuery.mock.calls[0] as [unknown[]];
      expect(queryKey).toContain(mockTournament.id);
    });

    it("uses staleTime: 0 so realtime refetches always get fresh data", () => {
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const [, , options] = mockUseApiQuery.mock.calls[0] as [
        unknown,
        unknown,
        { staleTime: number },
      ];
      expect(options.staleTime).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // No Phases
  // -------------------------------------------------------------------------

  describe("No Phases", () => {
    it("displays message when no phases exist", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(buildPairingsData({ phases: [] }))
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Pairings")).toBeInTheDocument();
      expect(screen.getByText(/No phases configured/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading and Error states — must NOT show "No phases configured" while the
  // pairings query is pending or errored (otherwise a slow/failed fetch is
  // indistinguishable from a tournament that genuinely has no phases).
  // -------------------------------------------------------------------------

  describe("Loading and Error States", () => {
    it("shows a loading state while the pairings query is pending", () => {
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText(/Loading pairings/)).toBeInTheDocument();
      expect(
        screen.queryByText(/No phases configured/)
      ).not.toBeInTheDocument();
    });

    it("shows an error state when the pairings query fails", () => {
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Failed to load pairings (HTTP 500)"),
        refetch: jest.fn(),
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText(/Failed to load pairings/)).toBeInTheDocument();
      expect(
        screen.queryByText(/No phases configured/)
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No Rounds
  // -------------------------------------------------------------------------

  describe("No Rounds", () => {
    it("displays message when no rounds exist", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[]],
            roundsWithStats: [],
          })
        )
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("No Rounds")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Active Round with Matches
  // -------------------------------------------------------------------------

  describe("Active Round with Matches", () => {
    const matchA = makeMatch({
      id: 1,
      table_number: 1,
      status: "active",
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 1, username: "playera" },
      player2: { id: 2, username: "playerb" },
    });

    const matchB = makeMatch({
      id: 2,
      table_number: 2,
      status: "pending",
      staff_requested: true,
      player1: { id: 3, username: "playerc" },
      player2: { id: 4, username: "playerd" },
    });

    const pairingsWithMatches = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [matchA, matchB] }]],
      roundsWithStats: [ACTIVE_ROUND_STATS],
    });

    it("displays round heading", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("Round 1 Matches")).toBeInTheDocument();
    });

    it("shows realtime status badge when viewing active round", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("displays player names in matches", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("playera")).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
      expect(screen.getByText("playerc")).toBeInTheDocument();
      expect(screen.getByText("playerd")).toBeInTheDocument();
    });

    it("displays table numbers for matches", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const tableCells = screen.getAllByRole("cell");
      const tableNumbers = tableCells.filter((cell) =>
        ["1", "2"].includes(cell.textContent || "")
      );
      expect(tableNumbers.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Judge Queue Tab
  // -------------------------------------------------------------------------

  describe("Judge Queue Tab", () => {
    const matchNormal = makeMatch({
      id: 1,
      table_number: 1,
      status: "active",
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 1, username: "playera" },
      player2: { id: 2, username: "playerb" },
    });
    const matchJudge1 = makeMatch({
      id: 2,
      table_number: 2,
      status: "active",
      staff_requested: true,
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 3, username: "playerc" },
      player2: { id: 4, username: "playerd" },
    });
    const matchJudge2 = makeMatch({
      id: 3,
      table_number: 3,
      status: "active",
      staff_requested: true,
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 5, username: "playere" },
      player2: { id: 6, username: "playerf" },
    });

    const pairingsWithJudgeQueue = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [
        [
          {
            ...ACTIVE_ROUND_STATS,
            matchCount: 3,
            matches: [matchNormal, matchJudge1, matchJudge2],
          },
        ],
      ],
      roundsWithStats: [{ ...ACTIVE_ROUND_STATS, matchCount: 3 }],
    });

    it("shows badge count on judge queue tab when requests exist", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      expect(judgeTab).toHaveTextContent("2");
    });

    it("switches to judge queue tab when clicked", async () => {
      const user = userEvent.setup();
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Matches requesting staff assistance")
        ).toBeInTheDocument();
      });
    });

    it("shows Respond buttons in judge queue", async () => {
      const user = userEvent.setup();
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        const respondButtons = screen.getAllByRole("button", {
          name: /respond/i,
        });
        expect(respondButtons).toHaveLength(2);
      });
    });

    it("shows message when judge queue is empty", async () => {
      const user = userEvent.setup();
      const pairingsNoQueue = buildPairingsData({
        phases: BASE_PHASES,
        allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [matchNormal] }]],
        roundsWithStats: [{ ...ACTIVE_ROUND_STATS, matchCount: 1 }],
      });
      mockUseApiQuery.mockReturnValue(apiResult(pairingsNoQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByText("No pending judge requests.")
        ).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Realtime Subscriptions — judge RETAINS its subs
  // -------------------------------------------------------------------------

  describe("Realtime Subscription (judge RETAINS subs)", () => {
    const pairingsActive = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [] }]],
      roundsWithStats: [ACTIVE_ROUND_STATS],
    });

    it("sets up match realtime subscription when viewing active round", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      // Round id=1 is active, so the pairings-matches channel should be created
      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-matches-1");
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it("sets up round subscription for new round detection", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      // selectedPhaseId defaults to tournament.currentPhaseId = 123
      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-rounds-123");
    });

    it("cleans up subscriptions on unmount", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      const { unmount } = render(
        <TournamentPairingsJudge tournament={mockTournament} />
      );
      unmount();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // P3-5: payload-driven cache updates
  // -------------------------------------------------------------------------

  describe("payload-driven realtime cache", () => {
    const pairingsActive = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [] }]],
      roundsWithStats: [ACTIVE_ROUND_STATS],
    });

    it("merges a match UPDATE into the cache via setQueryData (no refetch)", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      // Fire a realtime UPDATE on the matches channel for the active round.
      const handler = channelHandlers["pairings-matches-1"];
      expect(handler).toBeDefined();
      handler!({ new: { id: 7, status: "completed" } });

      // setQueryData targets the pairings key; the matches channel never
      // invalidates/refetches.
      expect(mockSetQueryData).toHaveBeenCalledTimes(1);
      const [key, updater] = mockSetQueryData.mock.calls[0] as [
        unknown[],
        (prev: unknown) => unknown,
      ];
      expect(key).toContain(mockTournament.id);
      expect(typeof updater).toBe("function");

      // The matches update must NOT trigger an invalidate/refetch.
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it("the setQueryData updater patches the changed match by id", () => {
      const matchA = makeMatch({
        id: 7,
        table_number: 1,
        status: "active",
        player1: { id: 1, username: "playera" },
        player2: { id: 2, username: "playerb" },
      });
      const data = buildPairingsData({
        phases: BASE_PHASES,
        allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [matchA] }]],
        roundsWithStats: [ACTIVE_ROUND_STATS],
      });
      mockUseApiQuery.mockReturnValue(apiResult(data));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      channelHandlers["pairings-matches-1"]!({
        new: { id: 7, status: "completed", game_wins1: 2 },
      });

      const [, updater] = mockSetQueryData.mock.calls[0] as [
        unknown,
        (prev: unknown) => { allPhaseRounds: { matches: unknown[] }[][] },
      ];
      const next = updater(data);
      const updated = next.allPhaseRounds[0]![0]!.matches[0] as {
        status: string;
        game_wins1: number;
        player1: { username: string };
      };
      expect(updated.status).toBe("completed");
      expect(updated.game_wins1).toBe(2);
      // Hydrated join survives.
      expect(updated.player1.username).toBe("playera");
    });

    it("rounds channel invalidates the pairings query (debounced) — no setQueryData", () => {
      jest.useFakeTimers();
      try {
        mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
        render(<TournamentPairingsJudge tournament={mockTournament} />);

        const handler = channelHandlers["pairings-rounds-123"];
        expect(handler).toBeDefined();
        handler!({ new: { id: 99 } });

        // Debounced — nothing yet.
        expect(mockInvalidateQueries).not.toHaveBeenCalled();
        act(() => {
          jest.advanceTimersByTime(500);
        });

        expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
        const [arg] = mockInvalidateQueries.mock.calls[0] as [
          { queryKey: unknown[] },
        ];
        expect(arg.queryKey).toContain(mockTournament.id);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Fetcher ActionResult wrapping — fetch-level contract
  //
  // The inline fetcher passed to useApiQuery wraps the raw fetch response into
  // ActionResult<TournamentPairingsData>. useApiQuery relies on result.success
  // to decide whether to surface the data or throw an error. If the wrapping
  // were removed (e.g. returning the raw Response), the query would silently
  // lose data or always throw.
  //
  // Because the fetcher is not exported, we test it by:
  //  1. Capturing it from the mockUseApiQuery call arguments.
  //  2. Calling it directly with mocked global fetch.
  //  3. Asserting the ActionResult shape.
  // -------------------------------------------------------------------------

  describe("fetcher ActionResult wrapping", () => {
    const savedFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = savedFetch;
    });

    it("resolves { success: false, error: ... } when fetch returns a non-OK response", async () => {
      // Render the component so mockUseApiQuery captures the fetcher arg.
      mockUseApiQuery.mockImplementation(
        (_key: unknown, fetcher: () => Promise<unknown>, _opts?: unknown) => {
          // Capture the fetcher, return loading so the component is idle.
          capturedFetcher = fetcher;
          return {
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
            refetch: jest.fn(),
          };
        }
      );

      let capturedFetcher: (() => Promise<unknown>) | undefined;

      // Re-render after assigning the capture variable above.
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(capturedFetcher).toBeDefined();

      // Now mock fetch to return a 500 error response.
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      }) as typeof fetch;

      const result = (await capturedFetcher!()) as {
        success: boolean;
        error?: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("resolves { success: true, data: ... } when fetch returns an OK response", async () => {
      let capturedFetcher: (() => Promise<unknown>) | undefined;

      mockUseApiQuery.mockImplementation(
        (_key: unknown, fetcher: () => Promise<unknown>, _opts?: unknown) => {
          capturedFetcher = fetcher;
          return {
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
            refetch: jest.fn(),
          };
        }
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(capturedFetcher).toBeDefined();

      const fakeData = {
        phases: [],
        allPhaseRounds: [],
        roundsWithStats: [],
        unpairedPlayers: [],
      };

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(fakeData),
      }) as typeof fetch;

      const result = (await capturedFetcher!()) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fakeData);
    });

    it.each([
      [401, "401"],
      [403, "403"],
      [404, "404"],
      [503, "503"],
    ])(
      "HTTP %i response resolves { success: false } with status in error message",
      async (statusCode, statusStr) => {
        let capturedFetcher: (() => Promise<unknown>) | undefined;

        mockUseApiQuery.mockImplementation(
          (_key: unknown, fetcher: () => Promise<unknown>, _opts?: unknown) => {
            capturedFetcher = fetcher;
            return {
              data: undefined,
              isLoading: true,
              isError: false,
              error: null,
              refetch: jest.fn(),
            };
          }
        );

        render(<TournamentPairingsJudge tournament={mockTournament} />);

        globalThis.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: statusCode,
          json: jest.fn().mockResolvedValue({}),
        }) as typeof fetch;

        const result = (await capturedFetcher!()) as {
          success: boolean;
          error?: string;
        };

        expect(result.success).toBe(false);
        expect(result.error).toContain(statusStr);
      }
    );
  });

  // -------------------------------------------------------------------------
  // Empty States
  // -------------------------------------------------------------------------

  describe("Empty States", () => {
    it("shows message when no matches exist for active round", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [] }]],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(
        screen.getByText("No matches found for this round.")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // BYE Handling
  // -------------------------------------------------------------------------

  describe("BYE Handling", () => {
    it("displays BYE for matches without player data", () => {
      const byeMatch = makeMatch({
        id: 1,
        table_number: 1,
        status: "active",
        is_bye: true,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: null,
        player2: { id: 2, username: "playerb" },
      });
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [byeMatch] }]],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getAllByText("BYE")[0]).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe("Navigation", () => {
    it("navigates to match page when Respond button is clicked", async () => {
      const user = userEvent.setup();
      const judgeMatch = makeMatch({
        id: 42,
        table_number: 1,
        status: "active",
        staff_requested: true,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 1, username: "playera" },
        player2: { id: 2, username: "playerb" },
      });
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [
              [{ ...ACTIVE_ROUND_STATS, matches: [judgeMatch] }],
            ],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /respond/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /respond/i }));

      expect(mockPush).toHaveBeenCalledWith(
        "/tournaments/test-tournament/r/1/t/1"
      );
    });
  });
});
