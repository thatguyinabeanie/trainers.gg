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
    "eq",
    "neq",
    "not",
    "in",
    "order",
    "limit",
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
});
