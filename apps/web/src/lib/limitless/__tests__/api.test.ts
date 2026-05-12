/**
 * @jest-environment node
 */

import { LIMITLESS_TO_FORMAT, KNOWN_FORMATS } from "../api";

describe("LIMITLESS_TO_FORMAT", () => {
  it("maps known Limitless codes to Showdown format IDs", () => {
    expect(LIMITLESS_TO_FORMAT["M-A"]).toBe("gen9championsvgc2026regma");
    expect(LIMITLESS_TO_FORMAT["SVI"]).toBe("gen9vgc2025regi");
    expect(LIMITLESS_TO_FORMAT["VGC22"]).toBe("gen8vgc2022");
  });

  it("returns undefined for unknown codes", () => {
    expect(LIMITLESS_TO_FORMAT["CUSTOM"]).toBeUndefined();
    expect(LIMITLESS_TO_FORMAT[""]).toBeUndefined();
  });
});

describe("KNOWN_FORMATS", () => {
  it("contains all Limitless format codes", () => {
    expect(KNOWN_FORMATS.has("M-A")).toBe(true);
    expect(KNOWN_FORMATS.has("SVI")).toBe(true);
    expect(KNOWN_FORMATS.has("VGC22")).toBe(true);
  });

  it("does not contain Showdown format IDs", () => {
    expect(KNOWN_FORMATS.has("gen9championsvgc2026regma")).toBe(false);
  });

  it("matches Object.keys of LIMITLESS_TO_FORMAT", () => {
    expect(KNOWN_FORMATS.size).toBe(Object.keys(LIMITLESS_TO_FORMAT).length);
    for (const key of Object.keys(LIMITLESS_TO_FORMAT)) {
      expect(KNOWN_FORMATS.has(key)).toBe(true);
    }
  });
});

describe("fetchTournamentList", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("stops after a short page", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [{ id: "t1", format: "SVG", name: "Cup", date: "2024-01-01T00:00:00Z", players: 10 }],
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const { fetchTournamentList } = await import("../api");

    const result = await fetchTournamentList("key");
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches multiple pages", async () => {
    const fullPage = Array.from({ length: 500 }, (_, i) => ({
      id: `t${i}`, format: "SVG", name: `Cup ${i}`, date: "2024-01-01T00:00:00Z", players: 10,
    }));

    // Page 1 = full page (triggers pagination), rest return short page (stops)
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        status: 200, ok: true,
        json: async () => fullPage,
      })
      .mockResolvedValue({
        status: 200, ok: true,
        json: async () => [{ id: "t500", format: "SVG", name: "Last", date: "2024-01-01T00:00:00Z", players: 5 }],
      });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const { fetchTournamentList } = await import("../api");

    const result = await fetchTournamentList("key");
    // Page 1 (500) + pages 2-6 (5 concurrent fetches, first short page stops processing)
    expect(result.length).toBe(501);
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });
});

describe("fetchTournamentData", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("fetches details, standings, and pairings concurrently", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({}),
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

    const { fetchTournamentData } = await import("../api");

    await fetchTournamentData("t1", "key");
    // Should make 3 concurrent calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
