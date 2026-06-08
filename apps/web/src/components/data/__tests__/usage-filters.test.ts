import {
  DEFAULT_FORMAT,
  DEFAULT_PERIOD_TYPE,
  DEFAULT_SOURCE,
  DEFAULT_THRESHOLD,
  VALID_PERIOD_TYPES,
  VALID_SOURCES,
  coerceFormat,
  coercePeriodType,
  coerceRangeEnd,
  coerceRangeStart,
  coerceSelectedSpecies,
  coerceSource,
  coerceThreshold,
  isValidFormat,
  toDBSource,
} from "../usage-filters";

// =============================================================================
// Constants shape
// =============================================================================

describe("exported constants", () => {
  it("DEFAULT_FORMAT is a non-empty string", () => {
    expect(typeof DEFAULT_FORMAT).toBe("string");
    expect(DEFAULT_FORMAT.length).toBeGreaterThan(0);
  });

  it("DEFAULT_SOURCE is 'all'", () => {
    expect(DEFAULT_SOURCE).toBe("all");
  });

  it("DEFAULT_PERIOD_TYPE is 'week'", () => {
    expect(DEFAULT_PERIOD_TYPE).toBe("week");
  });

  it("DEFAULT_THRESHOLD is a positive number", () => {
    expect(typeof DEFAULT_THRESHOLD).toBe("number");
    expect(DEFAULT_THRESHOLD).toBeGreaterThan(0);
  });

  it("VALID_SOURCES contains expected values", () => {
    expect(VALID_SOURCES).toContain("all");
    expect(VALID_SOURCES).toContain("rk9");
    expect(VALID_SOURCES).toContain("limitless");
    expect(VALID_SOURCES).toContain("trainers.gg");
  });

  it("VALID_PERIOD_TYPES contains day, week, month", () => {
    expect(VALID_PERIOD_TYPES).toContain("day");
    expect(VALID_PERIOD_TYPES).toContain("week");
    expect(VALID_PERIOD_TYPES).toContain("month");
  });
});

// =============================================================================
// isValidFormat
// =============================================================================

describe("isValidFormat", () => {
  it("returns true for the default format ID", () => {
    // The default is a registered format in @trainers/pokemon
    expect(isValidFormat(DEFAULT_FORMAT)).toBe(true);
  });

  it("returns false for an obviously invalid ID", () => {
    expect(isValidFormat("not-a-real-format")).toBe(false);
    expect(isValidFormat("")).toBe(false);
    expect(isValidFormat("gen99fakevgc9999regz")).toBe(false);
  });

  it("returns false for a numeric-looking string", () => {
    expect(isValidFormat("12345")).toBe(false);
  });
});

// =============================================================================
// coerceFormat
// =============================================================================

describe("coerceFormat", () => {
  it("returns a known format ID unchanged", () => {
    expect(coerceFormat(DEFAULT_FORMAT)).toBe(DEFAULT_FORMAT);
  });

  it("returns DEFAULT_FORMAT for undefined", () => {
    expect(coerceFormat(undefined)).toBe(DEFAULT_FORMAT);
  });

  it("returns DEFAULT_FORMAT for null", () => {
    expect(coerceFormat(null)).toBe(DEFAULT_FORMAT);
  });

  it("returns DEFAULT_FORMAT for an empty string", () => {
    expect(coerceFormat("")).toBe(DEFAULT_FORMAT);
  });

  it("returns DEFAULT_FORMAT for whitespace only", () => {
    expect(coerceFormat("   ")).toBe(DEFAULT_FORMAT);
  });

  it("returns DEFAULT_FORMAT for an unknown format ID", () => {
    expect(coerceFormat("gen9fakevgc2099regz")).toBe(DEFAULT_FORMAT);
  });

  it("trims whitespace before validating", () => {
    // If the trimmed value is the default format it should resolve
    expect(coerceFormat(`  ${DEFAULT_FORMAT}  `)).toBe(DEFAULT_FORMAT);
  });
});

// =============================================================================
// coerceSource
// =============================================================================

describe("coerceSource", () => {
  it.each(VALID_SOURCES)("passes through valid source '%s'", (source) => {
    expect(coerceSource(source)).toBe(source);
  });

  it("returns DEFAULT_SOURCE for undefined", () => {
    expect(coerceSource(undefined)).toBe(DEFAULT_SOURCE);
  });

  it("returns DEFAULT_SOURCE for null", () => {
    expect(coerceSource(null)).toBe(DEFAULT_SOURCE);
  });

  it("returns DEFAULT_SOURCE for an empty string", () => {
    expect(coerceSource("")).toBe(DEFAULT_SOURCE);
  });

  it.each(["unknown", "LIMITLESS", "RK9", "tampered", "all;drop"])(
    "returns DEFAULT_SOURCE for invalid value '%s'",
    (value) => {
      expect(coerceSource(value)).toBe(DEFAULT_SOURCE);
    }
  );
});

// =============================================================================
// coercePeriodType
// =============================================================================

describe("coercePeriodType", () => {
  it.each(VALID_PERIOD_TYPES)(
    "passes through valid period type '%s'",
    (periodType) => {
      expect(coercePeriodType(periodType)).toBe(periodType);
    }
  );

  it("returns DEFAULT_PERIOD_TYPE for undefined", () => {
    expect(coercePeriodType(undefined)).toBe(DEFAULT_PERIOD_TYPE);
  });

  it("returns DEFAULT_PERIOD_TYPE for null", () => {
    expect(coercePeriodType(null)).toBe(DEFAULT_PERIOD_TYPE);
  });

  it("returns DEFAULT_PERIOD_TYPE for an empty string", () => {
    expect(coercePeriodType("")).toBe(DEFAULT_PERIOD_TYPE);
  });

  it.each(["daily", "weekly", "monthly", "WEEK", "DAY"])(
    "returns DEFAULT_PERIOD_TYPE for invalid value '%s'",
    (value) => {
      expect(coercePeriodType(value)).toBe(DEFAULT_PERIOD_TYPE);
    }
  );
});

// =============================================================================
// coerceThreshold
// =============================================================================

describe("coerceThreshold", () => {
  it("returns the parsed number for in-range values", () => {
    expect(coerceThreshold("5")).toBe(5);
    expect(coerceThreshold("2.5")).toBe(2.5);
    expect(coerceThreshold("20")).toBe(20);
    expect(coerceThreshold("1")).toBe(1);
  });

  it("returns DEFAULT_THRESHOLD for undefined / null", () => {
    expect(coerceThreshold(undefined)).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold(null)).toBe(DEFAULT_THRESHOLD);
  });

  it("returns DEFAULT_THRESHOLD for NaN strings", () => {
    expect(coerceThreshold("abc")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("NaN")).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps values below the floor up to 1", () => {
    expect(coerceThreshold("0")).toBe(1);
    expect(coerceThreshold("-1")).toBe(1);
    expect(coerceThreshold("-100")).toBe(1);
  });

  it("clamps values above the ceiling down to 20", () => {
    expect(coerceThreshold("21")).toBe(20);
    expect(coerceThreshold("20.001")).toBe(20);
    expect(coerceThreshold("999")).toBe(20);
  });

  it("preserves fractional in-range values", () => {
    expect(coerceThreshold("3.14")).toBeCloseTo(3.14);
    expect(coerceThreshold("9.99")).toBeCloseTo(9.99);
  });
});

describe("toDBSource", () => {
  it("maps 'trainers.gg' to 'first_party' for the DB query", () => {
    expect(toDBSource("trainers.gg")).toBe("first_party");
  });

  it("passes rk9, limitless, and all through unchanged", () => {
    expect(toDBSource("rk9")).toBe("rk9");
    expect(toDBSource("limitless")).toBe("limitless");
    expect(toDBSource("all")).toBe("all");
  });

  it("passes unknown values through unchanged", () => {
    expect(toDBSource("unknown")).toBe("unknown");
  });
});

// =============================================================================
// coerceSelectedSpecies
// =============================================================================

describe("coerceSelectedSpecies", () => {
  it("returns [] when raw is null", () => {
    expect(coerceSelectedSpecies(null)).toEqual([]);
  });

  it("returns [] when raw is empty string", () => {
    expect(coerceSelectedSpecies("")).toEqual([]);
  });

  it("parses single species", () => {
    expect(coerceSelectedSpecies("Sneasler")).toEqual(["Sneasler"]);
  });

  it("parses comma-separated species list", () => {
    expect(coerceSelectedSpecies("Sneasler,Koraidon")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });

  it("trims whitespace around each species", () => {
    expect(coerceSelectedSpecies(" Sneasler , Koraidon ")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });

  it("filters out empty entries after splitting", () => {
    expect(coerceSelectedSpecies("Sneasler,,Koraidon")).toEqual([
      "Sneasler",
      "Koraidon",
    ]);
  });
});

// =============================================================================
// coerceRangeStart / coerceRangeEnd
// =============================================================================

describe("coerceRangeStart", () => {
  it("returns null when raw is null", () => {
    expect(coerceRangeStart(null)).toBeNull();
  });

  it("returns null when raw is empty string", () => {
    expect(coerceRangeStart("")).toBeNull();
  });

  it("returns the date string when raw is a valid ISO date", () => {
    expect(coerceRangeStart("2025-01-24")).toBe("2025-01-24");
  });

  it("returns null when raw is not a valid date", () => {
    expect(coerceRangeStart("not-a-date")).toBeNull();
  });

  it("rejects non-ISO but parseable dates (e.g. MM/DD/YYYY)", () => {
    expect(coerceRangeStart("01/24/2025")).toBeNull();
  });
});

describe("coerceRangeEnd", () => {
  it("returns null when raw is null", () => {
    expect(coerceRangeEnd(null)).toBeNull();
  });

  it("returns the date string for a valid ISO date", () => {
    expect(coerceRangeEnd("2025-01-31")).toBe("2025-01-31");
  });

  it("returns null for an invalid date", () => {
    expect(coerceRangeEnd("invalid")).toBeNull();
  });
});

import { type PipelineSpeciesData } from "@trainers/supabase";
import { applyPreset, getActivePreset } from "../usage-filters";

// =============================================================================
// Preset helpers
// =============================================================================

function makeSpecies(species: string, usagePct: number): PipelineSpeciesData {
  return {
    species,
    usagePct,
    rank: 0,
    abilities: [],
    items: [],
    natures: [],
    moves: [],
  };
}

const THIRTY_SPECIES = Array.from({ length: 30 }, (_, i) =>
  makeSpecies(`Species${i + 1}`, 70 - i * 2)
);

describe("applyPreset", () => {
  it("returns first 10 species names for 'top10'", () => {
    const result = applyPreset(THIRTY_SPECIES, "top10");
    expect(result).toHaveLength(10);
    expect(result[0]).toBe("Species1");
    expect(result[9]).toBe("Species10");
  });

  it("returns first 20 species names for 'top20'", () => {
    const result = applyPreset(THIRTY_SPECIES, "top20");
    expect(result).toHaveLength(20);
    expect(result[19]).toBe("Species20");
  });

  it("returns first 50 (capped to array length) for 'top50'", () => {
    expect(applyPreset(THIRTY_SPECIES, "top50")).toHaveLength(30);
  });

  it("returns all species for 'all'", () => {
    expect(applyPreset(THIRTY_SPECIES, "all")).toHaveLength(30);
  });

  it("handles fewer species than the preset limit gracefully", () => {
    const five = THIRTY_SPECIES.slice(0, 5);
    expect(applyPreset(five, "top20")).toHaveLength(5);
  });

  it("returns an empty array when data is empty", () => {
    expect(applyPreset([], "top20")).toEqual([]);
  });
});

describe("getActivePreset", () => {
  it("returns 'top10' when selected matches the first 10", () => {
    const top10 = THIRTY_SPECIES.slice(0, 10).map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, top10)).toBe("top10");
  });

  it("returns 'top20' when selected matches the first 20", () => {
    const top20 = THIRTY_SPECIES.slice(0, 20).map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, top20)).toBe("top20");
  });

  it("returns 'all' when selected matches the full set", () => {
    const all = THIRTY_SPECIES.map((s) => s.species);
    expect(getActivePreset(THIRTY_SPECIES, all)).toBe("all");
  });

  it("returns null for a custom (non-preset) selection", () => {
    expect(
      getActivePreset(THIRTY_SPECIES, ["Species1", "Species5"])
    ).toBeNull();
  });

  it("returns null for an empty selection", () => {
    expect(getActivePreset(THIRTY_SPECIES, [])).toBeNull();
  });

  it("is order-insensitive — matches preset even if selected is shuffled", () => {
    const shuffled = ["Species3", "Species1", "Species2"];
    const threeSpecies = THIRTY_SPECIES.slice(0, 3);
    // top10 of a 3-item list = all 3
    expect(getActivePreset(threeSpecies, shuffled)).toBe("top10");
  });
});

// =============================================================================
// coerceColumns
// =============================================================================

import { coerceColumns, DEFAULT_PIPELINE_COLUMNS } from "../usage-filters";

describe("coerceColumns", () => {
  it("returns DEFAULT_PIPELINE_COLUMNS when raw is undefined", () => {
    expect(coerceColumns(undefined)).toEqual(DEFAULT_PIPELINE_COLUMNS);
  });

  it("returns DEFAULT_PIPELINE_COLUMNS when raw is empty string", () => {
    expect(coerceColumns("")).toEqual(DEFAULT_PIPELINE_COLUMNS);
  });

  it("parses a valid comma-separated column list", () => {
    expect(coerceColumns("ability,nature,move")).toEqual([
      "ability",
      "nature",
      "move",
    ]);
  });

  it("includes item in parsed output", () => {
    expect(coerceColumns("ability,item,nature,move")).toEqual([
      "ability",
      "item",
      "nature",
      "move",
    ]);
  });

  it("filters out unknown column names", () => {
    expect(coerceColumns("ability,invalid,nature")).toEqual([
      "ability",
      "nature",
    ]);
  });

  it("returns DEFAULT_PIPELINE_COLUMNS when all values are invalid", () => {
    expect(coerceColumns("foo,bar,baz")).toEqual(DEFAULT_PIPELINE_COLUMNS);
  });

  it("deduplicates repeated columns while preserving first occurrence order", () => {
    expect(coerceColumns("ability,nature,ability,move")).toEqual([
      "ability",
      "nature",
      "move",
    ]);
  });

  it("preserves custom order (move before nature)", () => {
    expect(coerceColumns("ability,move,nature")).toEqual([
      "ability",
      "move",
      "nature",
    ]);
  });
});
