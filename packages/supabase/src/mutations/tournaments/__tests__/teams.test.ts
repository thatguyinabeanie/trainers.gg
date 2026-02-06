import { submitTeam, selectTeamForTournament } from "../teams";
import type { TypedClient } from "../../../client";

// Mock helper functions
jest.mock("../helpers", () => ({
  getCurrentAlt: jest.fn(),
}));

// Mock @trainers/validators/team
jest.mock("@trainers/validators/team", () => ({
  parseAndValidateTeam: jest.fn(),
}));

import { getCurrentAlt } from "../helpers";
import { parseAndValidateTeam } from "@trainers/validators/team";

// Helper to create mock Supabase client
type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  single: jest.Mock;
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  return mockClient as unknown as TypedClient;
};

describe("Tournament Team Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("submitTeam", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;
    const rawText = `Pikachu @ Light Ball
Ability: Static
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Grass Knot
- Hidden Power Ice
- Volt Switch

Charizard @ Charizardite Y
Ability: Blaze
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Fire Blast
- Solar Beam
- Focus Blast
- Roost`;

    const mockParsedTeam = [
      {
        species: "Pikachu",
        nickname: null,
        level: 50,
        ability: "Static",
        nature: "Timid",
        held_item: "Light Ball",
        move1: "Thunderbolt",
        move2: "Grass Knot",
        move3: "Hidden Power Ice",
        move4: "Volt Switch",
        ev_hp: 0,
        ev_attack: 0,
        ev_defense: 0,
        ev_special_attack: 252,
        ev_special_defense: 4,
        ev_speed: 252,
        iv_hp: 31,
        iv_attack: 31,
        iv_defense: 31,
        iv_special_attack: 31,
        iv_special_defense: 31,
        iv_speed: 31,
        tera_type: null,
        gender: null,
        is_shiny: false,
      },
      {
        species: "Charizard",
        nickname: null,
        level: 50,
        ability: "Blaze",
        nature: "Timid",
        held_item: "Charizardite Y",
        move1: "Fire Blast",
        move2: "Solar Beam",
        move3: "Focus Blast",
        move4: "Roost",
        ev_hp: 0,
        ev_attack: 0,
        ev_defense: 0,
        ev_special_attack: 252,
        ev_special_defense: 4,
        ev_speed: 252,
        iv_hp: 31,
        iv_attack: 31,
        iv_defense: 31,
        iv_special_attack: 31,
        iv_special_defense: 31,
        iv_speed: 31,
        tera_type: null,
        gender: null,
        is_shiny: false,
      },
    ];

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
      (parseAndValidateTeam as jest.Mock).mockReturnValue({
        valid: true,
        team: mockParsedTeam,
        errors: [],
      });
    });

    it("should successfully submit a new team for a registration", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration (no existing team)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 2001 }, { id: 2002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Link pokemon to team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration with team reference
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await submitTeam(mockClient, tournamentId, rawText);

      expect(result).toEqual({
        success: true,
        teamId: 1000,
        pokemonCount: 2,
      });
      expect(parseAndValidateTeam).toHaveBeenCalledWith(
        rawText,
        "vgc2024-reg-g"
      );
    });

    it("should successfully replace an existing team", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration (with existing team)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: 900,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get old team pokemon
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ pokemon_id: 1001 }, { pokemon_id: 1002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete old team_pokemon
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete old pokemon
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete old team
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 2001 }, { id: 2002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Link pokemon to team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration with team reference
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await submitTeam(mockClient, tournamentId, rawText);

      expect(result).toEqual({
        success: true,
        teamId: 1000,
        pokemonCount: 2,
      });
    });

    it("should throw error if alt cannot be loaded", async () => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(null);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Unable to load your account");
    });

    it("should throw error if registration not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow(
        "You must be registered for this tournament to submit a team"
      );
    });

    it("should throw error if teams are locked", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: true,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      });

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow(
        "Teams are locked — the tournament has already started"
      );
    });

    it("should throw error if tournament not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Tournament not found");
    });

    it("should throw error if team validation fails", async () => {
      (parseAndValidateTeam as jest.Mock).mockReturnValue({
        valid: false,
        team: [],
        errors: [
          { message: "Pikachu is not allowed in this format" },
          { message: "Invalid ability for Charizard" },
        ],
      });

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow(
        "Team validation failed:\n• Pikachu is not allowed in this format\n• Invalid ability for Charizard"
      );
    });

    it("should throw error if team is empty", async () => {
      (parseAndValidateTeam as jest.Mock).mockReturnValue({
        valid: true,
        team: [],
        errors: [],
      });

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Team validation failed:");
    });

    it("should throw error if team creation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team (fails)
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Failed to create team");
    });

    it("should throw error if pokemon creation fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records (fails)
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Failed to create pokemon records");
    });

    it("should throw error if linking pokemon to team fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 2001 }, { id: 2002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Link pokemon to team (fails)
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Failed to link pokemon to team");
    });

    it("should throw error if updating registration fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 2001 }, { id: 2002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Link pokemon to team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration (fails)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        submitTeam(mockClient, tournamentId, rawText)
      ).rejects.toThrow("Failed to update registration with team");
    });

    it("should handle replacement when old team has no pokemon", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration (with existing team)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: 900,
            team_locked: false,
            tournament_id: tournamentId,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get tournament format
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { game_format: "vgc2024-reg-g" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get old team pokemon (empty)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete old team_pokemon
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Delete old team
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Create new team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 1000 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert pokemon records
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 2001 }, { id: 2002 }],
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Link pokemon to team
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration with team reference
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await submitTeam(mockClient, tournamentId, rawText);

      expect(result).toEqual({
        success: true,
        teamId: 1000,
        pokemonCount: 2,
      });
    });
  });

  describe("selectTeamForTournament", () => {
    const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
    const tournamentId = 100;
    const teamId = 1000;

    beforeEach(() => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
    });

    it("should successfully select an existing team for a tournament", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: mockAlt.id,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count pokemon in team
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 6,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await selectTeamForTournament(
        mockClient,
        tournamentId,
        teamId
      );

      expect(result).toEqual({
        teamId: 1000,
        pokemonCount: 6,
      });
    });

    it("should throw error if alt cannot be loaded", async () => {
      (getCurrentAlt as jest.Mock).mockResolvedValue(null);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow("Unable to load your account");
    });

    it("should throw error if registration not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow(
        "You must be registered for this tournament to submit a team"
      );
    });

    it("should throw error if teams are locked", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: true,
          },
          error: null,
        }),
      });

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow(
        "Teams are locked — the tournament has already started"
      );
    });

    it("should throw error if team not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership (not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow("This team does not belong to your account");
    });

    it("should throw error if team belongs to different user", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership (belongs to different user)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: 999,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow("This team does not belong to your account");
    });

    it("should throw error if team has no pokemon", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: mockAlt.id,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count pokemon in team (empty)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow(
        "This team has no Pokemon. Please select a team with Pokemon"
      );
    });

    it("should throw error if team has null count", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: mockAlt.id,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count pokemon in team (null)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: null,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow(
        "This team has no Pokemon. Please select a team with Pokemon"
      );
    });

    it("should throw error if updating registration fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: null,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: mockAlt.id,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count pokemon in team
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 6,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration (fails)
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        selectTeamForTournament(mockClient, tournamentId, teamId)
      ).rejects.toThrow("Failed to update registration with team");
    });

    it("should successfully replace an existing team selection", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get registration (with existing team)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 500,
            team_id: 900,
            team_locked: false,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Verify team ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: teamId,
            created_by: mockAlt.id,
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Count pokemon in team
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 4,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update registration
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await selectTeamForTournament(
        mockClient,
        tournamentId,
        teamId
      );

      expect(result).toEqual({
        teamId: 1000,
        pokemonCount: 4,
      });
    });
  });
});
