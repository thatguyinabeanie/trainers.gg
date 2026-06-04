/**
 * Unit tests for pure rollup helpers in usage/rollup.ts.
 *
 * All functions are pure (no DB / framework deps) so tests are simple
 * input → output assertions. Coverage targets 80%+ on the rollup module.
 */

import { describe, it, expect } from "@jest/globals";

import {
  bucketStart,
  bucketEnd,
  rollupBucket,
  mergeHistogram,
  computeDelta,
  type FactRow,
  type PeriodType,
} from "../rollup";

// =============================================================================
// Helpers
// =============================================================================

/** Build a minimal FactRow for testing. */
function fact(
  overrides: Partial<FactRow> & Pick<FactRow, "species">
): FactRow {
  return {
    source: "rk9",
    eventKey: "rk9:EVT001",
    division: null,
    teamCount: 1,
    sampleSize: 10,
    details: { moves: [], tera: [], item: [] },
    ...overrides,
  };
}

// =============================================================================
// bucketStart
// =============================================================================

describe("bucketStart — day", () => {
  it("returns the same date for 'day' period", () => {
    expect(bucketStart("2025-03-15", "day")).toBe("2025-03-15");
  });

  it("handles first day of month", () => {
    expect(bucketStart("2025-03-01", "day")).toBe("2025-03-01");
  });

  it("handles last day of year", () => {
    expect(bucketStart("2025-12-31", "day")).toBe("2025-12-31");
  });
});

describe("bucketStart — week", () => {
  it("returns Monday as-is when the date is already a Monday", () => {
    // 2025-03-03 is a Monday
    expect(bucketStart("2025-03-03", "week")).toBe("2025-03-03");
  });

  it("rolls back a Sunday to the previous Monday", () => {
    // 2025-03-09 is a Sunday → Monday 2025-03-03
    expect(bucketStart("2025-03-09", "week")).toBe("2025-03-03");
  });

  it("rolls back a Wednesday to the preceding Monday", () => {
    // 2025-03-05 is a Wednesday → Monday 2025-03-03
    expect(bucketStart("2025-03-05", "week")).toBe("2025-03-03");
  });

  it("rolls back a Saturday to the preceding Monday", () => {
    // 2025-03-08 is a Saturday → Monday 2025-03-03
    expect(bucketStart("2025-03-08", "week")).toBe("2025-03-03");
  });

  it("crosses month boundary: Tuesday 2025-03-04 → Monday 2025-03-03", () => {
    expect(bucketStart("2025-03-04", "week")).toBe("2025-03-03");
  });

  it("crosses year boundary: Wednesday 2025-01-01 → Monday 2024-12-30", () => {
    // 2025-01-01 is Wednesday → Monday 2024-12-30
    expect(bucketStart("2025-01-01", "week")).toBe("2024-12-30");
  });

  it("rolls back a Friday to the preceding Monday", () => {
    // 2025-03-07 is a Friday → Monday 2025-03-03
    expect(bucketStart("2025-03-07", "week")).toBe("2025-03-03");
  });
});

describe("bucketStart — month", () => {
  it("returns the 1st when the date is already the 1st", () => {
    expect(bucketStart("2025-03-01", "month")).toBe("2025-03-01");
  });

  it("returns the 1st for a mid-month date", () => {
    expect(bucketStart("2025-03-15", "month")).toBe("2025-03-01");
  });

  it("returns the 1st for the last day of the month", () => {
    expect(bucketStart("2025-03-31", "month")).toBe("2025-03-01");
  });

  it("handles year boundaries (January)", () => {
    expect(bucketStart("2025-01-15", "month")).toBe("2025-01-01");
  });

  it("handles December correctly", () => {
    expect(bucketStart("2025-12-25", "month")).toBe("2025-12-01");
  });
});

// =============================================================================
// bucketEnd
// =============================================================================

describe("bucketEnd — day", () => {
  it("returns the same date as the start for 'day' period", () => {
    expect(bucketEnd("2025-03-15", "day")).toBe("2025-03-15");
  });
});

describe("bucketEnd — week", () => {
  it("returns Sunday (6 days after Monday) for a Monday start", () => {
    // Monday 2025-03-03 → Sunday 2025-03-09
    expect(bucketEnd("2025-03-03", "week")).toBe("2025-03-09");
  });

  it("crosses month boundary: Monday 2025-03-31 → Sunday 2025-04-06", () => {
    expect(bucketEnd("2025-03-31", "week")).toBe("2025-04-06");
  });

  it("crosses year boundary: Monday 2024-12-30 → Sunday 2025-01-05", () => {
    expect(bucketEnd("2024-12-30", "week")).toBe("2025-01-05");
  });
});

describe("bucketEnd — month", () => {
  it("returns the last day of March (31)", () => {
    expect(bucketEnd("2025-03-01", "month")).toBe("2025-03-31");
  });

  it("returns the last day of February (28 in 2025, non-leap year)", () => {
    expect(bucketEnd("2025-02-01", "month")).toBe("2025-02-28");
  });

  it("returns the last day of February (29 in 2024, leap year)", () => {
    expect(bucketEnd("2024-02-01", "month")).toBe("2024-02-29");
  });

  it("returns the last day of April (30)", () => {
    expect(bucketEnd("2025-04-01", "month")).toBe("2025-04-30");
  });

  it("returns the last day of December (31)", () => {
    expect(bucketEnd("2025-12-01", "month")).toBe("2025-12-31");
  });
});

// =============================================================================
// mergeHistogram
// =============================================================================

describe("mergeHistogram", () => {
  it("returns [] for empty input", () => {
    expect(mergeHistogram([])).toEqual([]);
  });

  it("returns [] for array of empty arrays", () => {
    expect(mergeHistogram([[], []])).toEqual([]);
  });

  it("sums counts for the same value across histograms", () => {
    const h1 = [{ v: "moonblast", n: 2 }];
    const h2 = [{ v: "moonblast", n: 3 }];
    expect(mergeHistogram([h1, h2])).toEqual([{ v: "moonblast", n: 5 }]);
  });

  it("merges distinct values from different histograms", () => {
    const h1 = [{ v: "moonblast", n: 2 }];
    const h2 = [{ v: "shadow-ball", n: 1 }];
    const result = mergeHistogram([h1, h2]);
    // moonblast n=2 > shadow-ball n=1 → sorted desc
    expect(result).toEqual([
      { v: "moonblast", n: 2 },
      { v: "shadow-ball", n: 1 },
    ]);
  });

  it("sorts by n desc, then v asc on ties", () => {
    const h1 = [
      { v: "tera-fire", n: 1 },
      { v: "tera-fairy", n: 1 },
    ];
    const result = mergeHistogram([h1]);
    expect(result).toEqual([
      { v: "tera-fairy", n: 1 },
      { v: "tera-fire", n: 1 },
    ]);
  });

  it("handles multiple histograms with overlapping and new values", () => {
    const h1 = [
      { v: "moonblast", n: 3 },
      { v: "shadow-ball", n: 2 },
    ];
    const h2 = [
      { v: "moonblast", n: 1 },
      { v: "dazzling-gleam", n: 4 },
    ];
    const result = mergeHistogram([h1, h2]);
    expect(result).toEqual([
      { v: "dazzling-gleam", n: 4 },
      { v: "moonblast", n: 4 },
      { v: "shadow-ball", n: 2 },
    ]);
  });
});

// =============================================================================
// rollupBucket — empty input
// =============================================================================

describe("rollupBucket — empty input", () => {
  it("returns zeros and empty species list for empty facts", () => {
    expect(rollupBucket([])).toEqual({
      totalTeams: 0,
      totalTournaments: 0,
      species: [],
    });
  });
});

// =============================================================================
// rollupBucket — totalTeams distinct-denominator counting
// =============================================================================

describe("rollupBucket — totalTeams distinct-denominator dedup", () => {
  it("counts each (source, eventKey, division) once even when multiple species come from it", () => {
    // Same event-division → sampleSize counted once (not once per species row)
    const facts: FactRow[] = [
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: "masters",
        species: "flutter-mane",
        teamCount: 5,
        sampleSize: 20,
      }),
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: "masters",
        species: "incineroar",
        teamCount: 4,
        sampleSize: 20,
      }),
    ];
    const result = rollupBucket(facts);
    // sampleSize=20 counted ONCE (not 20+20=40)
    expect(result.totalTeams).toBe(20);
  });

  it("sums sampleSize across distinct event-divisions", () => {
    // Two distinct event-divisions: each contributes sampleSize once
    const facts: FactRow[] = [
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: "masters",
        species: "flutter-mane",
        teamCount: 5,
        sampleSize: 20,
      }),
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: "senior",
        species: "flutter-mane",
        teamCount: 2,
        sampleSize: 8,
      }),
    ];
    const result = rollupBucket(facts);
    // 20 (masters) + 8 (senior) = 28
    expect(result.totalTeams).toBe(28);
  });

  it("includes source in the distinct key so two sources for the same event don't deduplicate", () => {
    // 'all' scope: same event covered by both rk9 and limitless — each source's
    // sample_size is independent and must be summed.
    const facts: FactRow[] = [
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: null,
        species: "flutter-mane",
        sampleSize: 30,
      }),
      fact({
        source: "limitless",
        eventKey: "limitless:T99",
        division: null,
        species: "flutter-mane",
        sampleSize: 15,
      }),
    ];
    const result = rollupBucket(facts);
    // 30 + 15 = 45 — different sources, counted separately
    expect(result.totalTeams).toBe(45);
  });
});

// =============================================================================
// rollupBucket — totalTournaments
// =============================================================================

describe("rollupBucket — totalTournaments", () => {
  it("counts distinct (source, eventKey) pairs regardless of division count", () => {
    // Two divisions from the same event → still 1 tournament
    const facts: FactRow[] = [
      fact({
        eventKey: "rk9:EVT001",
        division: "masters",
        species: "flutter-mane",
        sampleSize: 20,
      }),
      fact({
        eventKey: "rk9:EVT001",
        division: "senior",
        species: "flutter-mane",
        sampleSize: 8,
      }),
    ];
    expect(rollupBucket(facts).totalTournaments).toBe(1);
  });

  it("counts multiple distinct events as separate tournaments", () => {
    const facts: FactRow[] = [
      fact({ eventKey: "rk9:EVT001", sampleSize: 10 }),
      fact({ eventKey: "rk9:EVT002", sampleSize: 10 }),
    ];
    expect(rollupBucket(facts).totalTournaments).toBe(2);
  });

  it("treats same eventKey from different sources as distinct tournaments", () => {
    const facts: FactRow[] = [
      fact({ source: "rk9", eventKey: "rk9:EVT001", sampleSize: 20 }),
      fact({ source: "limitless", eventKey: "limitless:T99", sampleSize: 15 }),
    ];
    expect(rollupBucket(facts).totalTournaments).toBe(2);
  });
});

// =============================================================================
// rollupBucket — per-species teamCount and usagePct
// =============================================================================

describe("rollupBucket — species teamCount and usagePct", () => {
  it("sums teamCount across facts for the same species", () => {
    // Species appears in two different events
    const facts: FactRow[] = [
      fact({
        eventKey: "rk9:EVT001",
        species: "flutter-mane",
        teamCount: 5,
        sampleSize: 10,
      }),
      fact({
        eventKey: "rk9:EVT002",
        species: "flutter-mane",
        teamCount: 3,
        sampleSize: 10,
      }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane");
    expect(fm?.teamCount).toBe(8);
  });

  it("computes usagePct as round(100 * teamCount / totalTeams, 2)", () => {
    // totalTeams = 10 (one event-div), teamCount = 5 → 50.00%
    const facts: FactRow[] = [
      fact({
        eventKey: "rk9:EVT001",
        species: "flutter-mane",
        teamCount: 5,
        sampleSize: 10,
      }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane");
    expect(fm?.usagePct).toBe(50);
  });

  it("rounds usagePct to 2 decimal places", () => {
    // totalTeams = 3, teamCount = 1 → 33.3333... → 33.33
    const facts: FactRow[] = [
      fact({
        eventKey: "rk9:EVT001",
        species: "flutter-mane",
        teamCount: 1,
        sampleSize: 3,
      }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane");
    expect(fm?.usagePct).toBe(33.33);
  });
});

// =============================================================================
// rollupBucket — rank ordering
// =============================================================================

describe("rollupBucket — rank ordering", () => {
  it("assigns rank 1 to the species with the highest usagePct", () => {
    const facts: FactRow[] = [
      fact({ species: "flutter-mane", teamCount: 8, sampleSize: 10 }),
      fact({ species: "incineroar", teamCount: 5, sampleSize: 10 }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane");
    expect(fm?.rank).toBe(1);
  });

  it("assigns consecutive ranks to species with distinct percentages", () => {
    const facts: FactRow[] = [
      fact({ species: "flutter-mane", teamCount: 8, sampleSize: 10 }),
      fact({ species: "incineroar", teamCount: 5, sampleSize: 10 }),
      fact({ species: "urshifu", teamCount: 2, sampleSize: 10 }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane")!;
    const inc = result.species.find((s) => s.species === "incineroar")!;
    const urs = result.species.find((s) => s.species === "urshifu")!;
    expect(fm.rank).toBe(1);
    expect(inc.rank).toBe(2);
    expect(urs.rank).toBe(3);
  });

  it("assigns the same rank to species with equal usagePct (dense rank)", () => {
    const facts: FactRow[] = [
      fact({ species: "flutter-mane", teamCount: 5, sampleSize: 10 }),
      fact({ species: "incineroar", teamCount: 5, sampleSize: 10 }),
      fact({ species: "urshifu", teamCount: 2, sampleSize: 10 }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane")!;
    const inc = result.species.find((s) => s.species === "incineroar")!;
    const urs = result.species.find((s) => s.species === "urshifu")!;
    // flutter-mane and incineroar both 50% → rank 1 (dense: no gap)
    expect(fm.rank).toBe(1);
    expect(inc.rank).toBe(1);
    // urshifu 20% → next rank after both tied-1s is rank 2
    expect(urs.rank).toBe(2);
  });

  it("uses species ascending as tie-break for sort order (not rank — ties share rank)", () => {
    const facts: FactRow[] = [
      fact({ species: "zacian", teamCount: 5, sampleSize: 10 }),
      fact({ species: "amoonguss", teamCount: 5, sampleSize: 10 }),
    ];
    const result = rollupBucket(facts);
    // Both share rank 1; amoonguss sorts before zacian alphabetically
    expect(result.species[0]?.species).toBe("amoonguss");
    expect(result.species[1]?.species).toBe("zacian");
    expect(result.species[0]?.rank).toBe(1);
    expect(result.species[1]?.rank).toBe(1);
  });
});

// =============================================================================
// rollupBucket — detail histograms (moves/tera/item)
// =============================================================================

describe("rollupBucket — detail histograms", () => {
  it("merges move histograms from all facts for the same species and computes pct", () => {
    const facts: FactRow[] = [
      fact({
        species: "flutter-mane",
        teamCount: 2,
        sampleSize: 4,
        details: {
          moves: [
            { v: "moonblast", n: 2 },
            { v: "shadow-ball", n: 1 },
          ],
          tera: [],
          item: [],
        },
      }),
      fact({
        eventKey: "rk9:EVT002",
        species: "flutter-mane",
        teamCount: 1,
        sampleSize: 6,
        details: {
          moves: [
            { v: "moonblast", n: 1 },
            { v: "dazzling-gleam", n: 1 },
          ],
          tera: [],
          item: [],
        },
      }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane")!;
    // Merged: moonblast=3, shadow-ball=1, dazzling-gleam=1
    // teamCount = 2+1=3; totalTeams = 4+6=10 (distinct event-divs, both null division)
    expect(fm.teamCount).toBe(3);
    expect(fm.moves[0]).toMatchObject({ value: "moonblast", count: 3 });
    // pct = round(100 * 3 / 3, 2) = 100.00
    expect(fm.moves[0]?.pct).toBe(100);
    // Tie for 2nd: dazzling-gleam and shadow-ball both n=1
    const valuesSorted = fm.moves.slice(1).map((m) => m.value);
    expect(valuesSorted).toEqual(["dazzling-gleam", "shadow-ball"]);
  });

  it("detail pct uses species teamCount as denominator", () => {
    // teamCount=2 for the species; move appears on 1 team → pct = 50
    const facts: FactRow[] = [
      fact({
        species: "incineroar",
        teamCount: 2,
        sampleSize: 10,
        details: {
          moves: [{ v: "fake-out", n: 1 }],
          tera: [],
          item: [],
        },
      }),
    ];
    const result = rollupBucket(facts);
    const inc = result.species.find((s) => s.species === "incineroar")!;
    expect(inc.moves[0]?.pct).toBe(50);
  });

  it("detail entries are sorted by count desc, value asc on ties", () => {
    const facts: FactRow[] = [
      fact({
        species: "flutter-mane",
        teamCount: 3,
        sampleSize: 3,
        details: {
          moves: [],
          tera: [
            { v: "stellar", n: 1 },
            { v: "fairy", n: 2 },
            { v: "ghost", n: 1 },
          ],
          item: [],
        },
      }),
    ];
    const result = rollupBucket(facts);
    const fm = result.species.find((s) => s.species === "flutter-mane")!;
    expect(fm.tera[0]?.value).toBe("fairy");
    // ghost and stellar both n=1 → alphabetical: ghost < stellar
    expect(fm.tera[1]?.value).toBe("ghost");
    expect(fm.tera[2]?.value).toBe("stellar");
  });

  it("returns empty detail arrays when there are no histogram entries", () => {
    const facts: FactRow[] = [
      fact({
        species: "incineroar",
        teamCount: 1,
        sampleSize: 1,
        details: { moves: [], tera: [], item: [] },
      }),
    ];
    const result = rollupBucket(facts);
    const inc = result.species.find((s) => s.species === "incineroar")!;
    expect(inc.moves).toEqual([]);
    expect(inc.tera).toEqual([]);
    expect(inc.item).toEqual([]);
  });
});

// =============================================================================
// rollupBucket — 'all' source spanning multiple sources
// =============================================================================

describe("rollupBucket — 'all' source spanning multiple sources", () => {
  it("correctly sums teamCount across sources for the same species", () => {
    // Simulates the 'all' caller passing facts from rk9 + limitless
    const facts: FactRow[] = [
      fact({
        source: "rk9",
        eventKey: "rk9:EVT001",
        division: "masters",
        species: "flutter-mane",
        teamCount: 10,
        sampleSize: 20,
      }),
      fact({
        source: "limitless",
        eventKey: "limitless:T99",
        division: null,
        species: "flutter-mane",
        teamCount: 5,
        sampleSize: 15,
      }),
    ];
    const result = rollupBucket(facts);
    // totalTeams = 20 + 15 = 35 (distinct (source, eventKey, division) tuples)
    expect(result.totalTeams).toBe(35);
    const fm = result.species.find((s) => s.species === "flutter-mane")!;
    expect(fm.teamCount).toBe(15);
    expect(fm.usagePct).toBe(Math.round((100 * 15 * 100) / 35) / 100);
  });

  it("counts distinct (source, eventKey) across sources for totalTournaments", () => {
    const facts: FactRow[] = [
      fact({ source: "rk9", eventKey: "rk9:EVT001", species: "a" }),
      fact({ source: "limitless", eventKey: "limitless:T99", species: "a" }),
      fact({ source: "rk9", eventKey: "rk9:EVT001", species: "b" }), // same event as first
    ];
    const result = rollupBucket(facts);
    expect(result.totalTournaments).toBe(2);
  });
});

// =============================================================================
// computeDelta
// =============================================================================

describe("computeDelta", () => {
  it("returns null when priorPct is null", () => {
    expect(computeDelta(50, null)).toBeNull();
  });

  it("returns the difference when priorPct is provided", () => {
    expect(computeDelta(55, 50)).toBe(5);
  });

  it("returns a negative delta when current < prior", () => {
    expect(computeDelta(40, 50)).toBe(-10);
  });

  it("returns 0 when current equals prior", () => {
    expect(computeDelta(50, 50)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    // 33.33 - 33.00 = 0.33000... → rounded to 0.33
    expect(computeDelta(33.33, 33)).toBe(0.33);
  });

  it("handles fractional differences that need rounding", () => {
    // 1/3 ≈ 0.3333... → rounds to 0.33
    expect(computeDelta(33.33, 33)).toBe(0.33);
  });

  it("handles priorPct of 0 correctly", () => {
    expect(computeDelta(25, 0)).toBe(25);
  });
});
