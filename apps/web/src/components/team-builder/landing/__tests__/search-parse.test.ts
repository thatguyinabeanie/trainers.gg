import { describe, it, expect } from "@jest/globals";
import { type TeamWithPokemon } from "@trainers/supabase";
import { type LocalDraftRecord } from "../../persistence/local-drafts-types";
import { parseSearchInput, getSuggestions } from "../search-parse";

// =============================================================================
// Fixture helpers
// =============================================================================

function makeTeam(
  overrides: Partial<{
    name: string;
    format: string | null;
    teamPokemon: TeamWithPokemon["team_pokemon"];
  }> = {}
): TeamWithPokemon {
  return {
    id: -1,
    name: overrides.name ?? "My Team",
    // Use `in` check so callers can explicitly pass format: null
    format: "format" in overrides ? overrides.format ?? null : "gen9vgc2025regg",
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
  species = "Pikachu"
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species,
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
      is_shiny: false,
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
  };
}

function makeRecord(
  overrides: Partial<{
    id: string;
    team: TeamWithPokemon;
    updatedAt: string;
  }> = {}
): LocalDraftRecord {
  return {
    id: overrides.id ?? "local-ab12",
    team: overrides.team ?? makeTeam(),
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2024-06-01T00:00:00Z",
  };
}

// =============================================================================
// parseSearchInput — empty / whitespace
// =============================================================================

describe("parseSearchInput — empty input", () => {
  it.each(["", "  ", "\t"])(
    "returns empty predicates and text for %j",
    (input) => {
      const result = parseSearchInput(input);
      expect(result.predicates).toEqual([]);
      expect(result.text).toBe("");
    }
  );
});

// =============================================================================
// parseSearchInput — text tokens
// =============================================================================

describe("parseSearchInput — plain text tokens", () => {
  it("treats an unqualified word as a text predicate", () => {
    const result = parseSearchInput("gholdengo");
    expect(result.predicates).toEqual([{ kind: "text", value: "gholdengo" }]);
    expect(result.text).toBe("gholdengo");
  });

  it("accumulates multiple unqualified words into separate text predicates", () => {
    const result = parseSearchInput("trick room");
    expect(result.predicates).toEqual([
      { kind: "text", value: "trick" },
      { kind: "text", value: "room" },
    ]);
    expect(result.text).toBe("trick room");
  });

  it("preserves a quoted multi-word value as a single text predicate", () => {
    const result = parseSearchInput('"trick room"');
    expect(result.predicates).toEqual([{ kind: "text", value: "trick room" }]);
    expect(result.text).toBe("trick room");
  });
});

// =============================================================================
// parseSearchInput — field predicates
// =============================================================================

describe("parseSearchInput — field predicates", () => {
  it.each([
    ["name:sun", "name", "sun"],
    ["species:miraidon", "species", "miraidon"],
    ["ability:drizzle", "ability", "drizzle"],
    ["item:leftovers", "item", "leftovers"],
    ["move:protect", "move", "protect"],
    ["tera:steel", "tera", "steel"],
  ] as const)(
    "parses %s as field predicate field=%s value=%s",
    (input, expectedField, expectedValue) => {
      const result = parseSearchInput(input);
      expect(result.predicates).toEqual([
        { kind: "field", field: expectedField, value: expectedValue },
      ]);
      expect(result.text).toBe("");
    }
  );

  it("parses a quoted field value containing spaces", () => {
    const result = parseSearchInput('move:"Trick Room"');
    expect(result.predicates).toEqual([
      { kind: "field", field: "move", value: "Trick Room" },
    ]);
    expect(result.text).toBe("");
  });

  it("parses name with a quoted value containing spaces", () => {
    const result = parseSearchInput('name:"Sun Team"');
    expect(result.predicates).toEqual([
      { kind: "field", field: "name", value: "Sun Team" },
    ]);
    expect(result.text).toBe("");
  });
});

// =============================================================================
// parseSearchInput — flag predicates
// =============================================================================

describe("parseSearchInput — flag predicates", () => {
  it.each(["complete", "incomplete", "legal", "illegal"] as const)(
    "parses is:%s as flag predicate",
    (flag) => {
      const result = parseSearchInput(`is:${flag}`);
      expect(result.predicates).toEqual([{ kind: "flag", flag }]);
      expect(result.text).toBe("");
    }
  );

  it("treats is:<unknown> as text", () => {
    const result = parseSearchInput("is:pinned");
    expect(result.predicates).toEqual([{ kind: "text", value: "is:pinned" }]);
    expect(result.text).toBe("is:pinned");
  });
});

// =============================================================================
// parseSearchInput — format predicate
// =============================================================================

describe("parseSearchInput — format predicate", () => {
  it("parses format:gen9vgc2025regg as format predicate", () => {
    const result = parseSearchInput("format:gen9vgc2025regg");
    expect(result.predicates).toEqual([
      { kind: "format", value: "gen9vgc2025regg" },
    ]);
    expect(result.text).toBe("");
  });
});

// =============================================================================
// parseSearchInput — updated_within predicate
// =============================================================================

describe("parseSearchInput — updated_within predicate", () => {
  it.each([
    ["updated:7d", 7],
    ["updated:30d", 30],
    ["updated:1d", 1],
  ] as const)(
    "parses %s as updated_within(%i)",
    (input, expectedDays) => {
      const result = parseSearchInput(input);
      expect(result.predicates).toEqual([
        { kind: "updated_within", days: expectedDays },
      ]);
      expect(result.text).toBe("");
    }
  );

  it("treats updated:<non-day-value> as text", () => {
    const result = parseSearchInput("updated:yesterday");
    expect(result.predicates).toEqual([
      { kind: "text", value: "updated:yesterday" },
    ]);
  });

  it("treats updated:0d as text (zero days is not valid)", () => {
    const result = parseSearchInput("updated:0d");
    // 0 days would be parsed as days=0 which fails the >0 guard
    expect(result.predicates).toEqual([
      { kind: "text", value: "updated:0d" },
    ]);
  });
});

// =============================================================================
// parseSearchInput — unknown key falls back to text
// =============================================================================

describe("parseSearchInput — unknown key:value falls back to text", () => {
  it.each([
    "pinned:true",
    "archived:false",
    "foo:bar",
    "xyzzy:whatever",
  ])(
    "treats unknown key %s as text predicate",
    (input) => {
      const result = parseSearchInput(input);
      expect(result.predicates).toEqual([{ kind: "text", value: input }]);
      expect(result.text).toBe(input);
    }
  );
});

// =============================================================================
// parseSearchInput — mixed input
// =============================================================================

describe("parseSearchInput — mixed input", () => {
  it("parses a combination of field, flag, format, and text tokens", () => {
    const result = parseSearchInput(
      'species:miraidon is:complete format:gen9vgc2025regg sunteam'
    );
    expect(result.predicates).toEqual([
      { kind: "field", field: "species", value: "miraidon" },
      { kind: "flag", flag: "complete" },
      { kind: "format", value: "gen9vgc2025regg" },
      { kind: "text", value: "sunteam" },
    ]);
    expect(result.text).toBe("sunteam");
  });

  it("parses updated_within alongside a field predicate", () => {
    const result = parseSearchInput("updated:7d move:protect");
    expect(result.predicates).toEqual([
      { kind: "updated_within", days: 7 },
      { kind: "field", field: "move", value: "protect" },
    ]);
    expect(result.text).toBe("");
  });

  it("mixes quoted and unquoted tokens correctly", () => {
    const result = parseSearchInput('name:"Sun Team" is:legal');
    expect(result.predicates).toEqual([
      { kind: "field", field: "name", value: "Sun Team" },
      { kind: "flag", flag: "legal" },
    ]);
    expect(result.text).toBe("");
  });

  it("handles multiple text tokens among structured predicates", () => {
    const result = parseSearchInput("trick room species:incineroar");
    expect(result.predicates).toEqual([
      { kind: "text", value: "trick" },
      { kind: "text", value: "room" },
      { kind: "field", field: "species", value: "incineroar" },
    ]);
    expect(result.text).toBe("trick room");
  });
});

// =============================================================================
// getSuggestions — grouping and structure
// =============================================================================

describe("getSuggestions — groups", () => {
  const noRecords: readonly LocalDraftRecord[] = [];

  it("always returns Fields group with all field keys", () => {
    const suggestions = getSuggestions("", noRecords);
    const fields = suggestions.filter((s) => s.group === "Fields");
    const fieldLabels = fields.map((s) => s.insert);
    expect(fieldLabels).toContain("name:");
    expect(fieldLabels).toContain("species:");
    expect(fieldLabels).toContain("ability:");
    expect(fieldLabels).toContain("item:");
    expect(fieldLabels).toContain("move:");
    expect(fieldLabels).toContain("tera:");
  });

  it("always returns Flags group with all flag tokens", () => {
    const suggestions = getSuggestions("", noRecords);
    const flags = suggestions.filter((s) => s.group === "Flags");
    const flagInserts = flags.map((s) => s.insert);
    expect(flagInserts).toContain("is:complete");
    expect(flagInserts).toContain("is:incomplete");
    expect(flagInserts).toContain("is:legal");
    expect(flagInserts).toContain("is:illegal");
  });

  it("returns no Formats suggestions when records have no format", () => {
    const records = [makeRecord({ team: makeTeam({ format: null }) })];
    const suggestions = getSuggestions("", records);
    const formats = suggestions.filter((s) => s.group === "Formats");
    expect(formats).toHaveLength(0);
  });

  it("returns Formats from drafts — deduplicated and sorted", () => {
    const records = [
      makeRecord({ id: "local-1", team: makeTeam({ format: "gen9vgc2025regg" }) }),
      makeRecord({ id: "local-2", team: makeTeam({ format: "gen9championsvgc2026regma" }) }),
      makeRecord({ id: "local-3", team: makeTeam({ format: "gen9vgc2025regg" }) }), // duplicate
    ];
    const suggestions = getSuggestions("", records);
    const formats = suggestions.filter((s) => s.group === "Formats");
    const inserts = formats.map((s) => s.insert);
    // Deduplicated — only 2 unique formats
    expect(inserts).toHaveLength(2);
    // Sorted alphabetically
    expect(inserts[0]).toBe("format:gen9championsvgc2026regma");
    expect(inserts[1]).toBe("format:gen9vgc2025regg");
  });

  it("returns Species from filled slots — deduplicated and sorted", () => {
    const records = [
      makeRecord({
        id: "local-1",
        team: makeTeam({
          teamPokemon: [
            makePokemonSlot(1, 0, "Miraidon"),
            makePokemonSlot(2, 1, "Incineroar"),
          ],
        }),
      }),
      makeRecord({
        id: "local-2",
        team: makeTeam({
          teamPokemon: [
            makePokemonSlot(3, 0, "Miraidon"), // duplicate
            makePokemonSlot(4, 1, "Amoonguss"),
          ],
        }),
      }),
    ];
    const suggestions = getSuggestions("", records);
    const species = suggestions.filter((s) => s.group === "Species");
    const inserts = species.map((s) => s.insert);
    // Deduplicated and sorted
    expect(inserts).toEqual([
      "species:Amoonguss",
      "species:Incineroar",
      "species:Miraidon",
    ]);
  });

  it("returns no Species suggestions for records with no filled slots", () => {
    const records = [makeRecord({ team: makeTeam({ teamPokemon: [] }) })];
    const suggestions = getSuggestions("", records);
    const species = suggestions.filter((s) => s.group === "Species");
    expect(species).toHaveLength(0);
  });
});

describe("getSuggestions — capping at MAX_PER_GROUP (8)", () => {
  it("caps Species at 8 when more than 8 unique species exist", () => {
    const manySpecies = [
      "Abomasnow", "Abomasnow2", "Abomasnow3", "Abomasnow4",
      "Abomasnow5", "Abomasnow6", "Abomasnow7", "Abomasnow8",
      "Abomasnow9", "Abomasnow10",
    ];
    const records = manySpecies.map((species, i) =>
      makeRecord({
        id: `local-${i}`,
        team: makeTeam({ teamPokemon: [makePokemonSlot(i, 0, species)] }),
      })
    );
    const suggestions = getSuggestions("", records);
    const species = suggestions.filter((s) => s.group === "Species");
    expect(species.length).toBeLessThanOrEqual(8);
  });

  it("caps Formats at 8 when more than 8 unique formats exist", () => {
    const manyFormats = Array.from({ length: 10 }, (_, i) => `format${i}`);
    const records = manyFormats.map((format, i) =>
      makeRecord({ id: `local-${i}`, team: makeTeam({ format }) })
    );
    const suggestions = getSuggestions("", records);
    const formats = suggestions.filter((s) => s.group === "Formats");
    expect(formats.length).toBeLessThanOrEqual(8);
  });
});

describe("getSuggestions — determinism", () => {
  it("returns the same result given the same input", () => {
    const records = [
      makeRecord({
        team: makeTeam({
          format: "gen9vgc2025regg",
          teamPokemon: [makePokemonSlot(1, 0, "Gholdengo")],
        }),
      }),
    ];
    const first = getSuggestions("", records);
    const second = getSuggestions("", records);
    expect(first).toEqual(second);
  });
});

describe("getSuggestions — ignores null species slots", () => {
  it("does not add null species to Species group", () => {
    const records = [
      makeRecord({
        team: makeTeam({
          teamPokemon: [
            {
              id: 1,
              pokemon_id: 1,
              team_position: 0,
              pokemon: null, // null slot
            },
          ],
        }),
      }),
    ];
    const suggestions = getSuggestions("", records);
    const species = suggestions.filter((s) => s.group === "Species");
    expect(species).toHaveLength(0);
  });
});
