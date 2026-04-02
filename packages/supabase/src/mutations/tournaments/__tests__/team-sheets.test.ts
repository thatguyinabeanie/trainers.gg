import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createTournamentTeamSheets } from "../team-sheets";
import type { TypedClient } from "../../../client";

// Helper to build a mock Supabase client where each `from()` call returns
// a fresh chainable builder. Tests override individual calls via `fromSpy`.
type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  not: jest.Mock;
  single: jest.Mock;
  insert: jest.Mock;
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn(),
  };
  return mockClient as unknown as TypedClient;
};

// Build a minimal registration object as returned by the Supabase join query.
// Only includes fields that createTournamentTeamSheets actually reads.
function makeRegistration(overrides?: {
  id?: number;
  alt_id?: number;
  team_id?: number | null;
  team?: unknown;
}) {
  const id = overrides?.id ?? 1;
  const alt_id = overrides?.alt_id ?? 10;
  const team_id = overrides?.team_id ?? 100;

  const defaultTeam =
    team_id === null
      ? null
      : {
          id: team_id,
          team_pokemon: [
            {
              team_position: 1,
              pokemon: {
                species: "Pikachu",
                ability: "Static",
                held_item: "Light Ball",
                tera_type: "Electric",
                move1: "Thunderbolt",
                move2: "Volt Switch",
                move3: "Protect",
                move4: null,
              },
            },
          ],
        };

  return {
    id,
    alt_id,
    team_id,
    team: overrides?.team !== undefined ? overrides.team : defaultTeam,
  };
}

describe("createTournamentTeamSheets", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("happy path — snapshot rows", () => {
    it("builds correct rows for multiple registrations", async () => {
      const tournamentId = 42;
      const fromSpy = jest.spyOn(mockClient, "from");

      // First call: tournament fetch
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Second call: registrations fetch
      const reg1 = makeRegistration({
        id: 1,
        alt_id: 10,
        team_id: 100,
        team: {
          id: 100,
          team_pokemon: [
            {
              team_position: 1,
              pokemon: {
                species: "Pikachu",
                ability: "Static",
                held_item: "Light Ball",
                tera_type: "Electric",
                move1: "Thunderbolt",
                move2: "Volt Switch",
                move3: "Protect",
                move4: null,
              },
            },
            {
              team_position: 2,
              pokemon: {
                species: "Garchomp",
                ability: "Rough Skin",
                held_item: null,
                tera_type: "Dragon",
                move1: "Earthquake",
                move2: "Dragon Claw",
                move3: "Swords Dance",
                move4: "Protect",
              },
            },
          ],
        },
      });
      const reg2 = makeRegistration({
        id: 2,
        alt_id: 20,
        team_id: 200,
        team: {
          id: 200,
          team_pokemon: [
            {
              team_position: 1,
              pokemon: {
                species: "Incineroar",
                ability: "Intimidate",
                held_item: "Safety Goggles",
                tera_type: "Fire",
                move1: "Flare Blitz",
                move2: "Fake Out",
                move3: "Parting Shot",
                move4: "Darkest Lariat",
              },
            },
          ],
        },
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [reg1, reg2],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Third call: insert
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, tournamentId);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const rows = (insertMock as jest.Mock).mock.calls[0]?.[0] as Array<{
        tournament_id: number;
        registration_id: number;
        alt_id: number;
        team_id: number;
        format: string;
        position: number;
        species: string;
        ability: string;
        held_item: string | null;
        tera_type: string | null;
        move1: string;
        move2: string | null;
        move3: string | null;
        move4: string | null;
      }>;

      // 3 total Pokemon across both registrations
      expect(rows).toHaveLength(3);

      // Verify first player, first Pokemon
      const firstRow = rows[0];
      expect(firstRow).toMatchObject({
        tournament_id: tournamentId,
        registration_id: 1,
        alt_id: 10,
        team_id: 100,
        format: "gen9vgc2026regi",
        position: 1,
        species: "Pikachu",
        ability: "Static",
        held_item: "Light Ball",
        tera_type: "Electric",
        move1: "Thunderbolt",
        move2: "Volt Switch",
        move3: "Protect",
        move4: null,
      });

      // Verify EVs/IVs/nature are NOT present in any row
      for (const row of rows) {
        expect(row).not.toHaveProperty("evs");
        expect(row).not.toHaveProperty("ivs");
        expect(row).not.toHaveProperty("nature");
        expect(row).not.toHaveProperty("level");
      }

      // Verify second player's Pokemon
      const thirdRow = rows[2];
      expect(thirdRow).toMatchObject({
        registration_id: 2,
        alt_id: 20,
        team_id: 200,
        species: "Incineroar",
        ability: "Intimidate",
      });
    });

    it("uses game_format from tournament as the format field", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [makeRegistration()],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      const rows = (insertMock as jest.Mock).mock.calls[0]?.[0] as Array<{
        format: string;
      }>;
      expect(rows[0]?.format).toBe("gen9vgc2026regi");
    });

    it("falls back to 'unknown' when game_format is null", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: null },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [makeRegistration()],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      const rows = (insertMock as jest.Mock).mock.calls[0]?.[0] as Array<{
        format: string;
      }>;
      expect(rows[0]?.format).toBe("unknown");
    });
  });

  describe("early returns", () => {
    it("returns early when no checked-in registrations exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      expect(insertMock).not.toHaveBeenCalled();
    });

    it("returns early when registrations is null", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      expect(insertMock).not.toHaveBeenCalled();
    });

    it("does not insert when all registrations produce zero Pokemon rows", async () => {
      // All registrations have null team — so snapshotRows stays empty
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [makeRegistration({ team_id: null, team: null })],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe("skipping invalid entries", () => {
    it("skips registrations with null team_id", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // One registration has team_id null, one is valid
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [
            makeRegistration({ id: 1, alt_id: 10, team_id: null, team: null }),
            makeRegistration({ id: 2, alt_id: 20, team_id: 100 }),
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      const rows = (insertMock as jest.Mock).mock.calls[0]?.[0] as Array<{
        registration_id: number;
      }>;
      // Only the valid registration (id=2) contributes rows
      expect(rows.every((r) => r.registration_id === 2)).toBe(true);
    });

    it("skips Pokemon entries where tp.pokemon is null", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [
            makeRegistration({
              id: 1,
              alt_id: 10,
              team_id: 100,
              team: {
                id: 100,
                team_pokemon: [
                  {
                    team_position: 1,
                    pokemon: null, // should be skipped
                  },
                  {
                    team_position: 2,
                    pokemon: {
                      species: "Mimikyu",
                      ability: "Disguise",
                      held_item: null,
                      tera_type: "Ghost",
                      move1: "Shadow Sneak",
                      move2: "Play Rough",
                      move3: "Swords Dance",
                      move4: "Protect",
                    },
                  },
                ],
              },
            }),
          ],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: insertMock,
      } as unknown as MockQueryBuilder);

      await createTournamentTeamSheets(mockClient, 1);

      const rows = (insertMock as jest.Mock).mock.calls[0]?.[0] as Array<{
        species: string;
      }>;
      // Only the non-null Pokemon appears
      expect(rows).toHaveLength(1);
      expect(rows[0]?.species).toBe("Mimikyu");
    });
  });

  describe("error handling", () => {
    it("throws on tournament fetch error", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Tournament not found" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(createTournamentTeamSheets(mockClient, 999)).rejects.toThrow(
        "Failed to fetch tournament: Tournament not found"
      );
    });

    it("throws when tournament is null with no error object", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(createTournamentTeamSheets(mockClient, 999)).rejects.toThrow(
        "Failed to fetch tournament:"
      );
    });

    it("throws on registration fetch error", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Permission denied" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(createTournamentTeamSheets(mockClient, 1)).rejects.toThrow(
        "Failed to fetch registrations: Permission denied"
      );
    });

    it("throws on insert error", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "gen9vgc2026regi" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [makeRegistration()],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Duplicate key violation" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(createTournamentTeamSheets(mockClient, 1)).rejects.toThrow(
        "Failed to create team sheet snapshots: Duplicate key violation"
      );
    });
  });
});
