/**
 * Unit tests for the pure slot-row compiler in usage/compile.ts.
 *
 * All functions are pure (no DB / framework deps) so tests are simple
 * input → output assertions. Coverage targets 80%+ on the compile module.
 *
 * Test matrix covers:
 * - Per-source fixture shapes (rk9, limitless, trainers.gg)
 * - total_players: distinct-player counting per division group
 * - moves filtering (nulls/empties dropped, order preserved)
 * - Empty/whitespace species rows are skipped
 * - Forbidden fields never emitted (EVs, IVs, gender, level, player names)
 * - Empty input → empty output
 */

import { describe, it, expect } from "@jest/globals";
import { rawSlotFactory } from "@trainers/test-utils/factories";

import {
  buildTeamSlotRows,
  type EventMeta,
  type RawSlotRow,
  type TeamSlotRow,
} from "../compile";

// =============================================================================
// Test fixtures / factories
// =============================================================================

/** Base RK9 event metadata. */
const rk9Meta: EventMeta = {
  source: "rk9",
  eventKey: "rk9:TO027",
  format: "gen9vgc2025regg",
  eventDate: "2025-03-15",
  eventTier: "regional",
  isOnline: false,
};

/** Base Limitless event metadata. */
const limitlessMeta: EventMeta = {
  source: "limitless",
  eventKey: "limitless:abc123",
  format: "gen9vgc2025regg",
  eventDate: "2025-04-01",
  eventTier: null,
  isOnline: true,
};

/** Base trainers.gg event metadata. */
const trainersMeta: EventMeta = {
  source: "trainers.gg",
  eventKey: "trainers.gg:42",
  format: "gen9vgc2025regg",
  eventDate: "2025-05-10",
  eventTier: null,
  isOnline: true,
};

/**
 * Build a RawSlotRow via the shared Fishery factory.
 * playerKey + species stay required so fixtures remain self-describing.
 */
function rawSlot(
  overrides: Partial<RawSlotRow> & { playerKey: string; species: string }
): RawSlotRow {
  return rawSlotFactory.build(overrides);
}

// =============================================================================
// Empty input
// =============================================================================

describe("buildTeamSlotRows — empty input", () => {
  it("returns [] when raw is empty", () => {
    expect(buildTeamSlotRows(rk9Meta, [])).toEqual([]);
  });
});

// =============================================================================
// RK9 source fixture
// =============================================================================

describe("buildTeamSlotRows — rk9 shaped fixture", () => {
  it("maps rk9 fields correctly: division, placement, no W/L/T, stat_alignment→nature, is_online=false", () => {
    const raw: RawSlotRow[] = [
      rawSlot({
        playerKey: "rk9:standing:101",
        division: "masters",
        placement: 3,
        wins: null,
        losses: null,
        ties: null,
        country: "US",
        position: 1,
        species: "calyrex-ice-rider",
        heldItem: "never-melt-ice",
        ability: "as-one",
        teraType: "ice",
        moves: ["glacial-lance", "ice-spinner", "trick-room", "protect"],
        // stat_alignment already mapped to nature by the reader
        nature: "brave",
      }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result).toHaveLength(1);

    const row = result[0]!;
    expect(row.source).toBe("rk9");
    expect(row.event_key).toBe("rk9:TO027");
    expect(row.format).toBe("gen9vgc2025regg");
    expect(row.event_date).toBe("2025-03-15");
    expect(row.event_tier).toBe("regional");
    expect(row.is_online).toBe(false);
    expect(row.player_key).toBe("rk9:standing:101");
    expect(row.division).toBe("masters");
    expect(row.placement).toBe(3);
    expect(row.wins).toBeNull();
    expect(row.losses).toBeNull();
    expect(row.ties).toBeNull();
    expect(row.country).toBe("US");
    expect(row.position).toBe(1);
    expect(row.species).toBe("calyrex-ice-rider");
    expect(row.held_item).toBe("never-melt-ice");
    expect(row.ability).toBe("as-one");
    expect(row.tera_type).toBe("ice");
    expect(row.moves).toEqual([
      "glacial-lance",
      "ice-spinner",
      "trick-room",
      "protect",
    ]);
    expect(row.nature).toBe("brave");
  });

  it("stamps event_tier from rk9 meta on all rows", () => {
    const raw = [
      rawSlot({ playerKey: "p1", species: "incineroar", division: "masters" }),
    ];
    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result[0]?.event_tier).toBe("regional");
  });
});

// =============================================================================
// Limitless source fixture
// =============================================================================

describe("buildTeamSlotRows — limitless shaped fixture", () => {
  it("maps limitless fields correctly: W/L/T populated, nature null, event_tier null", () => {
    const raw: RawSlotRow[] = [
      rawSlot({
        playerKey: "limitless:reg:55",
        division: null,
        placement: 1,
        wins: 7,
        losses: 0,
        ties: 1,
        country: "JP",
        position: 2,
        species: "flutter-mane",
        heldItem: "booster-energy",
        ability: "protosynthesis",
        teraType: "fairy",
        moves: ["moonblast", "shadow-ball", "dazzling-gleam", "protect"],
        // Limitless does not capture nature
        nature: null,
      }),
    ];

    const result = buildTeamSlotRows(limitlessMeta, raw);
    expect(result).toHaveLength(1);

    const row = result[0]!;
    expect(row.source).toBe("limitless");
    expect(row.event_tier).toBeNull();
    expect(row.is_online).toBe(true);
    expect(row.wins).toBe(7);
    expect(row.losses).toBe(0);
    expect(row.ties).toBe(1);
    expect(row.nature).toBeNull();
    expect(row.division).toBeNull();
    expect(row.moves).toEqual([
      "moonblast",
      "shadow-ball",
      "dazzling-gleam",
      "protect",
    ]);
  });
});

// =============================================================================
// trainers.gg source fixture
// =============================================================================

describe("buildTeamSlotRows — trainers.gg shaped fixture", () => {
  it("maps first-party fields correctly: nature populated, placement null, is_online true", () => {
    const raw: RawSlotRow[] = [
      rawSlot({
        playerKey: "tgg:reg:7",
        division: null,
        placement: null,
        wins: 3,
        losses: 2,
        ties: 0,
        country: "GB",
        position: 3,
        species: "koraidon",
        heldItem: "clear-amulet",
        ability: "orichalcum-pulse",
        teraType: "fire",
        moves: ["flare-blitz", "close-combat", "collision-course", "protect"],
        nature: "adamant",
      }),
    ];

    const result = buildTeamSlotRows(trainersMeta, raw);
    expect(result).toHaveLength(1);

    const row = result[0]!;
    expect(row.source).toBe("trainers.gg");
    expect(row.event_key).toBe("trainers.gg:42");
    expect(row.is_online).toBe(true);
    expect(row.placement).toBeNull();
    expect(row.nature).toBe("adamant");
    expect(row.division).toBeNull();
    expect(row.event_tier).toBeNull();
  });
});

// =============================================================================
// total_players: distinct-player counting per division group
// =============================================================================

describe("buildTeamSlotRows — total_players per division group", () => {
  it("counts distinct playerKeys within each division separately", () => {
    // Player p1 and p2 in masters; p3 in senior
    // Each player has 6 slots → 12 raw rows total
    const mastersSlots = Array.from({ length: 6 }, (_, i) =>
      rawSlot({
        playerKey: "rk9:1",
        species: "species-a",
        division: "masters",
        position: i + 1,
      })
    ).concat(
      Array.from({ length: 6 }, (_, i) =>
        rawSlot({
          playerKey: "rk9:2",
          species: "species-b",
          division: "masters",
          position: i + 1,
        })
      )
    );
    const seniorSlots = Array.from({ length: 6 }, (_, i) =>
      rawSlot({
        playerKey: "rk9:3",
        species: "species-c",
        division: "senior",
        position: i + 1,
      })
    );

    const result = buildTeamSlotRows(rk9Meta, [
      ...mastersSlots,
      ...seniorSlots,
    ]);

    const mastersRows = result.filter((r) => r.division === "masters");
    const seniorRows = result.filter((r) => r.division === "senior");

    // Masters has 2 distinct players → total_players = 2
    expect(mastersRows.every((r) => r.total_players === 2)).toBe(true);
    // Senior has 1 distinct player → total_players = 1
    expect(seniorRows.every((r) => r.total_players === 1)).toBe(true);
  });

  it("counts a player with 6 slots as exactly 1 toward total_players", () => {
    const raw = Array.from({ length: 6 }, (_, i) =>
      rawSlot({
        playerKey: "solo",
        species: `species-${i + 1}`,
        position: i + 1,
      })
    );

    const result = buildTeamSlotRows(limitlessMeta, raw);
    expect(result).toHaveLength(6);
    // Every row should show total_players = 1 (one distinct player)
    expect(result.every((r) => r.total_players === 1)).toBe(true);
  });

  it("groups null-division rows together for total_players", () => {
    // Two players, both with null division
    const raw = [
      rawSlot({ playerKey: "alpha", species: "incineroar", division: null }),
      rawSlot({ playerKey: "beta", species: "flutter-mane", division: null }),
    ];

    const result = buildTeamSlotRows(limitlessMeta, raw);
    // Both rows should see total_players = 2 (2 distinct null-division players)
    expect(result.every((r) => r.total_players === 2)).toBe(true);
  });

  it("keeps division-group counts independent when both null and non-null divisions exist", () => {
    const raw = [
      rawSlot({
        playerKey: "m1",
        species: "calyrex-ice-rider",
        division: "masters",
      }),
      rawSlot({ playerKey: "m2", species: "incineroar", division: "masters" }),
      rawSlot({ playerKey: "u1", species: "flutter-mane", division: null }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    const mastersRows = result.filter((r) => r.division === "masters");
    const nullDivRows = result.filter((r) => r.division === null);

    expect(mastersRows.every((r) => r.total_players === 2)).toBe(true);
    expect(nullDivRows.every((r) => r.total_players === 1)).toBe(true);
  });
});

// =============================================================================
// moves filtering
// =============================================================================

describe("buildTeamSlotRows — moves filtering", () => {
  it.each([
    [
      "null entries dropped, order preserved",
      ["fake-out", null, "parting-shot", null],
      ["fake-out", "parting-shot"],
    ],
    [
      "empty-string entries dropped",
      ["fake-out", "", "parting-shot", ""],
      ["fake-out", "parting-shot"],
    ],
    [
      "whitespace-only entries dropped",
      ["fake-out", "   ", "parting-shot"],
      ["fake-out", "parting-shot"],
    ],
    [
      "order preserved after leading/interleaved nulls",
      [null, "moonblast", null, "shadow-ball"],
      ["moonblast", "shadow-ball"],
    ],
    ["all entries null/empty → empty array", [null, null, "", "  "], []],
    [
      "all 4 valid moves kept",
      ["flare-blitz", "close-combat", "collision-course", "protect"],
      ["flare-blitz", "close-combat", "collision-course", "protect"],
    ],
  ] as const)("%s", (_label, moves, expected) => {
    const raw = [
      rawSlot({
        playerKey: "p1",
        species: "incineroar",
        moves: [...moves],
      }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result[0]?.moves).toEqual(expected);
  });
});

// =============================================================================
// species trimming
// =============================================================================

describe("buildTeamSlotRows — species trimming", () => {
  it("stores the trimmed species, not the raw input", () => {
    const raw = [rawSlot({ playerKey: "p1", species: "  incineroar  " })];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result[0]?.species).toBe("incineroar");
  });
});

// =============================================================================
// Empty/whitespace species skipped
// =============================================================================

describe("buildTeamSlotRows — empty/whitespace species skipped", () => {
  it("skips a row whose species is an empty string", () => {
    const raw = [
      rawSlot({ playerKey: "p1", species: "", position: 1 }),
      rawSlot({ playerKey: "p1", species: "incineroar", position: 2 }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.species).toBe("incineroar");
  });

  it("skips a row whose species is whitespace-only", () => {
    const raw = [
      rawSlot({ playerKey: "p1", species: "   ", position: 1 }),
      rawSlot({ playerKey: "p1", species: "calyrex-ice-rider", position: 2 }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.species).toBe("calyrex-ice-rider");
  });

  it("returns [] when every row has an empty species", () => {
    const raw = [
      rawSlot({ playerKey: "p1", species: "" }),
      rawSlot({ playerKey: "p2", species: "  " }),
    ];

    expect(buildTeamSlotRows(rk9Meta, raw)).toEqual([]);
  });

  it("still counts blank-species players toward total_players denominator", () => {
    // Player p1 has an empty species on position 1 but a real species on position 2.
    // Both rows are in the same division group; p1 must appear in total_players.
    // Player p2 also has a real species.
    const raw = [
      rawSlot({ playerKey: "p1", species: "", division: null, position: 1 }),
      rawSlot({
        playerKey: "p1",
        species: "incineroar",
        division: null,
        position: 2,
      }),
      rawSlot({
        playerKey: "p2",
        species: "flutter-mane",
        division: null,
        position: 1,
      }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    // Only the 2 non-blank rows should appear in output
    expect(result).toHaveLength(2);
    // total_players = 2 (p1 and p2 both participated, blank row doesn't disqualify p1)
    expect(result.every((r) => r.total_players === 2)).toBe(true);
  });

  it("counts blank-species players toward total_players in a named division", () => {
    const raw = [
      rawSlot({
        playerKey: "p1",
        species: "",
        division: "masters",
        position: 1,
      }),
      rawSlot({
        playerKey: "p1",
        species: "incineroar",
        division: "masters",
        position: 2,
      }),
      rawSlot({
        playerKey: "p2",
        species: "flutter-mane",
        division: "masters",
        position: 1,
      }),
    ];
    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.total_players === 2)).toBe(true);
  });
});

// =============================================================================
// Forbidden fields never emitted
// =============================================================================

describe("buildTeamSlotRows — forbidden fields never emitted", () => {
  const FORBIDDEN_FIELDS = [
    "evs",
    "ivs",
    "gender",
    "level",
    "first_name",
    "last_name",
    "player_name",
    "trainer_name",
  ];

  it("emits none of the privacy-restricted fields on any output row", () => {
    const raw: RawSlotRow[] = [
      rawSlot({
        playerKey: "p1",
        species: "incineroar",
        division: "masters",
        placement: 5,
        wins: 4,
        losses: 2,
        ties: 0,
        country: "US",
        position: 1,
        heldItem: "assault-vest",
        ability: "intimidate",
        teraType: "fire",
        moves: ["fake-out", "parting-shot", "flare-blitz", "darkest-lariat"],
        nature: "adamant",
      }),
      rawSlot({
        playerKey: "p2",
        species: "flutter-mane",
        division: null,
        placement: null,
        wins: null,
        losses: null,
        ties: null,
        country: null,
        position: 2,
        heldItem: null,
        ability: null,
        teraType: null,
        moves: [],
        nature: null,
      }),
    ];

    const result = buildTeamSlotRows(rk9Meta, raw);
    expect(result.length).toBeGreaterThan(0);

    for (const row of result) {
      const keys = Object.keys(row as Record<string, unknown>);
      for (const forbidden of FORBIDDEN_FIELDS) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });
});

// =============================================================================
// Multiple events / full round-trip snapshot
// =============================================================================

describe("buildTeamSlotRows — full multi-slot round-trip", () => {
  it("produces correct total row count: 3 players × 2 slots each", () => {
    const raw: RawSlotRow[] = [
      rawSlot({
        playerKey: "a",
        species: "incineroar",
        position: 1,
        division: null,
      }),
      rawSlot({
        playerKey: "a",
        species: "flutter-mane",
        position: 2,
        division: null,
      }),
      rawSlot({
        playerKey: "b",
        species: "calyrex-ice-rider",
        position: 1,
        division: null,
      }),
      rawSlot({
        playerKey: "b",
        species: "urshifu",
        position: 2,
        division: null,
      }),
      rawSlot({
        playerKey: "c",
        species: "koraidon",
        position: 1,
        division: null,
      }),
      rawSlot({
        playerKey: "c",
        species: "amoonguss",
        position: 2,
        division: null,
      }),
    ];

    const result = buildTeamSlotRows(limitlessMeta, raw);
    expect(result).toHaveLength(6);
    // All rows should have total_players=3 (3 distinct players, all null division)
    expect(result.every((r) => r.total_players === 3)).toBe(true);
  });

  it("stamps meta fields identically on all rows in a batch", () => {
    const raw = [
      rawSlot({ playerKey: "x", species: "species-a" }),
      rawSlot({ playerKey: "y", species: "species-b" }),
    ];

    const result = buildTeamSlotRows(trainersMeta, raw);

    for (const row of result) {
      expect(row.source).toBe(trainersMeta.source);
      expect(row.event_key).toBe(trainersMeta.eventKey);
      expect(row.format).toBe(trainersMeta.format);
      expect(row.event_date).toBe(trainersMeta.eventDate);
      expect(row.event_tier).toBe(trainersMeta.eventTier);
      expect(row.is_online).toBe(trainersMeta.isOnline);
    }
  });
});

// =============================================================================
// TeamSlotRow type shape assertion
// =============================================================================

describe("buildTeamSlotRows — output shape", () => {
  it("output row contains all expected snake_case columns", () => {
    const EXPECTED_KEYS: (keyof TeamSlotRow)[] = [
      "source",
      "event_key",
      "rk9_event_id",
      "limitless_tournament_id",
      "format",
      "event_date",
      "event_tier",
      "is_online",
      "total_players",
      "player_key",
      "division",
      "placement",
      "wins",
      "losses",
      "ties",
      "country",
      "position",
      "species",
      "held_item",
      "ability",
      "tera_type",
      "moves",
      "nature",
    ];

    const raw = [rawSlot({ playerKey: "p1", species: "incineroar" })];
    const result = buildTeamSlotRows(rk9Meta, raw);
    const keys = Object.keys(result[0] as Record<string, unknown>);

    for (const expected of EXPECTED_KEYS) {
      expect(keys).toContain(expected);
    }
    // Exactly as many keys as expected — no extra fields snuck in
    expect(keys).toHaveLength(EXPECTED_KEYS.length);
  });
});

// =============================================================================
// Polymorphic FK column stamping (Decision 1)
// =============================================================================

const rawSlotForFk: RawSlotRow = {
  playerKey: "rk9:5",
  division: "masters",
  placement: 1,
  wins: null,
  losses: null,
  ties: null,
  country: "US",
  position: 1,
  species: "miraidon",
  heldItem: "choice-specs",
  ability: "hadron-engine",
  teraType: "electric",
  moves: ["volt-switch"],
  nature: "modest",
};

describe("buildTeamSlotRows polymorphic FK column (Decision 1)", () => {
  it("stamps rk9_event_id for rk9 events and leaves limitless_tournament_id null", () => {
    const meta: EventMeta = {
      source: "rk9",
      eventKey: "rk9:TO027",
      format: "gen9vgc2024regh",
      eventDate: "2026-01-01",
      eventTier: "regional",
      isOnline: false,
    };
    const rows = buildTeamSlotRows(meta, [rawSlotForFk]);
    expect(rows[0]?.rk9_event_id).toBe("TO027");
    expect(rows[0]?.limitless_tournament_id).toBeNull();
  });

  it("stamps limitless_tournament_id for limitless events and leaves rk9_event_id null", () => {
    const meta: EventMeta = {
      source: "limitless",
      eventKey: "limitless:12345",
      format: "gen9vgc2024regh",
      eventDate: "2026-01-01",
      eventTier: null,
      isOnline: true,
    };
    const rows = buildTeamSlotRows(meta, [
      { ...rawSlotForFk, playerKey: "limitless:5" },
    ]);
    expect(rows[0]?.limitless_tournament_id).toBe("12345");
    expect(rows[0]?.rk9_event_id).toBeNull();
  });

  it("leaves both FK columns null for trainers.gg events", () => {
    const meta: EventMeta = {
      source: "trainers.gg",
      eventKey: "trainers.gg:42",
      format: "gen9vgc2024regh",
      eventDate: "2026-01-01",
      eventTier: null,
      isOnline: true,
    };
    const rows = buildTeamSlotRows(meta, [
      { ...rawSlotForFk, playerKey: "trainers.gg:5" },
    ]);
    expect(rows[0]?.rk9_event_id).toBeNull();
    expect(rows[0]?.limitless_tournament_id).toBeNull();
  });
});
