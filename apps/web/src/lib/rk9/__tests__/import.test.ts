/**
 * @jest-environment node
 */

import { normalizeSpecies, collectUniqueSpecies, syncEvents } from "../import";

type MockSupabase = {
  schema: (name: string) => {
    from: (table: string) => {
      upsert: jest.Mock;
    };
  };
};

describe("normalizeSpecies", () => {
  it("normalizes basic species names", () => {
    expect(normalizeSpecies("Roaring Moon")).toBe("roaringmoon");
    expect(normalizeSpecies("Flutter Mane")).toBe("fluttermane");
    expect(normalizeSpecies("Pikachu")).toBe("pikachu");
  });

  it("handles bracket notation for forms", () => {
    expect(normalizeSpecies("Ogerpon [Hearthflame Mask]")).toBe("ogerpon-hearthflame");
    expect(normalizeSpecies("Urshifu [Rapid Strike Style]")).toBe("urshifu-rapid-strike");
  });

  it("skips default forms", () => {
    expect(normalizeSpecies("Landorus [Incarnate Forme]")).toBe("landorus");
    expect(normalizeSpecies("Toxtricity [Male]")).toBe("toxtricity");
  });

  it("handles therian forms", () => {
    expect(normalizeSpecies("Landorus [Therian Forme]")).toBe("landorus-therian");
  });

  it("handles regional variants", () => {
    expect(normalizeSpecies("Ninetales [Alolan Form]")).toBe("ninetales-alola");
    expect(normalizeSpecies("Weezing [Galarian Form]")).toBe("weezing-galar");
  });
});

describe("collectUniqueSpecies", () => {
  it("collects unique species from teams", () => {
    const teams = {
      entry1: [
        { speciesRaw: "Pikachu", ability: "Static", heldItem: null, teraType: null, moves: [] },
        { speciesRaw: "Charizard", ability: "Blaze", heldItem: null, teraType: null, moves: [] },
      ],
      entry2: [
        { speciesRaw: "Pikachu", ability: "Lightning Rod", heldItem: null, teraType: null, moves: [] },
      ],
    };

    const result = collectUniqueSpecies(teams as any);

    expect(result.size).toBe(2);
    expect(result.get("Pikachu")).toBe("pikachu");
    expect(result.get("Charizard")).toBe("charizard");
  });
});

describe("syncEvents", () => {
  it("upserts events", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });

    const supabase: MockSupabase = {
      schema: () => ({
        from: () => ({ upsert }),
      }),
    };

    const result = await syncEvents(supabase as any, [
      { eventId: "e1", name: "Event 1", tier: "Regional", dateStart: "2024-01-01", dateEnd: "2024-01-02", locationCity: null, locationCountry: null },
    ]);

    expect(result.synced).toBe(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ event_id: "e1" })]),
      { onConflict: "event_id" },
    );
  });
});
