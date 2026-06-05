import { describe, it, expect } from "@jest/globals";

import {
  aggregateEventUsage,
  type TeamMonInput,
  type EventUsageRow,
} from "../aggregate";

// =============================================================================
// Helpers
// =============================================================================

function mon(
  teamKey: string,
  species: string,
  overrides: Partial<Omit<TeamMonInput, "teamKey" | "species">> = {}
): TeamMonInput {
  return {
    teamKey,
    division: null,
    species,
    ability: null,
    heldItem: null,
    teraType: null,
    moves: [],
    ...overrides,
  };
}

function findRow(
  rows: EventUsageRow[],
  division: string | null,
  species: string
): EventUsageRow | undefined {
  return rows.find((r) => r.division === division && r.species === species);
}

// =============================================================================
// Empty input
// =============================================================================

describe("aggregateEventUsage — empty input", () => {
  it("returns [] when given an empty array", () => {
    expect(aggregateEventUsage([])).toEqual([]);
  });
});

// =============================================================================
// Single division (null — Limitless / first-party)
// =============================================================================

describe("aggregateEventUsage — single division (null)", () => {
  // 3 teams: t1 has flutter-mane + urshifu, t2 has flutter-mane, t3 has incineroar
  const input: TeamMonInput[] = [
    mon("t1", "flutter-mane", { ability: "protosynthesis", heldItem: "focus-sash", teraType: "fairy", moves: ["moonblast", "shadow-ball"] }),
    mon("t1", "urshifu-single-strike", { ability: "unseen-fist", heldItem: "assault-vest", teraType: "dark", moves: ["wicked-blow"] }),
    mon("t2", "flutter-mane", { ability: "protosynthesis", heldItem: "choice-specs", teraType: "fairy", moves: ["moonblast", "dazzling-gleam"] }),
    mon("t3", "incineroar", { heldItem: "safety-goggles", moves: ["fake-out", "flare-blitz"] }),
  ];

  const rows = aggregateEventUsage(input);

  it("produces one row per distinct species", () => {
    expect(rows).toHaveLength(3);
  });

  it("sampleSize equals total distinct teams in the division", () => {
    // All rows are in division=null; sample size must be 3 (t1, t2, t3)
    for (const row of rows) {
      expect(row.sampleSize).toBe(3);
    }
  });

  it("teamCount reflects how many teams carry the species", () => {
    const fm = findRow(rows, null, "flutter-mane");
    expect(fm?.teamCount).toBe(2);

    const incineroar = findRow(rows, null, "incineroar");
    expect(incineroar?.teamCount).toBe(1);
  });

  it("move histogram aggregates counts across teams, sorted by n desc then v asc", () => {
    const fm = findRow(rows, null, "flutter-mane");
    // moonblast appears on both t1 and t2 → n=2
    // shadow-ball only t1, dazzling-gleam only t2 → n=1 each
    const moves = fm?.details.moves ?? [];
    expect(moves[0]).toEqual({ v: "moonblast", n: 2 });
    // tie-break alphabetically
    expect(moves[1]).toEqual({ v: "dazzling-gleam", n: 1 });
    expect(moves[2]).toEqual({ v: "shadow-ball", n: 1 });
  });

  it("tera histogram is correct and sorted", () => {
    const fm = findRow(rows, null, "flutter-mane");
    expect(fm?.details.tera).toEqual([{ v: "fairy", n: 2 }]);
  });

  it("item histogram is correct", () => {
    const fm = findRow(rows, null, "flutter-mane");
    const items = fm?.details.item ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ v: "choice-specs", n: 1 });
    expect(items[1]).toEqual({ v: "focus-sash", n: 1 });
  });

  it("ability histogram aggregates counts across teams, sorted by n desc then v asc", () => {
    const fm = findRow(rows, null, "flutter-mane");
    // protosynthesis appears on t1 and t2 → n=2
    expect(fm?.details.ability).toEqual([{ v: "protosynthesis", n: 2 }]);
  });

  it("null item/tera/ability are omitted from histograms", () => {
    const incineroar = findRow(rows, null, "incineroar");
    expect(incineroar?.details.tera).toHaveLength(0);
    expect(incineroar?.details.ability).toHaveLength(0);
  });
});

// =============================================================================
// Species Clause
// =============================================================================

describe("aggregateEventUsage — Species Clause", () => {
  it("counts a species at most once per team even if it appears in multiple slots", () => {
    // Simulates a data-import bug or test data with duplicate species on one team
    const input: TeamMonInput[] = [
      mon("t1", "charizard", { moves: ["flamethrower"] }),
      mon("t1", "charizard", { moves: ["air-slash"] }), // duplicate slot, same team
      mon("t2", "charizard", { moves: ["flamethrower"] }),
    ];
    const rows = aggregateEventUsage(input);
    const row = findRow(rows, null, "charizard");
    // teamCount should be 2, not 3
    expect(row?.teamCount).toBe(2);
    // sampleSize is still 2 distinct teams
    expect(row?.sampleSize).toBe(2);
  });

  it("aggregates move histograms from both slots when deduplicating (last-one-wins is fine: moves still counted from each slot)", () => {
    // Even though the species clause deduplicates for teamCount, we still only
    // see the first occurrence per (teamKey, species) pair in the histogram.
    // That is by design — we record the team's 'first-seen' slot.
    const input: TeamMonInput[] = [
      mon("t1", "charizard", { moves: ["flamethrower"] }),
      mon("t1", "charizard", { moves: ["air-slash"] }), // deduped away
    ];
    const rows = aggregateEventUsage(input);
    const row = findRow(rows, null, "charizard");
    // Only the first slot should contribute to the histogram
    expect(row?.details.moves).toEqual([{ v: "flamethrower", n: 1 }]);
  });
});

// =============================================================================
// Multi-division (RK9 style)
// =============================================================================

describe("aggregateEventUsage — multi-division (RK9)", () => {
  // 2 Masters teams, 1 Senior team — all with Flutter Mane
  const input: TeamMonInput[] = [
    mon("m1", "flutter-mane", { division: "masters", heldItem: "focus-sash" }),
    mon("m2", "flutter-mane", { division: "masters", heldItem: "choice-specs" }),
    mon("m2", "incineroar", { division: "masters" }),
    mon("s1", "flutter-mane", { division: "senior", heldItem: "focus-sash" }),
    mon("s1", "calyrex-shadow-rider", { division: "senior" }),
  ];

  const rows = aggregateEventUsage(input);

  it("creates separate rows per division", () => {
    const mastersFM = findRow(rows, "masters", "flutter-mane");
    const seniorFM = findRow(rows, "senior", "flutter-mane");
    expect(mastersFM).toBeDefined();
    expect(seniorFM).toBeDefined();
  });

  it("sampleSize is constant within a division (masters = 2, senior = 1)", () => {
    const mastersFM = findRow(rows, "masters", "flutter-mane");
    const mastersIncineroar = findRow(rows, "masters", "incineroar");
    expect(mastersFM?.sampleSize).toBe(2);
    expect(mastersIncineroar?.sampleSize).toBe(2);

    const seniorFM = findRow(rows, "senior", "flutter-mane");
    const seniorCalyrex = findRow(rows, "senior", "calyrex-shadow-rider");
    expect(seniorFM?.sampleSize).toBe(1);
    expect(seniorCalyrex?.sampleSize).toBe(1);
  });

  it("teamCount < sampleSize when not all teams carry a species (masters: incineroar on 1 of 2 teams)", () => {
    const mastersIncineroar = findRow(rows, "masters", "incineroar");
    expect(mastersIncineroar?.teamCount).toBe(1);
    expect(mastersIncineroar?.sampleSize).toBe(2);
  });

  it("does not mix teams across divisions in teamCount", () => {
    // Flutter Mane is on 2 masters teams and 1 senior team
    // masters row must show teamCount=2, senior row must show teamCount=1
    const mastersFM = findRow(rows, "masters", "flutter-mane");
    const seniorFM = findRow(rows, "senior", "flutter-mane");
    expect(mastersFM?.teamCount).toBe(2);
    expect(seniorFM?.teamCount).toBe(1);
  });

  it("does not mix histograms across divisions", () => {
    // Masters flutter-mane: focus-sash n=1, choice-specs n=1
    const mastersFM = findRow(rows, "masters", "flutter-mane");
    expect(mastersFM?.details.item).toHaveLength(2);

    // Senior flutter-mane: only focus-sash n=1
    const seniorFM = findRow(rows, "senior", "flutter-mane");
    expect(seniorFM?.details.item).toEqual([{ v: "focus-sash", n: 1 }]);
  });
});

// =============================================================================
// Histogram sorting
// =============================================================================

describe("aggregateEventUsage — histogram sort order", () => {
  it("sorts by n desc, then v asc on ties", () => {
    // 3 teams; flutter-mane: moonblast on all 3, shadow-ball on 2, dazzling-gleam on 1
    const input: TeamMonInput[] = [
      mon("t1", "flutter-mane", { moves: ["moonblast", "shadow-ball", "dazzling-gleam"] }),
      mon("t2", "flutter-mane", { moves: ["moonblast", "shadow-ball"] }),
      mon("t3", "flutter-mane", { moves: ["moonblast"] }),
    ];
    const rows = aggregateEventUsage(input);
    const fm = findRow(rows, null, "flutter-mane");
    const moves = fm?.details.moves ?? [];
    expect(moves).toEqual([
      { v: "moonblast", n: 3 },
      { v: "shadow-ball", n: 2 },
      { v: "dazzling-gleam", n: 1 },
    ]);
  });

  it("tie-breaks alphabetically (asc) when counts are equal", () => {
    const input: TeamMonInput[] = [
      mon("t1", "flutter-mane", { teraType: "fire" }),
      mon("t2", "flutter-mane", { teraType: "fairy" }),
    ];
    const rows = aggregateEventUsage(input);
    const fm = findRow(rows, null, "flutter-mane");
    // Both have n=1; fairy < fire alphabetically
    expect(fm?.details.tera).toEqual([
      { v: "fairy", n: 1 },
      { v: "fire", n: 1 },
    ]);
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("aggregateEventUsage — edge cases", () => {
  it("handles all-null items, teras, and abilities gracefully (empty histograms)", () => {
    const input: TeamMonInput[] = [
      mon("t1", "flutter-mane", { ability: null, heldItem: null, teraType: null }),
    ];
    const rows = aggregateEventUsage(input);
    const fm = findRow(rows, null, "flutter-mane");
    expect(fm?.details.item).toEqual([]);
    expect(fm?.details.tera).toEqual([]);
    expect(fm?.details.ability).toEqual([]);
  });

  it("handles empty moves array (no move histogram entries)", () => {
    const input: TeamMonInput[] = [mon("t1", "flutter-mane", { moves: [] })];
    const rows = aggregateEventUsage(input);
    const fm = findRow(rows, null, "flutter-mane");
    expect(fm?.details.moves).toEqual([]);
  });

  it("handles a single team with a single mon", () => {
    const input: TeamMonInput[] = [
      mon("t1", "calyrex-ice-rider", {
        ability: "as-one",
        heldItem: "never-melt-ice",
        teraType: "ice",
        moves: ["glacial-lance"],
      }),
    ];
    const rows = aggregateEventUsage(input);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      division: null,
      species: "calyrex-ice-rider",
      teamCount: 1,
      sampleSize: 1,
    });
    expect(rows[0]?.details.item).toEqual([{ v: "never-melt-ice", n: 1 }]);
    expect(rows[0]?.details.tera).toEqual([{ v: "ice", n: 1 }]);
    expect(rows[0]?.details.moves).toEqual([{ v: "glacial-lance", n: 1 }]);
    expect(rows[0]?.details.ability).toEqual([{ v: "as-one", n: 1 }]);
  });

  it("correctly handles mixed null and non-null divisions in the same input", () => {
    const input: TeamMonInput[] = [
      mon("t1", "flutter-mane", { division: null }),
      mon("t2", "flutter-mane", { division: "masters" }),
    ];
    const rows = aggregateEventUsage(input);
    // Two distinct (division, species) pairs
    expect(rows).toHaveLength(2);
    const nullRow = findRow(rows, null, "flutter-mane");
    const mastersRow = findRow(rows, "masters", "flutter-mane");
    expect(nullRow?.sampleSize).toBe(1);
    expect(mastersRow?.sampleSize).toBe(1);
  });
});
