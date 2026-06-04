/**
 * @jest-environment node
 */

import type { RK9Pokemon } from "../types";
import { syncEvents, collectUniqueSpecies } from "../import";

type MockSupabase = {
  schema: (name: string) => {
    from: (table: string) => {
      upsert: jest.Mock;
    };
  };
};

describe("collectUniqueSpecies", () => {
  it("collects unique species from teams", () => {
    const teams: Record<string, RK9Pokemon[]> = {
      entry1: [
        { speciesRaw: "Pikachu", ability: "Static", heldItem: "", teraType: null, statAlignment: null, moves: [] },
        { speciesRaw: "Charizard", ability: "Blaze", heldItem: "", teraType: null, statAlignment: null, moves: [] },
      ],
      entry2: [
        { speciesRaw: "Pikachu", ability: "Lightning Rod", heldItem: "", teraType: null, statAlignment: null, moves: [] },
      ],
    };

    const result = collectUniqueSpecies(teams);

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

    const result = await syncEvents(supabase as unknown as Parameters<typeof syncEvents>[0], [
      { eventId: "e1", name: "Event 1", tier: "regional", dateStart: "2024-01-01", dateEnd: "2024-01-02", locationCity: "City", locationCountry: "CO", dateRaw: "", section: "past" },
    ]);

    expect(result.synced).toBe(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ event_id: "e1" })]),
      { onConflict: "event_id" },
    );
  });
});
