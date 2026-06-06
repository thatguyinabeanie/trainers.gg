import {
  DEFAULT_FORMAT,
  DEFAULT_PERIOD_TYPE,
  DEFAULT_SOURCE,
  DEFAULT_THRESHOLD,
  VALID_MODES,
  VALID_PERIOD_TYPES,
  VALID_SOURCES,
  coerceFormat,
  coerceMode,
  coercePeriodType,
  coerceSource,
  coerceThreshold,
  isValidFormat,
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

  it("DEFAULT_THRESHOLD is 1", () => {
    expect(DEFAULT_THRESHOLD).toBe(1);
  });

  it("VALID_SOURCES contains expected values", () => {
    expect(VALID_SOURCES).toContain("all");
    expect(VALID_SOURCES).toContain("rk9");
    expect(VALID_SOURCES).toContain("limitless");
    expect(VALID_SOURCES).toContain("first-party");
  });

  it("VALID_PERIOD_TYPES contains day, week, month", () => {
    expect(VALID_PERIOD_TYPES).toContain("day");
    expect(VALID_PERIOD_TYPES).toContain("week");
    expect(VALID_PERIOD_TYPES).toContain("month");
  });

  it("VALID_MODES contains stream, stacked, lines", () => {
    expect(VALID_MODES).toContain("stream");
    expect(VALID_MODES).toContain("stacked");
    expect(VALID_MODES).toContain("lines");
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
// coerceMode
// =============================================================================

describe("coerceMode", () => {
  it.each(VALID_MODES)("passes through valid mode '%s'", (mode) => {
    expect(coerceMode(mode)).toBe(mode);
  });

  it("returns 'stream' for undefined", () => {
    expect(coerceMode(undefined)).toBe("stream");
  });

  it("returns 'stream' for null", () => {
    expect(coerceMode(null)).toBe("stream");
  });

  it("returns 'stream' for an empty string", () => {
    expect(coerceMode("")).toBe("stream");
  });

  it.each(["stream2", "STACKED", "area", "bar"])(
    "returns 'stream' for invalid value '%s'",
    (value) => {
      expect(coerceMode(value)).toBe("stream");
    }
  );
});

// =============================================================================
// coerceThreshold
// =============================================================================

describe("coerceThreshold", () => {
  it("parses a valid numeric string", () => {
    expect(coerceThreshold("5")).toBe(5);
    expect(coerceThreshold("0")).toBe(0);
    expect(coerceThreshold("2.5")).toBe(2.5);
    expect(coerceThreshold("10")).toBe(10);
  });

  it("returns DEFAULT_THRESHOLD for undefined", () => {
    expect(coerceThreshold(undefined)).toBe(DEFAULT_THRESHOLD);
  });

  it("returns DEFAULT_THRESHOLD for null", () => {
    expect(coerceThreshold(null)).toBe(DEFAULT_THRESHOLD);
  });

  it("returns DEFAULT_THRESHOLD for NaN string", () => {
    expect(coerceThreshold("abc")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("")).toBe(DEFAULT_THRESHOLD);
    expect(coerceThreshold("NaN")).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps values below 0 to 0", () => {
    expect(coerceThreshold("-1")).toBe(0);
    expect(coerceThreshold("-0.001")).toBe(0);
    expect(coerceThreshold("-100")).toBe(0);
  });

  it("clamps values above 10 to 10", () => {
    expect(coerceThreshold("11")).toBe(10);
    expect(coerceThreshold("10.001")).toBe(10);
    expect(coerceThreshold("999")).toBe(10);
  });

  it("passes through boundary values exactly", () => {
    expect(coerceThreshold("0")).toBe(0);
    expect(coerceThreshold("10")).toBe(10);
  });

  it("handles decimal precision within range", () => {
    expect(coerceThreshold("3.14")).toBeCloseTo(3.14);
    expect(coerceThreshold("9.99")).toBeCloseTo(9.99);
  });
});
