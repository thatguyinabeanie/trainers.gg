import { describe, it, expect, jest } from "@jest/globals";

import { runSyncStage } from "../pipeline";
import type { TypedClient } from "../../client";

// Minimal fakes: syncEvents/syncTournamentList are stubbed via jest.mock below.
jest.mock("../../sources", () => ({
  syncEvents: jest.fn(async () => ({ inserted: 2, updated: 0 })),
  fetchTournamentList: jest.fn(async () => [{ id: 1 }, { id: 2 }, { id: 3 }]),
  syncTournamentList: jest.fn(async () => ({ synced: 3, tournaments: [] })),
  parseArchivedEventsPage: jest.fn(() => []),
}));

describe("runSyncStage", () => {
  it("returns per-source discovered counts and excludes tombstoned events", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      isExcluded: () => false,
    });
    expect(result.rk9.discovered).toBeGreaterThanOrEqual(0);
    expect(result.limitless.discovered).toBe(3);
  });

  it("excludes tombstoned RK9 events from discovered count", async () => {
    const { syncEvents } = await import("../../sources");
    const mockSyncEvents = syncEvents as jest.MockedFunction<typeof syncEvents>;
    mockSyncEvents.mockResolvedValueOnce({ synced: 1, total: 1 });

    const supabase = {} as unknown as TypedClient;

    // Pass 3 RK9 events, 2 of which are tombstoned
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      rk9Events: [
        {
          eventId: "evt-1",
          name: "Event 1",
          tier: "international",
          dateRaw: "January 1-2, 2025",
          dateStart: "2025-01-01",
          dateEnd: "2025-01-02",
          locationCity: "Toronto",
          locationCountry: "CA",
          section: "past",
        },
        {
          eventId: "evt-2",
          name: "Event 2",
          tier: "regional",
          dateRaw: "February 1-2, 2025",
          dateStart: "2025-02-01",
          dateEnd: "2025-02-02",
          locationCity: "Dallas",
          locationCountry: "US",
          section: "past",
        },
        {
          eventId: "evt-3",
          name: "Event 3",
          tier: "regional",
          dateRaw: "March 1-2, 2025",
          dateStart: "2025-03-01",
          dateEnd: "2025-03-02",
          locationCity: "London",
          locationCountry: "GB",
          section: "past",
        },
      ],
      isExcluded: (_source, id) => id === "evt-2" || id === "evt-3",
    });

    // Only evt-1 is not tombstoned — discovered = 1
    expect(result.rk9.discovered).toBe(1);
    // syncEvents should have been called with only the non-excluded event
    expect(mockSyncEvents).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({ eventId: "evt-1" }),
    ]);
  });

  it("excludes tombstoned Limitless events from discovered count", async () => {
    const { syncTournamentList, fetchTournamentList } =
      await import("../../sources");
    const mockFetchList = fetchTournamentList as jest.MockedFunction<
      typeof fetchTournamentList
    >;
    const mockSyncList = syncTournamentList as jest.MockedFunction<
      typeof syncTournamentList
    >;

    // fetchTournamentList returns 3 tournaments with IDs "a", "b", "c"
    mockFetchList.mockResolvedValueOnce([
      {
        id: "a",
        game: "VGC",
        format: "SVI",
        name: "A",
        date: "2025-01-01",
        players: 64,
      },
      {
        id: "b",
        game: "VGC",
        format: "SVI",
        name: "B",
        date: "2025-02-01",
        players: 32,
      },
      {
        id: "c",
        game: "VGC",
        format: "SVI",
        name: "C",
        date: "2025-03-01",
        players: 16,
      },
    ]);
    mockSyncList.mockResolvedValueOnce({
      synced: 1,
      skipped: 0,
      total: 3,
      mapped: 1,
      unmapped: 0,
      unmappedFormats: {},
      tournaments: [],
    });

    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: "key",
      isExcluded: (_source, id) => id === "b" || id === "c",
    });

    // Only "a" passes the exclusion filter
    expect(result.limitless.discovered).toBe(1);
  });

  it("returns discovered=0 for RK9 when no rk9Events are provided", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      isExcluded: () => false,
    });
    expect(result.rk9.discovered).toBe(0);
    expect(result.rk9.queued).toBe(0);
  });
});
