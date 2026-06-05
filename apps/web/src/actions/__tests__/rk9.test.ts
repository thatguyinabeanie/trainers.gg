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
  parseArchivedEventsPage: jest.fn(),
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

const mockComputeEventUsage = jest.fn().mockResolvedValue(undefined);
jest.mock("@trainers/supabase", () => ({
  computeEventUsage: (...args: unknown[]) => mockComputeEventUsage(...args),
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

  it("returns done:true with total:0 when no standings exist for the event", async () => {
    standingsChain = makeChain(() => ({ data: [], error: null }));

    const { scrapeRk9TeamsBatch } = await import("../rk9");
    const result = await scrapeRk9TeamsBatch("EVT001");

    expect(result.success).toBe(true);
    expect(result.done).toBe(true);
    expect(result.total).toBe(0);
    expect(result.scraped).toBe(0);
  });

  it("returns done:true when all standings already have team_scrape_attempted_at set", async () => {
    const attemptedAt = new Date().toISOString();
    standingsChain = makeChain(() => ({
      data: [
        {
          id: 1,
          roster_entry_id: "r1",
          team_scrape_attempted_at: attemptedAt,
        },
        {
          id: 2,
          roster_entry_id: "r2",
          team_scrape_attempted_at: attemptedAt,
        },
      ],
      error: null,
    }));
    // team_pokemon query for counting — no rows means status stays "teams"
    teamPokemonChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));

    const { scrapeRk9TeamsBatch } = await import("../rk9");
    const result = await scrapeRk9TeamsBatch("EVT001", { force: false });

    expect(result.success).toBe(true);
    expect(result.done).toBe(true);
    // No new scrapes because everything was already attempted
    expect(mockParseTeamListPage).not.toHaveBeenCalled();
  });

  it("fires computeEventUsage on completion even when not all players published a team (allImported=false)", async () => {
    // One standing with no team (empty parse result) → allImported will be false
    // because team_pokemon has no rows for that standing, but the import is
    // fully attempted (the standing has been processed this tick).
    mockParseTeamListPage.mockReturnValue([]);
    // team_pokemon returns no rows (player didn't publish) — allImported = false
    teamPokemonChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));

    const { scrapeRk9TeamsBatch } = await import("../rk9");
    const result = await scrapeRk9TeamsBatch("EVT001");

    expect(result.success).toBe(true);
    expect(result.done).toBe(true);
    // Even though allImported is false (0 team_pokemon rows out of 1 total),
    // computeEventUsage must still be called because the import is fully attempted.
    expect(mockComputeEventUsage).toHaveBeenCalledWith(
      expect.anything(),
      "rk9",
      "EVT001"
    );
  });

  it("does NOT re-fire computeEventUsage on a redundant re-tick when all standings were already attempted", async () => {
    // All standings already have team_scrape_attempted_at set → toProcess is
    // empty → the action enters the early-return completion block.
    // alreadyScraped === total so the transition guard prevents re-firing.
    const attemptedAt = new Date().toISOString();
    standingsChain = makeChain(() => ({
      data: [
        {
          id: 1,
          roster_entry_id: "r1",
          team_scrape_attempted_at: attemptedAt,
        },
        {
          id: 2,
          roster_entry_id: "r2",
          team_scrape_attempted_at: attemptedAt,
        },
      ],
      error: null,
    }));
    teamPokemonChain = makeChain(() => ({ data: [], error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));

    const { scrapeRk9TeamsBatch } = await import("../rk9");
    const result = await scrapeRk9TeamsBatch("EVT001", { force: false });

    expect(result.success).toBe(true);
    expect(result.done).toBe(true);
    // Guard: alreadyScraped === total means no work happened this tick →
    // computeEventUsage must NOT be called (already settled event, avoid recompute).
    expect(mockComputeEventUsage).not.toHaveBeenCalled();
  });
});

describe("discoverRk9Events", () => {
  it("returns success:false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const mod = await import("../rk9");
    const result = await mod.discoverRk9Events();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /not authenticated/i
    );
  });

  it("returns success:false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const mod = await import("../rk9");
    const result = await mod.discoverRk9Events();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /requires site admin/i
    );
  });

  it("returns success:true and events when live and archive fetches succeed", async () => {
    const { parseEventsPage, parseArchivedEventsPage } = jest.requireMock(
      "@/lib/rk9/scraper"
    );
    const { syncEvents } = jest.requireMock("@/lib/rk9/index");

    parseEventsPage.mockReturnValueOnce([
      {
        eventId: "evt-live-1",
        name: "Live Event",
        tier: "regional",
        dateStart: "2024-01-01",
        dateEnd: "2024-01-02",
        dateRaw: "",
        section: "current",
        locationCity: null,
        locationCountry: null,
      },
    ]);
    // Archive snapshots will call parseArchivedEventsPage multiple times
    // (once per snapshot). Return one event on the first call, empty after.
    parseArchivedEventsPage.mockReturnValueOnce([
      {
        eventId: "evt-arch-1",
        name: "Archive Event",
        tier: "regional",
        dateStart: "2023-01-01",
        dateEnd: "2023-01-02",
        dateRaw: "",
        section: "past",
        locationCity: null,
        locationCountry: null,
      },
    ]);
    parseArchivedEventsPage.mockReturnValue([]);
    syncEvents.mockResolvedValueOnce({ synced: 2, total: 2 });

    // CDX call needs json(), HTML calls need text()
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("cdx")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => [
            ["timestamp", "statuscode"],
            ["20240101120000", "200"],
          ],
          headers: { get: () => null },
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html></html>",
        headers: { get: () => null },
      });
    });

    const mod = await import("../rk9");
    const result = await mod.discoverRk9Events();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.events).toBeDefined();
      expect(result.events!.length).toBeGreaterThan(0);
      expect(result.sources!.live).toBe(1);
    }
  });

  it("returns success:false when no events found from any source", async () => {
    const { parseEventsPage, parseArchivedEventsPage } = jest.requireMock(
      "@/lib/rk9/scraper"
    );

    parseEventsPage.mockReturnValue([]);
    parseArchivedEventsPage.mockReturnValue([]);

    // CDX returns no snapshots, so only fallback snapshots are used,
    // but parseArchivedEventsPage returns [] for all of them.
    mockFetch.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("cdx")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          // Only header row — no data snapshots
          json: async () => [["timestamp", "statuscode"]],
          headers: { get: () => null },
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "<html></html>",
        headers: { get: () => null },
      });
    });

    const mod = await import("../rk9");
    const result = await mod.discoverRk9Events();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /no events/i
    );
  });
});

describe("scrapeRk9Roster", () => {
  it("returns success:false when not authenticated", async () => {
    const { getUserId } = jest.requireMock("@/lib/supabase/server");
    getUserId.mockResolvedValueOnce(null);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9Roster("EVT001");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /not authenticated/i
    );
  });

  it("returns success:false when not site admin", async () => {
    const { isSiteAdmin } = jest.requireMock("@/lib/sudo/server");
    isSiteAdmin.mockResolvedValueOnce(false);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9Roster("EVT001");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /requires site admin/i
    );
  });

  it("returns success:true with playerCount when roster import succeeds", async () => {
    const { parseRosterPage, formatDetectionNeedsHtml } = jest.requireMock(
      "@/lib/rk9/scraper"
    );
    const { importEvent } = jest.requireMock("@/lib/rk9/index");

    // Skip the HTML-based format detection path (simpler mock path)
    formatDetectionNeedsHtml.mockReturnValueOnce(false);

    parseRosterPage.mockReturnValueOnce([
      {
        playerIdMasked: "p1...",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "US",
        trainerName: "PikachuTrainer",
        division: "masters",
        placement: 1,
        rosterEntryId: "r1",
      },
    ]);

    importEvent.mockResolvedValueOnce({
      standingsInserted: 1,
      playersUpserted: 1,
      teamsInserted: 0,
      pokemonInserted: 0,
      eventId: "EVT001",
    });

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9Roster("EVT001");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.playerCount).toBe(1);
    }
  });

  it("returns success:false when HTTP fetch for roster fails", async () => {
    const { formatDetectionNeedsHtml } = jest.requireMock("@/lib/rk9/scraper");
    formatDetectionNeedsHtml.mockReturnValueOnce(false);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "",
    });

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9Roster("EVT001");

    expect(result.success).toBe(false);
    // fetchRk9Html throws "HTTP 500: Server Error"; getErrorMessage extracts that message
    expect((result as { success: false; error: string }).error).toMatch(
      /HTTP 500|failed to scrape roster/i
    );
  });
});

describe("scrapeRk9TeamForStanding — species map and normalizeSpeciesInline", () => {
  beforeEach(() => {
    standingsChain = makeChain(() => ({ data: null, error: null }));
    teamPokemonChain = makeChain(() => ({ data: null, error: null }));
    eventsUpdateChain = makeChain(() => ({ data: null, error: null }));
  });

  it("uses species_map row slug when available", async () => {
    // Provide a species_map row that maps "Pikachu" to a custom slug
    speciesMapChain = makeChain(() => ({
      data: [{ raw_name: "Pikachu", species_slug: "pikachu-override" }],
      error: null,
    }));
    mockParseTeamListPage.mockReturnValueOnce([
      {
        speciesRaw: "Pikachu",
        ability: "Static",
        heldItem: "Light Ball",
        teraType: "Electric",
        statAlignment: null,
        moves: ["Thunderbolt"],
      },
    ]);

    const mod = await import("../rk9");
    const result = await mod.scrapeRk9TeamForStanding("EVT001", 1, "entry1");

    expect(result.success).toBe(true);
    // Ensure the upsert was called with the mapped slug
    expect(teamPokemonChain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ species: "pikachu-override" }),
      ]),
      expect.anything()
    );
  });

  it.each([
    // formMap hits — known form keys
    ["Rotom [Heat Rotom]", "rotom-heat"],
    ["Urshifu [Rapid Strike Style]", "urshifu-rapid-strike"],
    ["Giratina [Origin Forme]", "giratina-origin"],
    ["Ogerpon [Hearthflame Mask]", "ogerpon-hearthflame"],
    // skipForms — returns base species without suffix
    ["Landorus [Incarnate Forme]", "landorus"],
    ["Tornadus [Incarnate Forme]", "tornadus"],
    // Empty formMap value (single-strike style) — base species only
    ["Urshifu [Single Strike Style]", "urshifu"],
    // sluggedForm fallback — form not in formMap, not in skipForms
    ["Maushold [Family of Three]", "maushold-family-of-three"],
  ])(
    "normalizes bracketed form '%s' to slug '%s'",
    async (speciesRaw, expectedSlug) => {
      speciesMapChain = makeChain(() => ({ data: [], error: null }));
      mockParseTeamListPage.mockReturnValueOnce([
        {
          speciesRaw,
          ability: null,
          heldItem: null,
          teraType: null,
          statAlignment: null,
          moves: [],
        },
      ]);

      const mod = await import("../rk9");
      const result = await mod.scrapeRk9TeamForStanding(
        "EVT001",
        1,
        "entry1"
      );

      expect(result.success).toBe(true);
      expect(teamPokemonChain.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ species: expectedSlug }),
        ]),
        expect.anything()
      );
    }
  );
});
