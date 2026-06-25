import { describe, it, expect } from "@jest/globals";
import { type TeamWithPokemon } from "@trainers/supabase";
import {
  draftEditorHref,
  toDraftSummary,
  UNTITLED_DRAFT_NAME,
} from "../team-landing-shared";
import { type LocalDraftRecord } from "../../persistence/local-drafts-types";

// =============================================================================
// Fixture helpers
// =============================================================================

/**
 * Build a complete TeamWithPokemon fixture with all required columns.
 * Shape mirrors createEmptyTeam() in persistence/use-local-team-storage.ts.
 */
function makeTeam(
  overrides: Partial<{
    name: string;
    format: string | null;
    teamPokemon: TeamWithPokemon["team_pokemon"];
  }> = {}
): TeamWithPokemon {
  return {
    id: -1,
    name: overrides.name !== undefined ? overrides.name : "My Team",
    format: overrides.format !== undefined ? overrides.format : "gen9vgc2025regg",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: -1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    team_pokemon: overrides.teamPokemon ?? [],
  };
}

function makePokemonSlot(
  id: number,
  position: number,
  options: { species?: string; isShiny?: boolean | null } = {}
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species: options.species ?? "Pikachu",
      ability: "Static",
      move1: "Thunderbolt",
      move2: null,
      move3: null,
      move4: null,
      nature: "Timid",
      nickname: null,
      notes: null,
      held_item: null,
      tera_type: null,
      gender: null,
      is_shiny: options.isShiny !== undefined ? options.isShiny : false,
      level: 50,
      format_legal: null,
      created_at: "2024-01-01T00:00:00Z",
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      iv_hp: 31,
      iv_attack: 31,
      iv_defense: 31,
      iv_special_attack: 31,
      iv_special_defense: 31,
      iv_speed: 31,
    },
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeNullSlot(id: number, position: number): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: null,
  } as TeamWithPokemon["team_pokemon"][number];
}

function makeRecord(
  overrides: Partial<{
    id: string;
    name: string;
    format: string | null;
    teamPokemon: TeamWithPokemon["team_pokemon"];
    updatedAt: string;
  }> = {}
): LocalDraftRecord {
  return {
    id: overrides.id ?? "local-ab12",
    team: makeTeam({
      name: overrides.name,
      format: overrides.format,
      teamPokemon: overrides.teamPokemon,
    }),
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2024-06-01T00:00:00Z",
  };
}

// =============================================================================
// toDraftSummary
// =============================================================================

describe("toDraftSummary", () => {
  describe("empty team", () => {
    it("returns filledCount 0 and empty species array when team_pokemon is empty", () => {
      const record = makeRecord({ teamPokemon: [] });
      const summary = toDraftSummary(record);

      expect(summary.filledCount).toBe(0);
      expect(summary.species).toEqual([]);
    });

    it("falls back to UNTITLED_DRAFT_NAME when team.name is empty string", () => {
      const record = makeRecord({ name: "" });
      const summary = toDraftSummary(record);

      expect(summary.name).toBe(UNTITLED_DRAFT_NAME);
    });

    it("falls back to UNTITLED_DRAFT_NAME when team.name is whitespace only", () => {
      const record = makeRecord({ name: "   " });
      const summary = toDraftSummary(record);

      expect(summary.name).toBe(UNTITLED_DRAFT_NAME);
    });

    it("falls back to UNTITLED_DRAFT_NAME when team.name is null at runtime", () => {
      // Tables<"teams">.name is typed string, but defensive runtime null-handling
      // in toDraftSummary uses optional chaining. This tests that guard.
      const record: LocalDraftRecord = {
        id: "local-ab12",
        team: { ...makeTeam(), name: null as unknown as string },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
      };
      const summary = toDraftSummary(record);

      expect(summary.name).toBe(UNTITLED_DRAFT_NAME);
    });
  });

  describe("slot ordering", () => {
    it("returns species ordered by team_position ascending regardless of input order", () => {
      // Positions provided out of order: 2, 0, 1
      const record = makeRecord({
        teamPokemon: [
          makePokemonSlot(10, 2, { species: "Charizard" }),
          makePokemonSlot(11, 0, { species: "Pikachu" }),
          makePokemonSlot(12, 1, { species: "Eevee" }),
        ],
      });
      const summary = toDraftSummary(record);

      expect(summary.filledCount).toBe(3);
      expect(summary.species.map((s) => s.species)).toEqual([
        "Pikachu",
        "Eevee",
        "Charizard",
      ]);
    });
  });

  describe("null pokemon slots", () => {
    it("excludes null-pokemon slots from species and filledCount", () => {
      const record = makeRecord({
        teamPokemon: [
          makePokemonSlot(1, 0, { species: "Bulbasaur" }),
          makeNullSlot(2, 1),
          makePokemonSlot(3, 2, { species: "Squirtle" }),
          makeNullSlot(4, 3),
        ],
      });
      const summary = toDraftSummary(record);

      expect(summary.filledCount).toBe(2);
      expect(summary.species.map((s) => s.species)).toEqual(["Bulbasaur", "Squirtle"]);
    });
  });

  describe("isShiny mapping", () => {
    it.each([
      [null, false],
      [false, false],
      [true, true],
    ])(
      "maps is_shiny=%s to isShiny=%s",
      (isShiny: boolean | null, expectedIsShiny: boolean) => {
        const record = makeRecord({
          teamPokemon: [makePokemonSlot(1, 0, { isShiny })],
        });
        const summary = toDraftSummary(record);

        expect(summary.species[0]?.isShiny).toBe(expectedIsShiny);
      }
    );
  });

  describe("format passthrough", () => {
    it.each([
      ["gen9vgc2025regg", "gen9vgc2025regg"],
      [null, null],
    ])(
      "passes format %s through unchanged",
      (format: string | null, expected: string | null) => {
        const record = makeRecord({ format });
        const summary = toDraftSummary(record);

        expect(summary.format).toBe(expected);
      }
    );
  });

  describe("passthrough fields", () => {
    it("copies id and updatedAt from the record", () => {
      const record = makeRecord({ id: "local-zz99", updatedAt: "2025-12-31T23:59:00Z" });
      const summary = toDraftSummary(record);

      expect(summary.id).toBe("local-zz99");
      expect(summary.updatedAt).toBe("2025-12-31T23:59:00Z");
    });

    it("trims surrounding whitespace from team.name", () => {
      const record = makeRecord({ name: "  Trick Room Squad  " });
      const summary = toDraftSummary(record);

      expect(summary.name).toBe("Trick Room Squad");
    });
  });
});

// =============================================================================
// draftEditorHref
// =============================================================================

describe("draftEditorHref", () => {
  it("returns the correct editor route for a draft id", () => {
    expect(draftEditorHref("local-ab12")).toBe("/builder/t/local-ab12");
  });

  it("works with arbitrary string ids", () => {
    expect(draftEditorHref("local-zz99")).toBe("/builder/t/local-zz99");
  });
});
