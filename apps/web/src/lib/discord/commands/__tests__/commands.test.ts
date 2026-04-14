/**
 * @jest-environment node
 *
 * Command handler tests — verifies that each slash command handler calls
 * editInteractionResponse with the correct embed shape given various states.
 *
 * Mock strategy:
 * - @trainers/supabase — mock at module level; provide per-test return values
 * - @/lib/supabase/server — returns a stub that satisfies TypedClient shape
 * - ../api — capture editInteractionResponse calls
 */

// =============================================================================
// Mocks — set up before imports so Jest hoisting works correctly
// =============================================================================

const mockEditInteractionResponse = jest.fn().mockResolvedValue(undefined);

jest.mock("../../api", () => ({
  editInteractionResponse: mockEditInteractionResponse,
}));

// Service-role Supabase client stub. Individual tests override via mockFrom.
const mockFrom = jest.fn();
const mockSupabaseStub = {
  from: mockFrom,
};

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockSupabaseStub),
}));

// =============================================================================
// @trainers/supabase query mocks
// =============================================================================

const mockGetDiscordServerByGuildId = jest.fn();
const mockListChannelMappings = jest.fn();
const mockListActiveTournaments = jest.fn();
const mockListUpcomingTournaments = jest.fn();
const mockGetTournamentByNameOrSlugInCommunity = jest.fn();
const mockListStandings = jest.fn();
const mockListCurrentPairings = jest.fn();
const mockListCommunityLeaderboard = jest.fn();
const mockGetPlayerByUsername = jest.fn();
const mockGetPlayerCommunityStats = jest.fn();
const mockGetPublicTeamForCommunity = jest.fn();
const mockGetUserByDiscordId = jest.fn();
const mockHasCommunityAccess = jest.fn();
const mockUpsertChannelMapping = jest.fn();
const mockGetChannelMappingsForEvent = jest.fn();
const mockDeleteChannelMapping = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getDiscordServerByGuildId: mockGetDiscordServerByGuildId,
  listChannelMappings: mockListChannelMappings,
  listActiveTournaments: mockListActiveTournaments,
  listUpcomingTournaments: mockListUpcomingTournaments,
  getTournamentByNameOrSlugInCommunity:
    mockGetTournamentByNameOrSlugInCommunity,
  listStandings: mockListStandings,
  listCurrentPairings: mockListCurrentPairings,
  listCommunityLeaderboard: mockListCommunityLeaderboard,
  getPlayerByUsername: mockGetPlayerByUsername,
  getPlayerCommunityStats: mockGetPlayerCommunityStats,
  getPublicTeamForCommunity: mockGetPublicTeamForCommunity,
  getUserByDiscordId: mockGetUserByDiscordId,
  hasCommunityAccess: mockHasCommunityAccess,
  upsertChannelMapping: mockUpsertChannelMapping,
  getChannelMappingsForEvent: mockGetChannelMappingsForEvent,
  deleteChannelMapping: mockDeleteChannelMapping,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { makeCommandContext } from "./helpers";

// Import command modules for their side effects (registerCommand calls),
// then fetch handlers from the registry.
import "../tournament";
import "../standings";
import "../pairings";
import "../events";
import "../player";
import "../team";
import "../leaderboard";
import "../drop";
import "../link";
import "../setchannel";
import "../unsetchannel";
import "../channels";
import "../help";

import { commandRegistry } from "../registry";

// =============================================================================
// Fixtures
// =============================================================================

const TOURNAMENT = {
  id: 10,
  name: "Spring Cup",
  slug: "spring-cup",
  status: "active",
  format: "VGC 2025",
  start_date: "2026-05-01",
  community_id: 42,
};

const SERVER = { id: 1, guild_id: "guild-123", community_id: 42 };

// =============================================================================
// Helpers
// =============================================================================

/** Extract the first editInteractionResponse call's embed. */
function getCalledEmbed() {
  expect(mockEditInteractionResponse).toHaveBeenCalledTimes(1);
  const [, payload] = mockEditInteractionResponse.mock.calls[0] as [
    string,
    { embed: { title?: string; description?: string } },
  ];
  return payload.embed;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();

  // Default: no active tournament unless overridden
  mockListActiveTournaments.mockResolvedValue([]);
  mockListUpcomingTournaments.mockResolvedValue([]);
  mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(null);
});

// =============================================================================
// /tournament
// =============================================================================

describe("/tournament", () => {
  const handler = commandRegistry.get("tournament")!.handler;

  it("resolves to the active tournament and calls editInteractionResponse with embed", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    // Also mock the registration count query
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementation((resolve: (v: unknown) => void) =>
          Promise.resolve({ count: 8, error: null }).then(resolve)
        ),
    });

    await handler(makeCommandContext());

    expect(mockEditInteractionResponse).toHaveBeenCalledTimes(1);
    const embed = getCalledEmbed();
    expect(embed.title).toBe("Spring Cup");
    expect(embed.description).toContain("VGC 2025");
    expect(embed.description).toContain("8 players");
    expect(embed.description).toContain(
      "communities/test-community/tournaments/spring-cup"
    );
  });

  it("shows error message when no active tournaments", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No active tournaments");
  });

  it("shows error message when multiple active tournaments without a name arg", async () => {
    const t2 = {
      ...TOURNAMENT,
      id: 11,
      name: "Summer Slam",
      slug: "summer-slam",
    };
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT, t2]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("Multiple tournaments active");
  });

  it("resolves by name when a name arg is supplied", async () => {
    mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(TOURNAMENT);
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest
        .fn()
        .mockImplementation((resolve: (v: unknown) => void) =>
          Promise.resolve({ count: 0, error: null }).then(resolve)
        ),
    });

    await handler(
      makeCommandContext({}, [{ name: "name", value: "spring-cup" }])
    );

    const embed = getCalledEmbed();
    expect(embed.title).toBe("Spring Cup");
  });

  it("shows not-found message when named tournament does not exist", async () => {
    mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(null);

    await handler(
      makeCommandContext({}, [{ name: "name", value: "unknown-tournament" }])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No tournament matching");
  });
});

// =============================================================================
// /standings
// =============================================================================

describe("/standings", () => {
  const handler = commandRegistry.get("standings")!.handler;

  it("shows standings when tournament has data", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListStandings.mockResolvedValue([
      { rank: 1, player_name: "ash_ketchum", wins: 5, losses: 1 },
      { rank: 2, player_name: "misty", wins: 4, losses: 2 },
    ]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Standings");
    expect(embed.title).toContain("Spring Cup");
    expect(embed.description).toContain("ash_ketchum");
    expect(embed.description).toContain("5-1");
    expect(embed.description).toContain(
      "communities/test-community/tournaments/spring-cup/standings"
    );
  });

  it("shows empty-state when no standings yet", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListStandings.mockResolvedValue([]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No standings yet");
  });

  it("resolves by tournament arg when supplied", async () => {
    mockGetTournamentByNameOrSlugInCommunity.mockResolvedValue(TOURNAMENT);
    mockListStandings.mockResolvedValue([
      { rank: 1, player_name: "red", wins: 3, losses: 0 },
    ]);

    await handler(
      makeCommandContext({}, [{ name: "tournament", value: "spring-cup" }])
    );

    expect(mockListStandings).toHaveBeenCalledWith(
      expect.anything(),
      TOURNAMENT.id,
      expect.any(Object)
    );
  });

  it("scopes the standings lookup to communityId", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListStandings.mockResolvedValue([]);

    await handler(makeCommandContext({ communityId: 99 }));

    expect(mockListActiveTournaments).toHaveBeenCalledWith(
      expect.anything(),
      99
    );
  });

  it("shows no-tournament message when no active tournament", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No active tournaments");
  });
});

// =============================================================================
// /pairings
// =============================================================================

describe("/pairings", () => {
  const handler = commandRegistry.get("pairings")!.handler;

  it("shows round pairings when data exists", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListCurrentPairings.mockResolvedValue({
      roundNumber: 3,
      pairings: [
        {
          table_number: 1,
          player1_name: "ash",
          player2_name: "misty",
          is_bye: false,
        },
        {
          table_number: 2,
          player1_name: "gary",
          player2_name: null,
          is_bye: true,
        },
      ],
    });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Round 3 Pairings");
    expect(embed.title).toContain("Spring Cup");
    expect(embed.description).toContain("ash");
    expect(embed.description).toContain("BYE");
    expect(embed.description).toContain(
      "communities/test-community/tournaments/spring-cup/bracket"
    );
  });

  it("shows no-pairings message when round is null", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListCurrentPairings.mockResolvedValue({
      roundNumber: null,
      pairings: [],
    });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No pairings posted yet");
  });

  it("shows no-pairings message when pairings array is empty", async () => {
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);
    mockListCurrentPairings.mockResolvedValue({ roundNumber: 1, pairings: [] });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No pairings posted yet");
  });

  it("scopes tournament resolution to communityId", async () => {
    mockListActiveTournaments.mockResolvedValue([]);

    await handler(makeCommandContext({ communityId: 7 }));

    expect(mockListActiveTournaments).toHaveBeenCalledWith(
      expect.anything(),
      7
    );
  });
});

// =============================================================================
// /events
// =============================================================================

describe("/events", () => {
  const handler = commandRegistry.get("events")!.handler;

  it("lists upcoming tournaments", async () => {
    mockListUpcomingTournaments.mockResolvedValue([
      { ...TOURNAMENT, status: "upcoming", start_date: "2026-06-01" },
    ]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toBe("Upcoming Events");
    expect(embed.description).toContain("Spring Cup");
    expect(embed.description).toContain("VGC 2025");
    expect(embed.description).toContain("communities/test-community");
  });

  it("shows empty-state when no upcoming tournaments", async () => {
    mockListUpcomingTournaments.mockResolvedValue([]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No upcoming tournaments");
  });

  it("scopes the tournament list to communityId", async () => {
    mockListUpcomingTournaments.mockResolvedValue([]);

    await handler(makeCommandContext({ communityId: 55 }));

    expect(mockListUpcomingTournaments).toHaveBeenCalledWith(
      expect.anything(),
      55,
      expect.any(Object)
    );
  });
});

// =============================================================================
// /player
// =============================================================================

describe("/player", () => {
  const handler = commandRegistry.get("player")!.handler;

  it("shows player profile when found", async () => {
    mockGetPlayerByUsername.mockResolvedValue({
      userId: "user-abc",
      altId: 1,
      username: "ash_ketchum",
      country: "JP",
    });
    mockGetPlayerCommunityStats.mockResolvedValue({
      wins: 10,
      losses: 3,
      tournamentsPlayed: 2,
      lastPlayedAt: "2026-03-15T00:00:00Z",
    });

    await handler(
      makeCommandContext({}, [{ name: "username", value: "ash_ketchum" }])
    );

    const embed = getCalledEmbed();
    expect(embed.title).toBe("ash_ketchum");
    expect(embed.description).toContain("10-3");
    expect(embed.description).toContain("Tournaments played:** 2");
    expect(embed.description).toContain("players/ash_ketchum");
  });

  it("shows not-found message when player does not exist", async () => {
    mockGetPlayerByUsername.mockResolvedValue(null);

    await handler(
      makeCommandContext({}, [{ name: "username", value: "unknown" }])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No player found");
    expect(embed.description).toContain("unknown");
  });

  it("requires a username argument", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("Please provide a username");
  });

  it("scopes community stats to communityId", async () => {
    mockGetPlayerByUsername.mockResolvedValue({
      userId: "user-abc",
      altId: 1,
      username: "ash_ketchum",
      country: null,
    });
    mockGetPlayerCommunityStats.mockResolvedValue({
      wins: 0,
      losses: 0,
      tournamentsPlayed: 0,
      lastPlayedAt: null,
    });

    await handler(
      makeCommandContext({ communityId: 88 }, [
        { name: "username", value: "ash_ketchum" },
      ])
    );

    expect(mockGetPlayerCommunityStats).toHaveBeenCalledWith(
      expect.anything(),
      "user-abc",
      88
    );
  });
});

// =============================================================================
// /leaderboard
// =============================================================================

describe("/leaderboard", () => {
  const handler = commandRegistry.get("leaderboard")!.handler;

  it("shows top 10 leaderboard entries", async () => {
    mockListCommunityLeaderboard.mockResolvedValue([
      { rank: 1, player_name: "red", rating: 0, wins: 8, losses: 0 },
      { rank: 2, player_name: "blue", rating: 0, wins: 7, losses: 1 },
    ]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Leaderboard");
    expect(embed.description).toContain("red");
    expect(embed.description).toContain("8-0");
    expect(embed.description).toContain(
      "communities/test-community#leaderboard"
    );
  });

  it("shows empty-state when no leaderboard data", async () => {
    mockListCommunityLeaderboard.mockResolvedValue([]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No data yet");
  });

  it("uses all-time scope when scope arg is 'all-time'", async () => {
    mockListCommunityLeaderboard.mockResolvedValue([]);

    await handler(
      makeCommandContext({}, [{ name: "scope", value: "all-time" }])
    );

    expect(mockListCommunityLeaderboard).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Number),
      expect.objectContaining({ scope: "all-time" })
    );
    const embed = getCalledEmbed();
    expect(embed.title).toContain("All-Time");
  });

  it("defaults to current scope when no scope arg", async () => {
    mockListCommunityLeaderboard.mockResolvedValue([]);

    await handler(makeCommandContext());

    expect(mockListCommunityLeaderboard).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Number),
      expect.objectContaining({ scope: "current" })
    );
    const embed = getCalledEmbed();
    expect(embed.title).toContain("Current");
  });

  it("scopes to communityId", async () => {
    mockListCommunityLeaderboard.mockResolvedValue([]);

    await handler(makeCommandContext({ communityId: 33 }));

    expect(mockListCommunityLeaderboard).toHaveBeenCalledWith(
      expect.anything(),
      33,
      expect.any(Object)
    );
  });
});

// =============================================================================
// /team
// =============================================================================

describe("/team", () => {
  const handler = commandRegistry.get("team")!.handler;

  it("shows another player's team when player arg provided", async () => {
    mockGetPlayerByUsername.mockResolvedValue({
      userId: "user-pikachu",
      altId: 5,
      username: "ash_ketchum",
      country: null,
    });
    mockGetPublicTeamForCommunity.mockResolvedValue({
      teamId: 100,
      teamName: "Rain Team",
      tournamentId: 10,
      tournamentName: "Spring Cup",
      tournamentSlug: "spring-cup",
    });

    await handler(
      makeCommandContext({}, [{ name: "player", value: "ash_ketchum" }])
    );

    const embed = getCalledEmbed();
    expect(embed.title).toContain("ash_ketchum");
    expect(embed.description).toContain("Spring Cup");
    expect(embed.description).toContain("Rain Team");
    expect(embed.description).toContain("spring-cup/team-sheets");
  });

  it("shows not-found when player does not exist", async () => {
    mockGetPlayerByUsername.mockResolvedValue(null);

    await handler(
      makeCommandContext({}, [{ name: "player", value: "unknown" }])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No player found");
  });

  it("shows own team when no player arg and user is linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-me" });
    mockGetPublicTeamForCommunity.mockResolvedValue({
      teamId: 200,
      teamName: null,
      tournamentId: 10,
      tournamentName: "Spring Cup",
      tournamentSlug: "spring-cup",
    });

    await handler(makeCommandContext());

    expect(mockGetPublicTeamForCommunity).toHaveBeenCalledWith(
      expect.anything(),
      "user-me",
      42
    );
    const embed = getCalledEmbed();
    expect(embed.title).toContain("Your Team");
  });

  it("prompts to link account when no player arg and user is not linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue(null);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("isn't linked");
    expect(embed.description).toContain("/link");
  });

  it("shows no-team message when user has not submitted a team", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-me" });
    mockGetPublicTeamForCommunity.mockResolvedValue(null);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("haven't submitted a team");
  });

  it("scopes team lookup to communityId", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-me" });
    mockGetPublicTeamForCommunity.mockResolvedValue(null);

    await handler(makeCommandContext({ communityId: 77 }));

    expect(mockGetPublicTeamForCommunity).toHaveBeenCalledWith(
      expect.anything(),
      "user-me",
      77
    );
  });
});

// =============================================================================
// /link
// =============================================================================

describe("/link", () => {
  const handler = commandRegistry.get("link")!.handler;

  it("replies with an embed containing the link URL", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Link your Discord account");
    expect(embed.description).toContain(
      "/dashboard/settings/account?link=discord"
    );
  });
});

// =============================================================================
// /help
// =============================================================================

describe("/help", () => {
  const handler = commandRegistry.get("help")!.handler;

  it("replies with the full command reference embed", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Beanie Bot");
    expect(embed.description).toContain("/tournament");
    expect(embed.description).toContain("/standings");
    expect(embed.description).toContain("/pairings");
    expect(embed.description).toContain("/player");
    expect(embed.description).toContain("/team");
    expect(embed.description).toContain("/leaderboard");
    expect(embed.description).toContain("/drop");
    expect(embed.description).toContain("/link");
    expect(embed.description).toContain("/setchannel");
    expect(embed.description).toContain("/unsetchannel");
    expect(embed.description).toContain("/channels");
  });
});

// =============================================================================
// /drop
// =============================================================================

describe("/drop", () => {
  const handler = commandRegistry.get("drop")!.handler;

  it("prompts to link when user is not linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue(null);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("isn't linked");
    expect(embed.description).toContain("/link");
  });

  it("shows no-tournament message when no active tournament", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockListActiveTournaments.mockResolvedValue([]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("No active tournaments");
  });

  it("shows no-alt message when user has no alt", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    // alts query returns null
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("don't have a player profile");
  });

  it("shows not-registered message when user is not in the tournament", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    // alts returns id=1
    mockFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: 1 }, error: null }),
      })
      // registration query returns null
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("not registered");
    expect(embed.description).toContain("Spring Cup");
  });

  it("shows already-dropped message when registration is already dropped", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    mockFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: 1 }, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({
            data: { id: 10, status: "dropped" },
            error: null,
          }),
      });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("already dropped");
  });

  it("successfully drops a registered player", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockListActiveTournaments.mockResolvedValue([TOURNAMENT]);

    const eqFn = jest.fn().mockReturnThis();

    mockFrom
      // alts query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: 1 }, error: null }),
      })
      // registration query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({
            data: { id: 10, status: "active" },
            error: null,
          }),
      })
      // tournament_player_stats update
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: eqFn,
        then: jest
          .fn()
          .mockImplementation((resolve: (v: unknown) => void) =>
            Promise.resolve({ error: null }).then(resolve)
          ),
      })
      // tournament_registrations update
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation((resolve: (v: unknown) => void) =>
            Promise.resolve({ error: null }).then(resolve)
          ),
      });

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Dropped from tournament");
    expect(embed.description).toContain("Spring Cup");
    expect(embed.description).toContain("spring-cup");
  });
});

// =============================================================================
// /setchannel
// =============================================================================

describe("/setchannel", () => {
  const handler = commandRegistry.get("setchannel")!.handler;

  it("requires an event_type argument", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("Please specify an event type");
  });

  it("returns not-linked error when server is not linked", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(null);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain(
      "not linked to a trainers.gg community"
    );
  });

  it("requires community-leader permission", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(false);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("community leader");
  });

  it("maps channel to event type for a community leader", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockUpsertChannelMapping.mockResolvedValue(undefined);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    expect(mockUpsertChannelMapping).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        discord_server_id: SERVER.id,
        event_type: "tournament_started",
      })
    );
    const embed = getCalledEmbed();
    expect(embed.title).toContain("Channel mapped");
    expect(embed.description).toContain("tournament_started");
  });
});

// =============================================================================
// /unsetchannel
// =============================================================================

describe("/unsetchannel", () => {
  const handler = commandRegistry.get("unsetchannel")!.handler;

  it("requires an event_type argument", async () => {
    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("Please specify an event type");
  });

  it("returns not-linked error when server is not linked", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(null);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("not linked");
  });

  it("requires community-leader permission", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(false);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("community leader");
  });

  it("shows not-mapped message when channel is not mapped to the event type", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockGetChannelMappingsForEvent.mockResolvedValue([
      // Different channel_id from the interaction's channel_id="channel-456"
      {
        id: 99,
        channel_id: "different-channel",
        event_type: "tournament_started",
      },
    ]);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    const embed = getCalledEmbed();
    expect(embed.description).toContain("not mapped");
  });

  it("removes the channel mapping for a community leader", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockGetChannelMappingsForEvent.mockResolvedValue([
      { id: 7, channel_id: "channel-456", event_type: "tournament_started" },
    ]);
    mockDeleteChannelMapping.mockResolvedValue(undefined);

    await handler(
      makeCommandContext({}, [
        { name: "event_type", value: "tournament_started" },
      ])
    );

    expect(mockDeleteChannelMapping).toHaveBeenCalledWith(expect.anything(), 7);
    const embed = getCalledEmbed();
    expect(embed.title).toContain("Channel mapping removed");
    expect(embed.description).toContain("tournament_started");
  });
});

// =============================================================================
// /channels
// =============================================================================

describe("/channels", () => {
  const handler = commandRegistry.get("channels")!.handler;

  it("returns not-linked error when server is not linked", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(null);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain(
      "not linked to a trainers.gg community"
    );
  });

  it("requires community-leader permission", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(false);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.description).toContain("community leader");
  });

  it("shows empty-state when no mappings configured", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockListChannelMappings.mockResolvedValue([]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Channel Mappings");
    expect(embed.description).toContain("No channels configured");
  });

  it("lists all channel mappings for a community leader", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(SERVER);
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-abc" });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockListChannelMappings.mockResolvedValue([
      { id: 1, channel_id: "ch-111", event_type: "tournament_started" },
      { id: 2, channel_id: "ch-222", event_type: "match_ready" },
    ]);

    await handler(makeCommandContext());

    const embed = getCalledEmbed();
    expect(embed.title).toContain("Channel Mappings");
    expect(embed.description).toContain("ch-111");
    expect(embed.description).toContain("tournament_started");
    expect(embed.description).toContain("ch-222");
    expect(embed.description).toContain("match_ready");
  });
});
