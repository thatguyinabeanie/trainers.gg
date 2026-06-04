/**
 * @jest-environment node
 */

import { fetchTournamentList, fetchTournamentData } from "../api";

describe("fetchTournamentList", () => {
  it("returns VGC tournaments from the API", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [
        {
          id: "t1",
          format: "SVG",
          name: "VGC Cup",
          date: "2024-01-01T00:00:00Z",
          players: 10,
          game: "VGC",
        },
      ],
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const results = await fetchTournamentList();

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ id: "t1", format: "SVG" });
  });

  it("filters to VGC game only", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [
        {
          id: "t1",
          format: "SVG",
          name: "VGC Cup",
          date: "2024-01-01T00:00:00Z",
          players: 10,
          game: "VGC",
        },
        {
          id: "t2",
          format: "STD",
          name: "TCG Cup",
          date: "2024-01-01T00:00:00Z",
          players: 10,
          game: "TCG",
        },
      ],
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const results = await fetchTournamentList();

    expect(results.every((t) => t.game === "VGC")).toBe(true);
  });

  it("throws when a subsequent page fetch fails after retries", async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => ({
      id: `t${i}`,
      format: "SVG",
      name: `VGC Cup ${i}`,
      date: "2024-01-01T00:00:00Z",
      players: 10,
      game: "VGC",
    }));
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => firstPage,
      })
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue({
        // Pages 3-6 are initiated concurrently with page 2 — they need responses
        // even though Promise.all already rejected from page 2's failure.
        status: 200,
        ok: true,
        json: async () => [],
      });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    await expect(fetchTournamentList()).rejects.toThrow("network down");
  });

  it("stops paginating when a subsequent page returns an empty batch", async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => ({
      id: `t${i}`,
      format: "SVG",
      name: `VGC Cup ${i}`,
      date: "2024-01-01T00:00:00Z",
      players: 10,
      game: "VGC",
    }));
    // Page 1: full 500. Page 2: empty array (signals end of data).
    // Pages 3-6 are fetched concurrently with page 2 (MAX_CONCURRENT=5) — they
    // must resolve even though their results are discarded once page 2 signals end.
    const emptyResponse = {
      status: 200,
      ok: true,
      json: async () => [] as typeof firstPage,
    };
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => firstPage,
      })
      .mockResolvedValue(emptyResponse);
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const results = await fetchTournamentList();

    expect(results.length).toBe(500);
  });

  it("stops paginating when a subsequent page returns fewer than 500 items", async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => ({
      id: `t${i}`,
      format: "SVG",
      name: `VGC Cup ${i}`,
      date: "2024-01-01T00:00:00Z",
      players: 10,
      game: "VGC",
    }));
    const partialSecondPage = Array.from({ length: 7 }, (_, i) => ({
      id: `t${500 + i}`,
      format: "SVG",
      name: `VGC Cup ${500 + i}`,
      date: "2024-01-01T00:00:00Z",
      players: 10,
      game: "VGC",
    }));
    // Pages 3-6 are fetched concurrently with page 2 (MAX_CONCURRENT=5) — they
    // must resolve even though their results are discarded once page 2 signals end.
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => firstPage,
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => partialSecondPage,
      })
      .mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => [],
      });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const results = await fetchTournamentList();

    expect(results.length).toBe(507);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});

describe("fetchTournamentData", () => {
  it("returns tournament data with details, standings, pairings", async () => {
    const details = {
      id: "t1",
      format: "SVG",
      name: "Cup",
      date: "2024-01-01T00:00:00Z",
      players: 2,
      game: "VGC",
    };
    const standings = [{ player: "p1", name: "Alice", placing: 1 }];
    const pairings = [{ round: 1, phase: 1, player1: "p1", player2: "p2" }];

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => details })
      .mockResolvedValueOnce({ ok: true, json: async () => standings })
      .mockResolvedValueOnce({ ok: true, json: async () => pairings });

    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const result = await fetchTournamentData("t1");

    expect(result.details).toMatchObject({ id: "t1" });
    expect(result.standings).toHaveLength(1);
    expect(result.pairings).toHaveLength(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
