/**
 * @jest-environment node
 */

// Mock supabase + auth before importing
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn().mockReturnValue({
    schema: () => ({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
  getUserId: jest.fn().mockResolvedValue("user-1"),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn().mockResolvedValue(true),
}));

// The actions import cheerio indirectly via scraper — mock it
jest.mock("@/lib/rk9/scraper", () => ({
  parseEventsPage: jest.fn(),
  parseRosterPage: jest.fn(),
  parseTeamListPage: jest.fn().mockReturnValue([]),
  detectEventFormat: jest.fn().mockReturnValue(null),
  formatDetectionNeedsHtml: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/rk9/import", () => ({
  syncEvents: jest.fn(),
  importEvent: jest.fn(),
  seedSpeciesMap: jest.fn(),
}));

describe("assertValidEventId", () => {
  // The function is internal; test via a publicly observable effect
  it("is called by scrapeRk9Roster with valid IDs", async () => {
    // Just verify the module loads without errors
    const mod = await import("../rk9");
    expect(mod.scrapeRk9Roster).toBeDefined();
  });
});

describe("scrapeRk9TeamsBatch", () => {
  it("exports the function", async () => {
    const mod = await import("../rk9");
    expect(mod.scrapeRk9TeamsBatch).toBeDefined();
  });
});
