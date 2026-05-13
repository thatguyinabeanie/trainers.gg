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
        { id: "t1", format: "SVG", name: "VGC Cup", date: "2024-01-01T00:00:00Z", players: 10, game: "VGC" },
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
        { id: "t1", format: "SVG", name: "VGC Cup", date: "2024-01-01T00:00:00Z", players: 10, game: "VGC" },
        { id: "t2", format: "STD", name: "TCG Cup", date: "2024-01-01T00:00:00Z", players: 10, game: "TCG" },
      ],
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const results = await fetchTournamentList();

    expect(results.every((t) => t.game === "VGC")).toBe(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});

describe("fetchTournamentData", () => {
  it("returns tournament data with details, standings, pairings", async () => {
    const details = { id: "t1", format: "SVG", name: "Cup", date: "2024-01-01T00:00:00Z", players: 2, game: "VGC" };
    const standings = [{ player: "p1", name: "Alice", placing: 1 }];
    const pairings = [{ round: 1, phase: 1, player1: "p1", player2: "p2" }];

    const mockFetch = jest.fn()
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
