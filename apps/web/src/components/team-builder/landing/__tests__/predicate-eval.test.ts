import { describe, it, expect } from "@jest/globals";
import { type TeamWithPokemon } from "@trainers/supabase";
import { type LocalDraftRecord } from "../../persistence/local-drafts-types";
import { evaluateDraft, filterDrafts } from "../predicate-eval";
import { type ParsedQuery } from "../search-types";

// =============================================================================
// Fixture helpers
// =============================================================================

/**
 * Build a full TeamWithPokemon fixture. Shape mirrors createEmptyTeam() in
 * persistence/local-drafts-store.ts.
 */
function makeTeam(
  overrides: Partial<{
    name: string;
    format: string | null;
    format_legal: boolean | null;
    teamPokemon: TeamWithPokemon["team_pokemon"];
  }> = {}
): TeamWithPokemon {
  return {
    id: -1,
    name: overrides.name ?? "My Team",
    // Use `in` check so callers can explicitly pass format: null
    format: "format" in overrides ? overrides.format ?? null : "gen9vgc2025regg",
    format_legal: "format_legal" in overrides ? overrides.format_legal ?? null : null,
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

/** Build a filled slot with all required fields. */
function makePokemonSlot(
  id: number,
  position: number,
  options: {
    species?: string;
    ability?: string;
    move1?: string;
    move2?: string | null;
    move3?: string | null;
    move4?: string | null;
    held_item?: string | null;
    tera_type?: string | null;
    format_legal?: boolean | null;
    is_shiny?: boolean | null;
  } = {}
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species: options.species ?? "Pikachu",
      ability: options.ability ?? "Static",
      move1: options.move1 ?? "Thunderbolt",
      move2: options.move2 ?? null,
      move3: options.move3 ?? null,
      move4: options.move4 ?? null,
      nature: "Timid",
      nickname: null,
      notes: null,
      held_item: options.held_item ?? null,
      tera_type: options.tera_type ?? null,
      gender: null,
      is_shiny: options.is_shiny ?? false,
      level: 50,
      format_legal: options.format_legal ?? null,
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

/** Build a null slot (position placeholder with no pokemon). */
function makeNullSlot(id: number, position: number): TeamWithPokemon["team_pokemon"][number] {
  return { id, pokemon_id: id, team_position: position, pokemon: null };
}

/** Build a LocalDraftRecord wrapping a team. */
function makeRecord(
  overrides: Partial<{
    id: string;
    team: TeamWithPokemon;
    createdAt: string;
    updatedAt: string;
  }> = {}
): LocalDraftRecord {
  return {
    id: overrides.id ?? "local-ab12",
    team: overrides.team ?? makeTeam(),
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2024-06-01T00:00:00Z",
  };
}

/** Build a ParsedQuery with a single predicate. */
function singlePredicate(
  predicate: ParsedQuery["predicates"][number]
): ParsedQuery {
  return {
    predicates: [predicate],
    text: predicate.kind === "text" ? predicate.value : "",
  };
}

/** Empty query — matches everything. */
const EMPTY_QUERY: ParsedQuery = { predicates: [], text: "" };

/**
 * Build a record with exactly 6 filled, complete slots
 * (each has a truthy ability and move1).
 */
function makeCompleteRecord(id = "local-complete"): LocalDraftRecord {
  return makeRecord({
    id,
    team: makeTeam({
      teamPokemon: [
        makePokemonSlot(1, 0, { species: "Rillaboom" }),
        makePokemonSlot(2, 1, { species: "Miraidon" }),
        makePokemonSlot(3, 2, { species: "Gholdengo" }),
        makePokemonSlot(4, 3, { species: "Amoonguss" }),
        makePokemonSlot(5, 4, { species: "Incineroar" }),
        makePokemonSlot(6, 5, { species: "Urshifu" }),
      ],
    }),
  });
}

// =============================================================================
// evaluateDraft — empty query
// =============================================================================

describe("evaluateDraft — empty query", () => {
  it("matches any record with score 0 and no reasons", () => {
    const record = makeRecord();
    const match = evaluateDraft(record, EMPTY_QUERY);
    expect(match).not.toBeNull();
    expect(match?.score).toBe(0);
    expect(match?.reasons).toEqual([]);
    expect(match?.matchedSpecies).toEqual([]);
  });

  it("returns the correct id", () => {
    const record = makeRecord({ id: "local-zz99" });
    const match = evaluateDraft(record, EMPTY_QUERY);
    expect(match?.id).toBe("local-zz99");
  });
});

// =============================================================================
// evaluateDraft — text predicate
// =============================================================================

describe("evaluateDraft — text predicate", () => {
  it("matches on team name (case-insensitive)", () => {
    const record = makeRecord({ team: makeTeam({ name: "Trick Room Squad" }) });
    const match = evaluateDraft(record, singlePredicate({ kind: "text", value: "trick room" }));
    expect(match).not.toBeNull();
    expect(match?.reasons.some((r) => r.field === "name")).toBe(true);
  });

  it("matches on species in a filled slot (case-insensitive)", () => {
    const record = makeRecord({
      team: makeTeam({ teamPokemon: [makePokemonSlot(1, 0, { species: "Gholdengo" })] }),
    });
    const match = evaluateDraft(record, singlePredicate({ kind: "text", value: "gholden" }));
    expect(match).not.toBeNull();
    expect(match?.matchedSpecies).toContain("Gholdengo");
    expect(match?.reasons.some((r) => r.field === "species")).toBe(true);
  });

  it("returns null when neither name nor species matches", () => {
    const record = makeRecord({ team: makeTeam({ name: "My Team" }) });
    const match = evaluateDraft(record, singlePredicate({ kind: "text", value: "zzznomatch" }));
    expect(match).toBeNull();
  });

  it("does not double-count a species that appears twice in matchedSpecies", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, { species: "Pikachu" }),
          makePokemonSlot(2, 1, { species: "Pikachu" }),
        ],
      }),
    });
    const match = evaluateDraft(record, singlePredicate({ kind: "text", value: "Pikachu" }));
    expect(match?.matchedSpecies.filter((s) => s === "Pikachu")).toHaveLength(1);
  });
});

// =============================================================================
// evaluateDraft — field predicates
// =============================================================================

describe("evaluateDraft — field: name", () => {
  it("matches team name substring", () => {
    const record = makeRecord({ team: makeTeam({ name: "Sun Team" }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "name", value: "sun" })
    );
    expect(match).not.toBeNull();
  });

  it("returns null when team name does not match", () => {
    const record = makeRecord({ team: makeTeam({ name: "Rain Team" }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "name", value: "sun" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — field: species", () => {
  it("matches any filled slot with the species", () => {
    const record = makeRecord({
      team: makeTeam({ teamPokemon: [makePokemonSlot(1, 0, { species: "Miraidon" })] }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "species", value: "miraidon" })
    );
    expect(match).not.toBeNull();
    expect(match?.matchedSpecies).toContain("Miraidon");
  });

  it("returns null when no slot matches", () => {
    const record = makeRecord({
      team: makeTeam({ teamPokemon: [makePokemonSlot(1, 0, { species: "Bulbasaur" })] }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "species", value: "charmander" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — field: ability", () => {
  it("matches ability on any filled slot", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { ability: "Drizzle" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "ability", value: "drizzle" })
    );
    expect(match).not.toBeNull();
  });

  it("returns null when no slot has the ability", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { ability: "Static" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "ability", value: "drizzle" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — field: item", () => {
  it("matches held_item on any filled slot", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { held_item: "Choice Specs" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "item", value: "specs" })
    );
    expect(match).not.toBeNull();
    expect(match?.matchedSpecies).toContain("Pikachu");
  });

  it("returns null when held_item is null on all slots", () => {
    const record = makeRecord({
      team: makeTeam({ teamPokemon: [makePokemonSlot(1, 0, { held_item: null })] }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "item", value: "specs" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — field: tera", () => {
  it("matches tera_type on any filled slot", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { tera_type: "Steel" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "tera", value: "steel" })
    );
    expect(match).not.toBeNull();
  });

  it("returns null when no slot has the tera type", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { tera_type: "Water" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "tera", value: "fire" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — field: move", () => {
  it.each([
    ["move1", { move1: "Protect" }],
    ["move2", { move2: "Protect" }],
    ["move3", { move3: "Protect" }],
    ["move4", { move4: "Protect" }],
  ] as const)("matches Protect in %s slot", (_slotName, moveOptions) => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, moveOptions as Parameters<typeof makePokemonSlot>[2])],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "move", value: "protect" })
    );
    expect(match).not.toBeNull();
    expect(match?.matchedSpecies).toContain("Pikachu");
  });

  it("returns null when no move matches", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, {
            move1: "Thunderbolt",
            move2: "Volt Switch",
            move3: null,
            move4: null,
          }),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "move", value: "protect" })
    );
    expect(match).toBeNull();
  });
});

// =============================================================================
// evaluateDraft — flag predicates
// =============================================================================

describe("evaluateDraft — flag: complete / incomplete", () => {
  it("complete matches a record with exactly 6 filled slots, each with ability and move1", () => {
    const record = makeCompleteRecord();
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match).not.toBeNull();
  });

  it("complete returns null when fewer than 6 filled slots (5 slots)", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0),
          makePokemonSlot(2, 1),
          makePokemonSlot(3, 2),
          makePokemonSlot(4, 3),
          makePokemonSlot(5, 4),
          // slot 5 is absent — only 5 filled
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match).toBeNull();
  });

  it("complete returns null when a slot has null-pokemon filling the 6th position", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0),
          makePokemonSlot(2, 1),
          makePokemonSlot(3, 2),
          makePokemonSlot(4, 3),
          makePokemonSlot(5, 4),
          makeNullSlot(6, 5), // null slot doesn't count as filled
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match).toBeNull();
  });

  it("complete returns null when a filled slot has empty ability", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, { ability: "" }), // empty ability → not complete
          makePokemonSlot(2, 1),
          makePokemonSlot(3, 2),
          makePokemonSlot(4, 3),
          makePokemonSlot(5, 4),
          makePokemonSlot(6, 5),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match).toBeNull();
  });

  it("complete returns null when a filled slot has empty move1", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, { move1: "" }), // empty move1 → not complete
          makePokemonSlot(2, 1),
          makePokemonSlot(3, 2),
          makePokemonSlot(4, 3),
          makePokemonSlot(5, 4),
          makePokemonSlot(6, 5),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match).toBeNull();
  });

  it("incomplete matches a record that is NOT complete (5 filled slots)", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0),
          makePokemonSlot(2, 1),
          makePokemonSlot(3, 2),
          makePokemonSlot(4, 3),
          makePokemonSlot(5, 4),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "incomplete" })
    );
    expect(match).not.toBeNull();
  });

  it("incomplete returns null for a complete record", () => {
    const record = makeCompleteRecord();
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "incomplete" })
    );
    expect(match).toBeNull();
  });
});

describe("evaluateDraft — flag: legal / illegal", () => {
  it("illegal matches when team.format_legal is false", () => {
    const record = makeRecord({ team: makeTeam({ format_legal: false }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "illegal" })
    );
    expect(match).not.toBeNull();
  });

  it("illegal matches when any filled pokemon.format_legal is false", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, { format_legal: false }),
          makePokemonSlot(2, 1),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "illegal" })
    );
    expect(match).not.toBeNull();
  });

  it("illegal returns null when team.format_legal is null and no pokemon is illegal", () => {
    const record = makeRecord({ team: makeTeam({ format_legal: null }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "illegal" })
    );
    expect(match).toBeNull();
  });

  it("illegal returns null when team.format_legal is true and no pokemon is illegal", () => {
    const record = makeRecord({ team: makeTeam({ format_legal: true }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "illegal" })
    );
    expect(match).toBeNull();
  });

  it("legal matches when format_legal is null and no pokemon is illegal", () => {
    const record = makeRecord({ team: makeTeam({ format_legal: null }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "legal" })
    );
    expect(match).not.toBeNull();
  });

  it("legal returns null when team.format_legal is false", () => {
    const record = makeRecord({ team: makeTeam({ format_legal: false }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "legal" })
    );
    expect(match).toBeNull();
  });

  it("legal returns null when a pokemon has format_legal false", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { format_legal: false })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "legal" })
    );
    expect(match).toBeNull();
  });
});

// =============================================================================
// evaluateDraft — format predicate
// =============================================================================

describe("evaluateDraft — format predicate", () => {
  it("matches format substring (case-insensitive)", () => {
    const record = makeRecord({ team: makeTeam({ format: "gen9vgc2025regg" }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "format", value: "vgc2025" })
    );
    expect(match).not.toBeNull();
    expect(match?.reasons.some((r) => r.field === "format")).toBe(true);
  });

  it("returns null when format does not match", () => {
    const record = makeRecord({ team: makeTeam({ format: "gen9vgc2025regg" }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "format", value: "champions" })
    );
    expect(match).toBeNull();
  });

  it("returns null when team.format is null", () => {
    const record = makeRecord({ team: makeTeam({ format: null }) });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "format", value: "vgc" })
    );
    expect(match).toBeNull();
  });
});

// =============================================================================
// evaluateDraft — updated_within predicate
// =============================================================================

describe("evaluateDraft — updated_within predicate", () => {
  it("matches when updatedAt is within the specified days", () => {
    const nowIso = new Date().toISOString();
    const record = makeRecord({ updatedAt: nowIso });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "updated_within", days: 7 })
    );
    expect(match).not.toBeNull();
  });

  it("returns null when updatedAt is older than the specified days", () => {
    const oldDate = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const record = makeRecord({ updatedAt: oldDate });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "updated_within", days: 7 })
    );
    expect(match).toBeNull();
  });
});

// =============================================================================
// evaluateDraft — AND combination of multiple predicates
// =============================================================================

describe("evaluateDraft — AND semantics (multiple predicates)", () => {
  it("matches only when ALL predicates are satisfied", () => {
    const record = makeRecord({
      team: makeTeam({
        name: "Sun Team",
        format: "gen9vgc2025regg",
        teamPokemon: [makePokemonSlot(1, 0, { species: "Miraidon" })],
      }),
    });

    const query: ParsedQuery = {
      predicates: [
        { kind: "field", field: "name", value: "sun" },
        { kind: "format", value: "vgc" },
        { kind: "field", field: "species", value: "miraidon" },
      ],
      text: "",
    };

    const match = evaluateDraft(record, query);
    expect(match).not.toBeNull();
    expect(match?.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("returns null when one predicate fails even if others match", () => {
    const record = makeRecord({
      team: makeTeam({
        name: "Sun Team",
        format: "gen9vgc2025regg",
        teamPokemon: [makePokemonSlot(1, 0, { species: "Pikachu" })],
      }),
    });

    const query: ParsedQuery = {
      predicates: [
        { kind: "field", field: "name", value: "sun" },
        // This will fail — Pikachu is not Miraidon
        { kind: "field", field: "species", value: "miraidon" },
      ],
      text: "",
    };

    const match = evaluateDraft(record, query);
    expect(match).toBeNull();
  });

  it("accumulates score from all matching predicates", () => {
    const record = makeRecord({
      team: makeTeam({
        name: "Rain Team",
        teamPokemon: [makePokemonSlot(1, 0, { species: "Pelipper" })],
      }),
    });

    const query: ParsedQuery = {
      predicates: [
        { kind: "text", value: "rain" },
        { kind: "field", field: "species", value: "pelipper" },
      ],
      text: "rain",
    };

    const match = evaluateDraft(record, query);
    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThan(5); // both predicates contribute
  });
});

// =============================================================================
// evaluateDraft — matchedSpecies content
// =============================================================================

describe("evaluateDraft — matchedSpecies", () => {
  it("includes species matched by text predicate", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { species: "Gholdengo" })],
      }),
    });
    const match = evaluateDraft(record, singlePredicate({ kind: "text", value: "gholden" }));
    expect(match?.matchedSpecies).toContain("Gholdengo");
  });

  it("includes species matched by species field predicate", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [makePokemonSlot(1, 0, { species: "Amoonguss" })],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "species", value: "amoong" })
    );
    expect(match?.matchedSpecies).toContain("Amoonguss");
  });

  it("includes species matched by move field predicate", () => {
    const record = makeRecord({
      team: makeTeam({
        teamPokemon: [
          makePokemonSlot(1, 0, { species: "Incineroar", move1: "Fake Out" }),
          makePokemonSlot(2, 1, { species: "Rillaboom", move1: "Grassy Glide" }),
        ],
      }),
    });
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "field", field: "move", value: "fake out" })
    );
    expect(match?.matchedSpecies).toContain("Incineroar");
    expect(match?.matchedSpecies).not.toContain("Rillaboom");
  });

  it("does not populate matchedSpecies for flag predicates", () => {
    const record = makeCompleteRecord();
    const match = evaluateDraft(
      record,
      singlePredicate({ kind: "flag", flag: "complete" })
    );
    expect(match?.matchedSpecies).toHaveLength(0);
  });
});

// =============================================================================
// filterDrafts
// =============================================================================

describe("filterDrafts", () => {
  it("returns all records on an empty query", () => {
    const records = [
      makeRecord({ id: "local-1" }),
      makeRecord({ id: "local-2" }),
      makeRecord({ id: "local-3" }),
    ];
    const result = filterDrafts(records, EMPTY_QUERY);
    expect(result).toHaveLength(3);
  });

  it("excludes drafts that do not match", () => {
    const records = [
      makeRecord({
        id: "local-1",
        team: makeTeam({ name: "Sun Team" }),
      }),
      makeRecord({
        id: "local-2",
        team: makeTeam({ name: "Rain Team" }),
      }),
    ];
    const result = filterDrafts(
      records,
      singlePredicate({ kind: "field", field: "name", value: "sun" })
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("local-1");
  });

  it("returns results sorted by score descending", () => {
    // local-2 gets both name + species match (higher score); local-1 gets name only
    const records = [
      makeRecord({
        id: "local-1",
        team: makeTeam({ name: "Sun Team", teamPokemon: [] }),
      }),
      makeRecord({
        id: "local-2",
        team: makeTeam({
          name: "Sun Team",
          teamPokemon: [makePokemonSlot(1, 0, { species: "Sun" })],
        }),
      }),
    ];
    // text predicate matching "sun"
    const result = filterDrafts(
      records,
      singlePredicate({ kind: "text", value: "sun" })
    );
    expect(result.length).toBe(2);
    expect(result[0]?.id).toBe("local-2"); // higher score first
    expect(result[1]?.id).toBe("local-1");
  });

  it("is stable — preserves original order among equal-score records", () => {
    const records = [
      makeRecord({ id: "local-a", team: makeTeam({ name: "Team A" }) }),
      makeRecord({ id: "local-b", team: makeTeam({ name: "Team B" }) }),
      makeRecord({ id: "local-c", team: makeTeam({ name: "Team C" }) }),
    ];
    const result = filterDrafts(
      records,
      // All three match "team" with the same score (name match only)
      singlePredicate({ kind: "field", field: "name", value: "team" })
    );
    expect(result.map((r) => r.id)).toEqual(["local-a", "local-b", "local-c"]);
  });

  it("returns empty array when no drafts match", () => {
    const records = [
      makeRecord({ id: "local-1", team: makeTeam({ name: "Rain Team" }) }),
    ];
    const result = filterDrafts(
      records,
      singlePredicate({ kind: "field", field: "name", value: "sun" })
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array on empty input", () => {
    const result = filterDrafts(
      [],
      singlePredicate({ kind: "text", value: "anything" })
    );
    expect(result).toHaveLength(0);
  });
});
