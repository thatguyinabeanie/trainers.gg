/**
 * @jest-environment node
 *
 * Tests for processRk9Queue — the cron-driven queue drain loop in worker.ts.
 *
 * Mock strategy:
 * - Supabase: thenable-chain mocks for the pick / claim / attempts / count
 *   queries that processRk9Queue issues, plus all queries from the internal
 *   runRosterStage and runTeamsBatch helpers (which cannot be mocked at the
 *   module-export level because processRk9Queue calls them as intra-module
 *   function references, not through the exports object).
 * - global.fetch: mocked to return roster HTML or throw for team-list paths,
 *   giving us control over the HTTP layer without touching the implementation.
 * - @trainers/data-sources (importEvent / seedSpeciesMap) and
 *   @/lib/rk9/scraper (parseRosterPage / parseTeamListPage / detectEventFormat /
 *   formatDetectionNeedsHtml) are stubbed at the module level so real network /
 *   parse logic never runs.
 * - jest.useFakeTimers() is used per-test to advance the sleep(DELAY_ROSTER_MS)
 *   call inside runRosterStage without waiting a real second.
 */

// =============================================================================
// Types
// =============================================================================

type Thenable = Promise<{ data: unknown; error: unknown; count?: number }> & {
  [key: string]: jest.Mock | unknown;
};

// =============================================================================
// Chain factory
// =============================================================================

/**
 * Build a Supabase query chain mock where every builder method returns `this`
 * and the chain is thenable — awaiting it calls `resolve()`.
 */
function makeChain(
  resolve: () => { data: unknown; error: unknown; count?: number }
): Thenable {
  const chain: Record<string, unknown> = {};
  const passThroughMethods = [
    "select",
    "update",
    "insert",
    "upsert",
    "delete",
    "eq",
    "neq",
    "not",
    "in",
    "or",
    "lte",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
  ];
  for (const m of passThroughMethods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled);
  return chain as Thenable;
}

// =============================================================================
// Mock declarations — BEFORE imports (Jest hoisting requires this)
// =============================================================================

// Stubs so the actual module resolution doesn't fail and importEvent is
// controllable per-test via the mockImportEvent reference.
const mockImportEvent = jest.fn();
jest.mock("@trainers/data-sources", () => ({
  importEvent: (...args: unknown[]) => mockImportEvent(...args),
  seedSpeciesMap: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@trainers/supabase", () => ({
  compileSourceTeamSlots: jest.fn(),
}));

// parseTeamListPage returns an empty list so runTeamsBatch marks standings as
// attempted but records no pokemon rows (scraped=1, rows=[]).
const mockFormatDetectionNeedsHtml = jest.fn();
jest.mock("@/lib/rk9/scraper", () => ({
  parseRosterPage: jest.fn().mockReturnValue([]),
  parseTeamListPage: jest.fn().mockReturnValue([]),
  detectEventFormat: jest.fn().mockReturnValue(null),
  formatDetectionNeedsHtml: (...args: unknown[]) =>
    mockFormatDetectionNeedsHtml(...args),
}));

// =============================================================================
// Imports — after mocks
// =============================================================================

import {
  processRk9Queue,
  buildRk9Url,
  runTeamsBatch,
  runRosterStage,
} from "../worker";

// =============================================================================
// Supabase chain variables — rebuilt per test in beforeEach
// =============================================================================

/**
 * For processRk9Queue, the events-table queries it issues directly are:
 *
 *  A) Primary pick:  select event_id,import_status  .eq("queued").lte.or.order.limit.maybeSingle
 *  B) Fallback pick: select event_id,import_status  .in(["roster","teams"]).or.order.limit.maybeSingle
 *  C) Claim UPDATE:  update worker_claimed_at        .eq.or.select.maybeSingle
 *  D) Attempts read: select import_attempts          .eq.maybeSingle  (queued events only)
 *  F) Count query:   select * {count,head}           .eq("queued")
 *
 * runRosterStage also issues events queries:
 *  R1) update { import_status: "roster" }             .eq
 *  R2) select date_start                              .eq.single
 *  R3) update { format_id: formatId }                 .eq  (only if formatId is non-null)
 *
 * processRk9Queue re-reads after roster:
 *  E) select import_status                            .eq.maybeSingle
 *
 * runTeamsBatch issues events queries:
 *  T1) select player_count                            .eq.maybeSingle  (only if no standings)
 *  T2) update { import_status, has_team_lists, … }    .eq
 *
 * processRk9Queue heartbeat and release:
 *  H) update { worker_claimed_at: timestamp }         .eq
 *  Z) update { worker_claimed_at: null }              .eq  (finally block)
 *
 * We use a single `eventsChain` instance for all events queries. Because
 * processRk9Queue reads the resolved `.data` / `.count` field, and the
 * chain mock resolves to a shared object, we vary what gets returned
 * across different calls with a call-order counter.
 */
let eventsCallCount = 0;
let eventsResponses: Array<{ data: unknown; error: unknown; count?: number }>;

/** Return the next response from the responses queue (or repeat the last one). */
function nextEventsResponse() {
  const resp =
    eventsResponses[eventsCallCount] ??
    eventsResponses[eventsResponses.length - 1];
  eventsCallCount++;
  return resp ?? { data: null, error: null };
}

let eventsChain: Thenable;

// Standings chain — for runTeamsBatch's pagination loop.
// Default: empty first page so runTeamsBatch exits the pagination loop immediately.
let standingsCallCount = 0;
let standingsResponses: Array<{ data: unknown; error: unknown }>;
function nextStandingsResponse() {
  const resp =
    standingsResponses[standingsCallCount] ??
    standingsResponses[standingsResponses.length - 1];
  standingsCallCount++;
  return resp ?? { data: null, error: null };
}
let standingsChain: Thenable;

// team_pokemon chain — for runTeamsBatch's upsert and count queries.
let teamPokemonChain: Thenable;

// species_map chain — for runTeamsBatch's species lookup.
let speciesMapChain: Thenable;

// =============================================================================
// beforeEach — reset all state
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  eventsCallCount = 0;
  standingsCallCount = 0;

  // Default: empty queue — all events queries return null
  eventsResponses = [{ data: null, error: null }];
  eventsChain = makeChain(() => nextEventsResponse());

  // Default: empty standings → runTeamsBatch sees no standings and exits
  standingsResponses = [{ data: null, error: null }];
  standingsChain = makeChain(() => nextStandingsResponse());

  // Default: team_pokemon returns empty (no species yet)
  teamPokemonChain = makeChain(() => ({ data: [], error: null }));

  // Default: species_map returns empty
  speciesMapChain = makeChain(() => ({ data: [], error: null }));

  // Default: importEvent succeeds
  mockImportEvent.mockResolvedValue({ standingsInserted: 1 });

  // Default: formatDetectionNeedsHtml returns false — avoids a tournament HTML fetch
  mockFormatDetectionNeedsHtml.mockReturnValue(false);

  // Default: global.fetch returns valid empty roster HTML (used by runRosterStage)
  const mockFetchResponse = {
    ok: true,
    status: 200,
    statusText: "OK",
    text: jest.fn().mockResolvedValue("<html><body></body></html>"),
  };
  global.fetch = jest.fn().mockResolvedValue(mockFetchResponse) as typeof fetch;
});

// =============================================================================
// Supabase mock builder — builds a fresh client wiring per test
// =============================================================================

/**
 * Build a supabase-like client stub that routes table queries to the
 * appropriate per-table chain. All chains are thenable and use sequential
 * response queues so tests can control exact per-call return values.
 */
function buildSupabaseMock() {
  return {
    schema: jest.fn().mockImplementation((_schema: string) => ({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "events") return eventsChain;
        if (table === "standings") return standingsChain;
        if (table === "team_pokemon") return teamPokemonChain;
        if (table === "species_map") return speciesMapChain;
        // Any other table (e.g. from future code paths) — safe no-op
        return makeChain(() => ({ data: null, error: null }));
      }),
    })),
  };
}

// =============================================================================
// Deadline helpers
// =============================================================================

const FUTURE = () => Date.now() + 60_000;
const PAST = () => Date.now() - 1;

// =============================================================================
// Tests
// =============================================================================

describe("processRk9Queue", () => {
  // ---------------------------------------------------------------------------
  // 1. Empty queue
  // ---------------------------------------------------------------------------
  describe("empty queue", () => {
    it("returns all-zero stats without touching any event", async () => {
      // Default eventsResponses = [null] → loop body runs 0 times
      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.eventsTouched).toBe(0);
      expect(result.teamsScraped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.remainingQueued).toBe(0);
    });

    it("does not call runRosterStage or runTeamsBatch when queue is empty", async () => {
      const supabase = buildSupabaseMock();

      await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      // No events table updates except possibly the final count query —
      // the update mock should never be called with import_status or claimed_at.
      const updateCalls = (eventsChain.update as jest.Mock).mock.calls as Array<
        [Record<string, unknown>]
      >;
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Deadline already expired at entry
  // ---------------------------------------------------------------------------
  describe("expired deadline", () => {
    it("returns immediately with zero work when deadline is already past", async () => {
      // Even with a queued event available, the loop guard fires before pick
      eventsResponses = [
        {
          data: { event_id: "evt-1", import_status: "queued" },
          error: null,
        },
      ];
      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: PAST(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.eventsTouched).toBe(0);
      expect(result.teamsScraped).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Contested lease — claim returns no rows
  // ---------------------------------------------------------------------------
  describe("contested lease", () => {
    it("skips the event when the claim UPDATE returns null (contested)", async () => {
      // Response sequence for events queries:
      //   [0] primary pick → returns an event (data has event_id)
      //   [1] claim update → returns null (contested)
      //   [2] next primary pick → null (queue is now empty, loop ends)
      //   [3+] count query → 0 remaining
      eventsResponses = [
        {
          data: { event_id: "evt-1", import_status: "queued" },
          error: null,
        }, // primary pick
        { data: null, error: null }, // claim → contested
        { data: null, error: null }, // next pick → empty queue
        { data: null, error: null, count: 0 }, // remaining count
      ];

      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.eventsTouched).toBe(0);
      // No update with import_status (contested → skip processing entirely)
      const updateCalls = (eventsChain.update as jest.Mock).mock.calls as Array<
        [Record<string, unknown>]
      >;
      const statusUpdates = updateCalls.filter(
        ([payload]) => "import_status" in payload
      );
      expect(statusUpdates).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. import_attempts >= 3 → give up, mark failed
  // ---------------------------------------------------------------------------
  describe("max attempts exceeded", () => {
    it("marks event failed and does not run roster stage when attempts >= 3", async () => {
      // Response sequence:
      //   [0] primary pick → queued event
      //   [1] claim update → success (event_id returned)
      //   [2] attempts read → import_attempts: 3
      //   [3] failed-status UPDATE + release → success
      //   [4] next primary pick → empty
      //   [5] fallback pick → empty (skipped if primary already null — but just in case)
      //   [6] remaining count → 0
      eventsResponses = [
        {
          data: { event_id: "evt-1", import_status: "queued" },
          error: null,
        }, // pick
        { data: { event_id: "evt-1" }, error: null }, // claim
        { data: { import_attempts: 3 }, error: null }, // attempts read
        { data: null, error: null }, // failed status UPDATE
        { data: null, error: null }, // next primary pick → empty queue
        { data: null, error: null }, // fallback pick
        { data: null, error: null, count: 0 }, // remaining count
      ];

      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.errors).toBe(1);
      // The failed-status update should have been issued
      expect(eventsChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          import_status: "failed",
          import_error: "Gave up after 3 attempts",
          worker_claimed_at: null,
        })
      );
      // No roster HTML fetch (runRosterStage was never reached)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each([
      ["exactly 3", 3],
      ["4 (beyond the threshold)", 4],
    ])(
      "gives up when attempts is %s",
      async (_label: string, attempts: number) => {
        eventsResponses = [
          {
            data: { event_id: "evt-1", import_status: "queued" },
            error: null,
          },
          { data: { event_id: "evt-1" }, error: null }, // claim
          { data: { import_attempts: attempts }, error: null }, // attempts
          { data: null, error: null }, // failed status write
          { data: null, error: null }, // next pick → empty
          { data: null, error: null }, // fallback pick
          { data: null, error: null, count: 0 },
        ];

        const supabase = buildSupabaseMock();

        await processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 25,
          concurrency: 1,
        });

        // Roster stage not reached — no fetch call
        expect(global.fetch).not.toHaveBeenCalled();
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Happy path — queued event runs roster then teams until done
  // ---------------------------------------------------------------------------
  describe("happy path (queued event)", () => {
    /**
     * Events response sequence for the standard happy path:
     *
     *  [0]  primary pick               → queued event
     *  [1]  claim UPDATE               → success
     *  [2]  attempts SELECT            → 0 attempts
     *  [3]  runRosterStage: UPDATE { import_status: "roster" }
     *  [4]  runRosterStage: SELECT date_start
     *  [5]  processRk9Queue: re-read status after roster
     *  [6]  runTeamsBatch: SELECT player_count (standings were empty)
     *  [7]  runTeamsBatch: UPDATE { import_status: "complete" }
     *  [8]  heartbeat UPDATE
     *  [9]  finally: lease release UPDATE
     *  [10] next primary pick          → empty
     *  [11] fallback pick              → empty
     *  [12] count query                → N remaining
     */
    function happyPathResponses(remainingCount = 2) {
      return [
        { data: { event_id: "evt-1", import_status: "queued" }, error: null }, // [0] primary pick
        { data: { event_id: "evt-1" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] attempts
        { data: null, error: null }, // [3] roster status update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start select
        { data: { import_status: "teams" }, error: null }, // [5] after-roster re-read
        { data: { player_count: 0 }, error: null }, // [6] player_count (empty standings)
        { data: null, error: null }, // [7] complete status update
        { data: null, error: null }, // [8] heartbeat
        { data: null, error: null }, // [9] lease release
        { data: null, error: null }, // [10] next primary pick → empty
        { data: null, error: null }, // [11] fallback pick → empty
        { data: null, error: null, count: remainingCount }, // [12] count query
      ];
    }

    it("runs roster stage then teams batch, heartbeats lease, releases on completion, increments eventsTouched", async () => {
      eventsResponses = happyPathResponses(2);

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 25,
          concurrency: 2,
        });
        await jest.runAllTimersAsync();
        const result = await promise;

        // Roster stage ran — fetch was called for the roster URL
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/roster/evt-1"),
          expect.any(Object)
        );
        // Teams stage ran — player_count was checked (standings were empty)
        expect(eventsChain.select).toHaveBeenCalledWith("player_count");
        // Event counted as touched
        expect(result.eventsTouched).toBe(1);
        // Remaining count from count query
        expect(result.remainingQueued).toBe(2);
        // Lease released (worker_claimed_at: null)
        expect(eventsChain.update).toHaveBeenCalledWith(
          expect.objectContaining({ worker_claimed_at: null })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("heartbeats worker_claimed_at with a timestamp string during teams loop", async () => {
      eventsResponses = happyPathResponses(0);

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 25,
          concurrency: 1,
        });
        await jest.runAllTimersAsync();
        await promise;

        // At least one heartbeat with a real ISO timestamp (not null)
        const updateCalls = (eventsChain.update as jest.Mock).mock
          .calls as Array<[Record<string, unknown>]>;
        const heartbeats = updateCalls.filter(
          ([payload]) =>
            typeof payload.worker_claimed_at === "string" &&
            payload.worker_claimed_at !== null &&
            !("import_status" in payload) // distinguish from status updates
        );
        expect(heartbeats.length).toBeGreaterThan(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it("calls runTeamsBatch with the correct batchSize and concurrency from opts", async () => {
      // Provide standings so runTeamsBatch actually processes them. We use
      // 3 standings with roster_entry_id set; batchSize: 50 means all 3 are
      // processed in one batch. global.fetch returns empty HTML → parseTeamListPage
      // returns [] → each standing is marked scraped (no pokemon rows).
      // We verify that all 3 standings received a team fetch call.
      const standings = [
        { id: 1, roster_entry_id: "entry-a", team_scrape_attempted_at: null },
        { id: 2, roster_entry_id: "entry-b", team_scrape_attempted_at: null },
        { id: 3, roster_entry_id: "entry-c", team_scrape_attempted_at: null },
      ];

      // standings pagination: first page has 3 entries, second page empty
      standingsResponses = [
        { data: standings, error: null }, // page 1 (offset 0)
        { data: [], error: null }, // page 2 (empty → breaks loop)
      ];

      // team_pokemon: count query (select standing_id .in([1,2,3]))
      // → return 0 rows (no pokemon imported since parseTeamListPage returns [])
      teamPokemonChain = makeChain(() => ({ data: [], error: null }));

      // Events responses for the path with real standings:
      // processRk9Queue: [0] pick, [1] claim, [2] attempts
      // runRosterStage:  [3] roster update, [4] date_start select
      // processRk9Queue: [5] after-roster re-read
      // runTeamsBatch:   [6] teams status update (has standings → update "teams")
      //                  [7] teams_imported update after processing batch
      //                  (no player_count query since standings are non-empty)
      // processRk9Queue: [8] heartbeat, [9] lease release
      // Next iteration:  [10] primary pick → empty, [11] fallback → empty
      // Count query:     [12] count
      eventsResponses = [
        { data: { event_id: "evt-1", import_status: "queued" }, error: null }, // [0]
        { data: { event_id: "evt-1" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] attempts
        { data: null, error: null }, // [3] roster update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start
        { data: { import_status: "teams" }, error: null }, // [5] re-read
        { data: null, error: null }, // [6] teams status update
        { data: null, error: null }, // [7] batch complete update
        { data: null, error: null }, // [8] heartbeat
        { data: null, error: null }, // [9] release
        { data: null, error: null }, // [10] next primary pick
        { data: null, error: null }, // [11] fallback pick
        { data: null, error: null, count: 0 }, // [12] count
      ];

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 50,
          concurrency: 4,
        });
        await jest.runAllTimersAsync();
        const result = await promise;

        // All 3 standings' entry IDs should have been fetched — confirms
        // runTeamsBatch processed them (batchSize=50 ≥ 3, so one batch sufficed).
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/teamlist/public/evt-1/entry-a"),
          expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/teamlist/public/evt-1/entry-b"),
          expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/teamlist/public/evt-1/entry-c"),
          expect.any(Object)
        );
        expect(result.eventsTouched).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. No-progress guard — 3 consecutive zero-scrape batches breaks the loop
  // ---------------------------------------------------------------------------
  describe("no-progress guard", () => {
    it("breaks out after 3 consecutive batches with scraped:0, releases lease", async () => {
      // Set up 60 standings with pending entries (team_scrape_attempted_at: null).
      // batchSize = 5, so each runTeamsBatch call processes 5. The mock always
      // returns the same 60 standings list (no real DB state change), so remaining
      // is always 60 - 0 = 60, and done = (0+5 >= 60) = false. All team fetches
      // throw, so batchScraped = 0, batchFailed = 5 each call.
      // After 3 consecutive calls with scraped = 0, the no-progress guard fires.
      const pendingStandings = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        roster_entry_id: `entry-${i}`,
        team_scrape_attempted_at: null as string | null,
      }));

      // standings always returns the full pending list (mock doesn't track state)
      standingsResponses = [
        { data: pendingStandings, error: null }, // page 1 for call 1
        { data: [], error: null }, // page 2 empty → break pagination
        { data: pendingStandings, error: null }, // page 1 for call 2
        { data: [], error: null }, // page 2 empty
        { data: pendingStandings, error: null }, // page 1 for call 3
        { data: [], error: null }, // page 2 empty
      ];

      // All team-list HTTP fetches throw — so batchScraped=0 every call
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if ((url as string).includes("/teamlist/")) {
          return Promise.reject(new Error("connection refused"));
        }
        // roster fetch → success
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("<html></html>"),
        });
      });

      // Events responses:
      // processRk9Queue: [0] pick, [1] claim, [2] attempts
      // runRosterStage:  [3] roster update, [4] date_start
      // processRk9Queue: [5] re-read status
      // runTeamsBatch call 1: [6] teams status update, [7] batch update
      // processRk9Queue heartbeat 1: [8]
      // runTeamsBatch call 2: [9] teams status update, [10] batch update
      // processRk9Queue heartbeat 2: [11]
      // runTeamsBatch call 3: [12] teams status update, [13] batch update
      // processRk9Queue heartbeat 3: [14]
      // (no-progress guard fires → new: read import_attempts, write no-progress status)
      // [15] no-progress: SELECT import_attempts
      // [16] no-progress: UPDATE { import_status, import_error, import_attempts }
      // finally: [17] lease release
      // Next iteration: [18] primary pick → empty, [19] fallback → empty
      // Count query: [20] count
      eventsResponses = [
        { data: { event_id: "evt-1", import_status: "queued" }, error: null }, // [0]
        { data: { event_id: "evt-1" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] attempts (queued stage)
        { data: null, error: null }, // [3] roster update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start
        { data: { import_status: "teams" }, error: null }, // [5] re-read
        { data: null, error: null }, // [6] teams status update (call 1)
        { data: null, error: null }, // [7] batch update (call 1)
        { data: null, error: null }, // [8] heartbeat (call 1)
        { data: null, error: null }, // [9] teams status update (call 2)
        { data: null, error: null }, // [10] batch update (call 2)
        { data: null, error: null }, // [11] heartbeat (call 2)
        { data: null, error: null }, // [12] teams status update (call 3)
        { data: null, error: null }, // [13] batch update (call 3)
        { data: null, error: null }, // [14] heartbeat (call 3)
        { data: { import_attempts: 1 }, error: null }, // [15] no-progress: read attempts (below cap → 'teams')
        { data: null, error: null }, // [16] no-progress: write status update
        { data: null, error: null }, // [17] lease release
        { data: null, error: null }, // [18] next primary pick
        { data: null, error: null }, // [19] fallback pick
        { data: null, error: null, count: 0 }, // [20] count
      ];

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 5,
          concurrency: 1,
        });
        await jest.runAllTimersAsync();
        const result = await promise;

        // Verify exactly 3 runTeamsBatch calls by counting teamlist fetches:
        // batchSize=5, 3 calls × 5 standings each = 15 fetch attempts total.
        const fetchCalls = (global.fetch as jest.Mock).mock.calls as Array<
          [string]
        >;
        const teamlistFetches = fetchCalls.filter(([url]) =>
          url.includes("/teamlist/")
        );
        expect(teamlistFetches).toHaveLength(15);

        // Lease should be released (worker_claimed_at: null)
        expect(eventsChain.update).toHaveBeenCalledWith(
          expect.objectContaining({ worker_claimed_at: null })
        );
        // Event counts as touched (we entered the event processing body)
        expect(result.eventsTouched).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    // -------------------------------------------------------------------------
    // No-progress escalation: attempts below cap → stays 'teams'
    // -------------------------------------------------------------------------
    it("increments import_attempts and keeps status='teams' when no-progress fires but attempts < cap", async () => {
      // 30 pending standings with all team fetches throwing (batchScraped=0 each call)
      const pendingStandings = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        roster_entry_id: `entry-${i}`,
        team_scrape_attempted_at: null as string | null,
      }));

      standingsResponses = [
        { data: pendingStandings, error: null },
        { data: [], error: null },
        { data: pendingStandings, error: null },
        { data: [], error: null },
        { data: pendingStandings, error: null },
        { data: [], error: null },
      ];

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if ((url as string).includes("/teamlist/")) {
          return Promise.reject(new Error("connection refused"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("<html></html>"),
        });
      });

      // Sequence mirrors the "breaks out" test above, but [15] returns
      // import_attempts: 1 (below the 3-attempt cap).
      eventsResponses = [
        { data: { event_id: "evt-np", import_status: "queued" }, error: null }, // [0] pick
        { data: { event_id: "evt-np" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] queued-stage attempts
        { data: null, error: null }, // [3] roster update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start
        { data: { import_status: "teams" }, error: null }, // [5] re-read
        { data: null, error: null }, // [6] teams update (batch 1)
        { data: null, error: null }, // [7] batch status update (batch 1)
        { data: null, error: null }, // [8] heartbeat (batch 1)
        { data: null, error: null }, // [9] teams update (batch 2)
        { data: null, error: null }, // [10] batch status update (batch 2)
        { data: null, error: null }, // [11] heartbeat (batch 2)
        { data: null, error: null }, // [12] teams update (batch 3)
        { data: null, error: null }, // [13] batch status update (batch 3)
        { data: null, error: null }, // [14] heartbeat (batch 3)
        { data: { import_attempts: 1 }, error: null }, // [15] no-progress: read attempts (1 < 3)
        { data: null, error: null }, // [16] no-progress: write status
        { data: null, error: null }, // [17] lease release
        { data: null, error: null }, // [18] next primary pick
        { data: null, error: null }, // [19] fallback pick
        { data: null, error: null, count: 0 }, // [20] count
      ];

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 5,
          concurrency: 1,
        });
        await jest.runAllTimersAsync();
        await promise;

        // Should have written import_attempts=2 and import_status='teams' (not 'failed')
        const updateCalls = (eventsChain.update as jest.Mock).mock
          .calls as Array<[Record<string, unknown>]>;
        const noProgressUpdate = updateCalls.find(
          ([payload]) =>
            payload.import_error ===
            "No team-scrape progress after 3 consecutive batches"
        );
        expect(noProgressUpdate).toBeDefined();
        expect(noProgressUpdate?.[0]).toMatchObject({
          import_status: "teams",
          import_attempts: 2,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    // -------------------------------------------------------------------------
    // No-progress escalation: attempts at cap → escalates to 'failed'
    // -------------------------------------------------------------------------
    it("sets import_status='failed' when no-progress fires and attempts reaches the cap (3)", async () => {
      const pendingStandings = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        roster_entry_id: `entry-${i}`,
        team_scrape_attempted_at: null as string | null,
      }));

      standingsResponses = [
        { data: pendingStandings, error: null },
        { data: [], error: null },
        { data: pendingStandings, error: null },
        { data: [], error: null },
        { data: pendingStandings, error: null },
        { data: [], error: null },
      ];

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if ((url as string).includes("/teamlist/")) {
          return Promise.reject(new Error("connection refused"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve("<html></html>"),
        });
      });

      // [15] returns import_attempts: 2 → newAttempts=3 → status='failed'
      eventsResponses = [
        {
          data: { event_id: "evt-fail", import_status: "queued" },
          error: null,
        }, // [0]
        { data: { event_id: "evt-fail" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] queued-stage attempts
        { data: null, error: null }, // [3] roster update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start
        { data: { import_status: "teams" }, error: null }, // [5] re-read
        { data: null, error: null }, // [6] teams update (batch 1)
        { data: null, error: null }, // [7] batch status update (batch 1)
        { data: null, error: null }, // [8] heartbeat (batch 1)
        { data: null, error: null }, // [9] teams update (batch 2)
        { data: null, error: null }, // [10] batch status update (batch 2)
        { data: null, error: null }, // [11] heartbeat (batch 2)
        { data: null, error: null }, // [12] teams update (batch 3)
        { data: null, error: null }, // [13] batch status update (batch 3)
        { data: null, error: null }, // [14] heartbeat (batch 3)
        { data: { import_attempts: 2 }, error: null }, // [15] no-progress: read attempts (2 < 3 before +1 → 3 = cap)
        { data: null, error: null }, // [16] no-progress: write failed status
        { data: null, error: null }, // [17] lease release
        { data: null, error: null }, // [18] next primary pick
        { data: null, error: null }, // [19] fallback pick
        { data: null, error: null, count: 0 }, // [20] count
      ];

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 5,
          concurrency: 1,
        });
        await jest.runAllTimersAsync();
        await promise;

        // Should have written import_status='failed' with the no-progress error
        const updateCalls = (eventsChain.update as jest.Mock).mock
          .calls as Array<[Record<string, unknown>]>;
        const failedUpdate = updateCalls.find(
          ([payload]) =>
            payload.import_status === "failed" &&
            payload.import_error ===
              "No team-scrape progress after 3 consecutive batches"
        );
        expect(failedUpdate).toBeDefined();
        expect(failedUpdate?.[0]).toMatchObject({
          import_status: "failed",
          import_attempts: 3,
          import_error: "No team-scrape progress after 3 consecutive batches",
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Resuming an in-flight event (import_status = "teams")
  // ---------------------------------------------------------------------------
  describe("resuming in-flight event", () => {
    it("skips roster stage for a 'teams' event and goes straight to runTeamsBatch", async () => {
      // Primary pick returns nothing; fallback pick returns "teams" event.
      // Since pickedStatus === "teams" (not "queued"), runRosterStage is skipped.
      // Standings are empty → runTeamsBatch reads player_count, marks complete,
      // returns done:true on first call.
      //
      // Events response sequence:
      //  [0]  primary pick          → null (nothing queued)
      //  [1]  fallback pick         → "teams" event
      //  [2]  claim                 → success
      //  [3]  runTeamsBatch: SELECT player_count (standings empty)
      //  [4]  runTeamsBatch: UPDATE complete
      //  [5]  heartbeat
      //  [6]  lease release
      //  [7]  next primary pick     → empty
      //  [8]  next fallback pick    → empty
      //  [9]  count query           → 0
      eventsResponses = [
        { data: null, error: null }, // [0] primary pick → nothing
        {
          data: { event_id: "evt-teams", import_status: "teams" },
          error: null,
        }, // [1] fallback
        { data: { event_id: "evt-teams" }, error: null }, // [2] claim
        { data: { player_count: 0 }, error: null }, // [3] player_count
        { data: null, error: null }, // [4] complete update
        { data: null, error: null }, // [5] heartbeat
        { data: null, error: null }, // [6] release
        { data: null, error: null }, // [7] next primary pick → empty
        { data: null, error: null }, // [8] next fallback pick → empty
        { data: null, error: null, count: 0 }, // [9] count query
      ];

      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      // Roster stage was skipped — no roster HTML fetch
      const fetchCalls = (global.fetch as jest.Mock).mock.calls as Array<
        [string]
      >;
      const rosterFetches = fetchCalls.filter(([url]) =>
        url.includes("/roster/")
      );
      expect(rosterFetches).toHaveLength(0);

      // Teams batch ran — player_count was queried (empty standings path)
      expect(eventsChain.select).toHaveBeenCalledWith("player_count");

      // Event was processed
      expect(result.eventsTouched).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Queue pick query error → breaks out with error count
  // ---------------------------------------------------------------------------
  describe("database error on queue pick", () => {
    it("increments errors and breaks the loop when primary pick query fails", async () => {
      eventsResponses = [
        { data: null, error: { message: "connection refused" } }, // primary pick error
        { data: null, error: null, count: 0 }, // remaining count
      ];

      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.errors).toBe(1);
      expect(result.eventsTouched).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. runRosterStage failure → event marked error, loop continues
  // ---------------------------------------------------------------------------
  describe("roster stage failure", () => {
    it("increments errors and releases lease when runRosterStage fails", async () => {
      // Make the roster HTTP fetch fail — runRosterStage will catch the error,
      // write a failed status to events, and return { success: false }.
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error("HTTP 500: Internal Server Error")
      );

      // Events response sequence:
      //  [0]  primary pick          → queued event
      //  [1]  claim                 → success
      //  [2]  attempts              → 0
      //  [3]  runRosterStage: UPDATE { import_status: "roster" }
      //  [4]  runRosterStage: SELECT date_start  (→ null, so no formatId update)
      //  [5]  (fetch fails → catch block:)
      //       runRosterStage: SELECT import_attempts
      //  [6]  runRosterStage: UPDATE { import_status: "failed", ... }
      //  (runRosterStage returns { success: false })
      //  [7]  processRk9Queue: release lease (success===false path)
      //  [8]  finally: release lease (always runs)
      //  [9]  next primary pick     → empty
      //  [10] fallback pick         → empty
      //  [11] count query           → 0
      eventsResponses = [
        { data: { event_id: "evt-1", import_status: "queued" }, error: null }, // [0] pick
        { data: { event_id: "evt-1" }, error: null }, // [1] claim
        { data: { import_attempts: 0 }, error: null }, // [2] attempts
        { data: null, error: null }, // [3] roster status update
        { data: { date_start: "2024-01-01" }, error: null }, // [4] date_start
        { data: { import_attempts: 0 }, error: null }, // [5] import_attempts (catch block)
        { data: null, error: null }, // [6] failed status write
        { data: null, error: null }, // [7] release (success===false)
        { data: null, error: null }, // [8] finally release
        { data: null, error: null }, // [9] next pick → empty
        { data: null, error: null }, // [10] fallback
        { data: null, error: null, count: 0 }, // [11] count
      ];

      jest.useFakeTimers();
      try {
        const supabase = buildSupabaseMock();
        const promise = processRk9Queue(supabase as never, {
          deadline: FUTURE(),
          teamsPerTick: 25,
          concurrency: 1,
        });
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result.errors).toBe(1);
        // Teams batch should NOT have been called — no team-list fetches
        const fetchCalls = (global.fetch as jest.Mock).mock.calls as Array<
          [string]
        >;
        const teamFetches = fetchCalls.filter(([url]) =>
          url.includes("/teamlist/")
        );
        expect(teamFetches).toHaveLength(0);
        // Lease released
        expect(eventsChain.update).toHaveBeenCalledWith(
          expect.objectContaining({ worker_claimed_at: null })
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 10. remainingQueued comes from the count query
  // ---------------------------------------------------------------------------
  describe("remaining count", () => {
    it("reports remainingQueued from the post-loop count query", async () => {
      // Empty queue — loop doesn't run; count query returns 7
      eventsResponses = [
        { data: null, error: null }, // primary pick
        { data: null, error: null }, // fallback pick
        { data: null, error: null, count: 7 }, // remaining count
      ];

      const supabase = buildSupabaseMock();

      const result = await processRk9Queue(supabase as never, {
        deadline: FUTURE(),
        teamsPerTick: 25,
        concurrency: 1,
      });

      expect(result.remainingQueued).toBe(7);
    });
  });
});

// =============================================================================
// buildRk9Url — path-traversal rejection (new branch coverage)
// =============================================================================

describe("buildRk9Url", () => {
  it.each([
    ["/roster/../../../etc/passwd", "double-dot traversal"],
    ["/roster/./test", "single-dot segment"],
  ])(
    "throws for path with traversal segments: %s (%s)",
    (path: string, _label: string) => {
      expect(() => buildRk9Url(path)).toThrow(/Invalid RK9 path/);
    }
  );

  it.each([
    [
      "/teamlist/public/event1/entry1",
      "https://rk9.gg/teamlist/public/event1/entry1",
    ],
    ["/roster/evt-abc123", "https://rk9.gg/roster/evt-abc123"],
  ])(
    "returns a valid URL for the safe path %s",
    (path: string, expected: string) => {
      expect(buildRk9Url(path)).toBe(expected);
    }
  );

  it("throws for a path with characters not matching the allowed pattern", () => {
    expect(() => buildRk9Url("/roster/bad path?query=1")).toThrow(
      /Invalid RK9 path/
    );
  });
});

// =============================================================================
// runTeamsBatch — invalid entryId validation (new branch coverage)
// =============================================================================

describe("runTeamsBatch — invalid roster_entry_id", () => {
  /**
   * Build a supabase stub tailored for runTeamsBatch calls.
   * runTeamsBatch issues these queries in order when standings exist:
   *   standings: SELECT (pagination, page 1 returns standings, page 2 empty)
   *   events:    UPDATE { import_status: "teams" }
   *   species_map: SELECT
   *   standings: UPDATE { team_scrape_attempted_at } .in(id, [...])
   *   team_pokemon: SELECT standing_id .in(standing_id, [...]) (count)
   *   events:    UPDATE (final status)
   */
  function buildBatchSupabaseMock({
    standingsPages,
    teamPokemonData = [],
  }: {
    standingsPages: Array<
      Array<{
        id: number;
        roster_entry_id: string | null;
        team_scrape_attempted_at: string | null;
      }>
    >;
    teamPokemonData?: Array<{ standing_id: number }>;
  }) {
    let standingsPageIdx = 0;
    const standingsChainInner = makeChain(() => {
      const page = standingsPages[standingsPageIdx] ?? [];
      standingsPageIdx++;
      return { data: page, error: null };
    });

    const eventsChainInner = makeChain(() => ({ data: null, error: null }));
    const speciesMapChainInner = makeChain(() => ({ data: [], error: null }));
    const teamPokemonChainInner = makeChain(() => ({
      data: teamPokemonData,
      error: null,
    }));

    return {
      _eventsChain: eventsChainInner,
      _standingsChain: standingsChainInner,
      supabase: {
        schema: jest.fn().mockImplementation((_schema: string) => ({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === "standings") return standingsChainInner;
            if (table === "events") return eventsChainInner;
            if (table === "species_map") return speciesMapChainInner;
            if (table === "team_pokemon") return teamPokemonChainInner;
            return makeChain(() => ({ data: null, error: null }));
          }),
        })),
      },
    };
  }

  it("does not call fetch for a standing with an invalid roster_entry_id", async () => {
    const invalidStanding = {
      id: 42,
      roster_entry_id: "../../bad",
      team_scrape_attempted_at: null,
    };

    const { supabase } = buildBatchSupabaseMock({
      standingsPages: [[invalidStanding], []],
    });

    await runTeamsBatch(supabase as never, "evt-1", {
      batchSize: 10,
      concurrency: 1,
    });

    // fetch should NOT have been called for the team-list URL
    const fetchCalls = (global.fetch as jest.Mock).mock.calls as Array<
      [string]
    >;
    const teamFetches = fetchCalls.filter(([url]) =>
      url.includes("/teamlist/")
    );
    expect(teamFetches).toHaveLength(0);
  });

  it("stamps the standing as processed (failed:1) even for an invalid entryId", async () => {
    // Invalid entryId returns { scraped: 0, failed: 1 }
    // The merge loop adds the standing to processedIds when failed > 0
    // So the standings UPDATE .in("id", [...]) MUST be called with [42]
    const invalidStanding = {
      id: 42,
      roster_entry_id: "../../bad",
      team_scrape_attempted_at: null,
    };

    const { supabase, _standingsChain } = buildBatchSupabaseMock({
      standingsPages: [[invalidStanding], []],
    });

    await runTeamsBatch(supabase as never, "evt-1", {
      batchSize: 10,
      concurrency: 1,
    });

    // The stamp UPDATE uses .in("id", processedIdsList) on standings
    const inCalls = (_standingsChain.in as jest.Mock).mock.calls as Array<
      [string, number[]]
    >;
    const stampCall = inCalls.find(([col]) => col === "id");
    // processedIds should contain standing 42 (failed > 0 → processedIds.add)
    expect(stampCall).toBeDefined();
    expect(stampCall?.[1]).toContain(42);
  });

  it("returns scraped:0, failed:1 in the batch result for an invalid entryId standing", async () => {
    const invalidStanding = {
      id: 99,
      roster_entry_id: "../../evil",
      team_scrape_attempted_at: null,
    };

    const { supabase } = buildBatchSupabaseMock({
      standingsPages: [[invalidStanding], []],
    });

    const result = await runTeamsBatch(supabase as never, "evt-1", {
      batchSize: 10,
      concurrency: 1,
    });

    // batchScraped is 0 (no successful scrape), total is 1
    expect(result.batchScraped).toBe(0);
    expect(result.total).toBe(1);
  });

  it.each([
    ["../../bad", "path traversal with slashes"],
    ["bad entry id!", "special chars"],
    ["entry id with spaces", "spaces in id"],
  ])(
    "treats roster_entry_id '%s' (%s) as invalid and skips the fetch",
    async (entryId: string, _label: string) => {
      const standing = {
        id: 1,
        roster_entry_id: entryId,
        team_scrape_attempted_at: null,
      };

      const { supabase } = buildBatchSupabaseMock({
        standingsPages: [[standing], []],
      });

      await runTeamsBatch(supabase as never, "evt-1", {
        batchSize: 10,
        concurrency: 1,
      });

      const fetchCalls = (global.fetch as jest.Mock).mock.calls as Array<
        [string]
      >;
      const teamFetches = fetchCalls.filter(([url]) =>
        url.includes("/teamlist/")
      );
      expect(teamFetches).toHaveLength(0);
    }
  );
});

// =============================================================================
// runRosterStage — new review-fix error branches
// =============================================================================

describe("runRosterStage error branches", () => {
  /**
   * Direct invocation of runRosterStage (no processRk9Queue wrapper) so we can
   * test the return value and internal DB sequence in isolation.
   *
   * Query sequence when date_start SELECT fails:
   *   [0] UPDATE { import_status: "roster" }   → success
   *   [1] SELECT date_start                     → { error }
   *   [2] SELECT import_attempts (catch block)  → success
   *   [3] UPDATE { import_status: "failed" }    → success
   */
  it("returns success:false with the date_start error message when the date_start SELECT fails", async () => {
    eventsResponses = [
      { data: null, error: null }, // [0] roster status UPDATE
      {
        data: null,
        error: { message: "db error reading date_start" },
      }, // [1] date_start SELECT → error
      { data: { import_attempts: 0 }, error: null }, // [2] catch: attempts SELECT
      { data: null, error: null }, // [3] catch: failed status UPDATE
    ];

    const supabase = buildSupabaseMock();

    const result = await runRosterStage(supabase as never, "evt-err1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to read date_start");
    expect(result.error).toContain("db error reading date_start");
  });

  it("writes failed status with the date_start error message to the DB", async () => {
    eventsResponses = [
      { data: null, error: null }, // [0] roster status UPDATE
      {
        data: null,
        error: { message: "date read failed" },
      }, // [1] date_start SELECT → error
      { data: { import_attempts: 2 }, error: null }, // [2] catch: attempts SELECT
      { data: null, error: null }, // [3] catch: failed status UPDATE
    ];

    const supabase = buildSupabaseMock();

    await runRosterStage(supabase as never, "evt-err1");

    // The catch block must write a failed-status UPDATE containing the error msg
    expect(eventsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "failed",
        import_error: expect.stringContaining("Failed to read date_start"),
      })
    );
  });

  /**
   * Query sequence when format_id UPDATE fails (formatId is non-null):
   *   [0] UPDATE { import_status: "roster" }   → success
   *   [1] SELECT date_start                     → success (data: { date_start })
   *   [2] UPDATE { format_id: formatId }        → { error }
   *   [3] SELECT import_attempts (catch block)  → success
   *   [4] UPDATE { import_status: "failed" }    → success
   *
   * For formatId to be non-null we need detectEventFormat to return a real string.
   * formatDetectionNeedsHtml returns false (already the default) so we stay on
   * the non-HTML branch and can control detectEventFormat directly.
   */
  it("returns success:false with the format_id error message when the format_id UPDATE fails", async () => {
    // Override detectEventFormat for this test so it returns a real formatId
    const scraperMock = jest.requireMock("@/lib/rk9/scraper") as {
      detectEventFormat: jest.Mock;
    };
    scraperMock.detectEventFormat.mockReturnValueOnce("gen9vgc2024");

    eventsResponses = [
      { data: null, error: null }, // [0] roster status UPDATE
      { data: { date_start: "2024-01-01" }, error: null }, // [1] date_start SELECT
      {
        data: null,
        error: { message: "format update rejected" },
      }, // [2] format_id UPDATE → error
      { data: { import_attempts: 0 }, error: null }, // [3] catch: attempts SELECT
      { data: null, error: null }, // [4] catch: failed status UPDATE
    ];

    const supabase = buildSupabaseMock();

    const result = await runRosterStage(supabase as never, "evt-fmt1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to update format_id");
    expect(result.error).toContain("format update rejected");
  });

  it("writes failed status with the format_id error message to the DB", async () => {
    const scraperMock = jest.requireMock("@/lib/rk9/scraper") as {
      detectEventFormat: jest.Mock;
    };
    scraperMock.detectEventFormat.mockReturnValueOnce("gen9vgc2024");

    eventsResponses = [
      { data: null, error: null }, // [0] roster status UPDATE
      { data: { date_start: "2024-01-01" }, error: null }, // [1] date_start SELECT
      {
        data: null,
        error: { message: "format update rejected" },
      }, // [2] format_id UPDATE → error
      { data: { import_attempts: 1 }, error: null }, // [3] catch: attempts SELECT
      { data: null, error: null }, // [4] catch: failed status UPDATE
    ];

    const supabase = buildSupabaseMock();

    await runRosterStage(supabase as never, "evt-fmt1");

    expect(eventsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "failed",
        import_error: expect.stringContaining("Failed to update format_id"),
      })
    );
  });
});
