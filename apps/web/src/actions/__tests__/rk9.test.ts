/**
 * @jest-environment node
 */

type Thenable = Promise<{ data: unknown; error: unknown }> & {
  [key: string]: jest.Mock | unknown;
};

// Helper to make any chainable also thenable, with a configurable resolve
function makeChain(resolve: () => { data: unknown; error: unknown }): Thenable {
  const chain: Record<string, unknown> = {};
  const passthroughMethods = [
    "select",
    "update",
    "insert",
    "upsert",
    "delete",
    "eq",
    "neq",
    "not",
    "in",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
  ];
  for (const m of passthroughMethods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Make the chain itself thenable so awaiting the last link works
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled);
  return chain as Thenable;
}

let standingsChain: Thenable;
let teamPokemonChain: Thenable;
let speciesMapChain: Thenable;
let eventsUpdateChain: Thenable;

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn().mockImplementation(() => ({
    schema: jest.fn().mockImplementation((_schema: string) => ({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "standings") return standingsChain;
        if (table === "team_pokemon") {
          // The action first calls select().in(), then later insert() — return
          // a single chain; the action awaits whatever the last method returns
          // and we just need the resolved data/error to be sane.
          return teamPokemonChain;
        }
        if (table === "species_map") return speciesMapChain;
        if (table === "events") return eventsUpdateChain;
        return makeChain(() => ({ data: null, error: null }));
      }),
    })),
  })),
  getUserId: jest.fn().mockResolvedValue("user-1"),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn().mockResolvedValue(true),
}));

const mockParseTeamListPage = jest.fn();
jest.mock("@/lib/rk9/scraper", () => ({
  parseEventsPage: jest.fn(),
  parseRosterPage: jest.fn(),
  parseTeamListPage: (...args: unknown[]) => mockParseTeamListPage(...args),
  detectEventFormat: jest.fn().mockReturnValue(null),
  formatDetectionNeedsHtml: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/rk9/index", () => ({
  ...jest.requireActual("@/lib/rk9/index"),
  syncEvents: jest.fn(),
  importEvent: jest.fn(),
  seedSpeciesMap: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/actions/site-config", () => ({
  getSiteConfig: jest.fn().mockResolvedValue({ success: false, error: "not set" }),
}));

// fetch needs to be mocked because the action does real HTTP requests
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: "OK",
  text: () => Promise.resolve("<html></html>"),
});
(global as unknown as { fetch: jest.Mock }).fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockParseTeamListPage.mockReturnValue([]);
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve("<html></html>"),
  });

  // Default: one standing with a roster_entry_id, no existing teams
  standingsChain = makeChain(() => ({
    data: [{ id: 1, roster_entry_id: "r1" }],
    error: null,
  }));
  teamPokemonChain = makeChain(() => ({ data: [], error: null }));
  speciesMapChain = makeChain(() => ({ data: [], error: null }));
  eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
});

describe("assertValidEventId", () => {
  it("exports scrapeRk9Roster", async () => {
    const mod = await import("../rk9");
    expect(mod.scrapeRk9Roster).toBeDefined();
  });
});

describe("scrapeRk9TeamForStanding", () => {
  beforeEach(() => {
    standingsChain = makeChain(() => ({ data: null, error: null }));
    teamPokemonChain = makeChain(() => ({ data: null, error: null }));
    speciesMapChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
    mockParseTeamListPage.mockReturnValue([]);
  });

  it("returns success: false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /not authenticated/i
    );
  });

  it("returns success: false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /requires site admin/i
    );
  });

  it("returns success: true when pokemon list is empty (player opted out)", async () => {
    mockParseTeamListPage.mockReturnValueOnce([]);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(true);
  });

  it("upserts parsed pokemon rows and returns success: true", async () => {
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        teraType: "Electric",
        ability: "Static",
        heldItem: "Light Ball",
        statAlignment: "Timid",
        moves: ["Thunderbolt", "Volt Switch", "Protect", "Fake Out"],
      },
    ]);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(true);
    // Verify the attempt timestamp was stamped on the standing
    expect(standingsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ team_scrape_attempted_at: expect.any(String) })
    );
  });

  it("returns success: false when upsert fails", async () => {
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        teraType: null,
        ability: "Static",
        heldItem: "Light Ball",
        statAlignment: null,
        moves: [],
      },
    ]);
    teamPokemonChain = makeChain(() => ({
      data: null,
      error: { message: "unique violation" },
    }));

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /upsert failed/i
    );
  });
});

describe("resetRk9EventData", () => {
  beforeEach(() => {
    standingsChain = makeChain(() => ({ data: null, error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
  });

  it("returns success: false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const mod = await import("../rk9");
    const result = await mod.resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /not authenticated/i
    );
  });

  it("returns success: false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const mod = await import("../rk9");
    const result = await mod.resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /requires site admin/i
    );
  });

  it("returns success: true after deleting standings and resetting event", async () => {
    const mod = await import("../rk9");
    const result = await mod.resetRk9EventData("EVT001");

    expect(result.success).toBe(true);
    // Verify the event was actually reset to pending
    expect(eventsUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "pending",
        has_team_lists: false,
        teams_imported_count: 0,
        import_error: null,
      })
    );
  });

  it("returns success: false when standings delete fails", async () => {
    standingsChain = makeChain(() => ({
      data: null,
      error: { message: "delete failed" },
    }));

    const mod = await import("../rk9");
    const result = await mod.resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
    // The action throws the raw standingsErr object; getErrorMessage extracts
    // its .message field, which is "delete failed" from the mock.
    expect((result as { success: false; error: string }).error).toMatch(
      /delete failed/i
    );
  });

  it("returns success: false when event status update fails", async () => {
    eventsUpdateChain = makeChain(() => ({
      data: null,
      error: { message: "update failed" },
    }));

    const mod = await import("../rk9");
    const result = await mod.resetRk9EventData("EVT001");

    expect(result.success).toBe(false);
  });
});

describe("scrapeRk9TeamsBatch", () => {
  it("exports the function", async () => {
    const mod = await import("../rk9");
    expect(mod.scrapeRk9TeamsBatch).toBeDefined();
  });

  it("counts scraped teams when parseTeamListPage returns pokemon", async () => {
    // parseTeamListPage returns 1 pokemon → hits the if-branch batchScraped++
    mockParseTeamListPage.mockReturnValue([
      {
        speciesRaw: "Pikachu",
        ability: "Static",
        heldItem: "Light Ball",
        teraType: "Electric",
        moves: ["Thunderbolt"],
      },
    ]);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamsBatch("evt-1");

    expect(result.success).toBe(true);
    expect(result.scraped).toBe(1);
  });

  it("counts scraped teams when parseTeamListPage returns an empty list", async () => {
    // Empty array → hits the else-branch batchScraped++ (line 543)
    mockParseTeamListPage.mockReturnValue([]);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamsBatch("evt-1");

    expect(result.success).toBe(true);
    expect(result.scraped).toBe(1);
  });

  it("re-scrapes standings with force=true even when team_scrape_attempted_at is set", async () => {
    const attemptedAt = new Date().toISOString();
    standingsChain = makeChain(() => ({
      data: [
        {
          id: 1,
          roster_entry_id: "entry1",
          team_scrape_attempted_at: attemptedAt,
        },
      ],
      error: null,
    }));
    speciesMapChain = makeChain(() => ({ data: [], error: null }));
    teamPokemonChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
    mockParseTeamListPage.mockReturnValueOnce([]);

    const { scrapeRk9TeamsBatch } = await import("../rk9");
    const result = await scrapeRk9TeamsBatch("EVT001", {
      force: true,
    });

    // With force=true, the standing should be processed (not skipped because attempted_at is set)
    expect(result.success).toBe(true);
    // Verify the standing was actually processed, not skipped
    expect(mockParseTeamListPage).toHaveBeenCalled();
  });
});
