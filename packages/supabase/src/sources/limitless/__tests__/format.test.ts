/**
 * Tests for the Limitless format code → Showdown format ID mapping table.
 *
 * PR #379 added the "M-B" → "gen9championsvgc2026regmb" entry (Reg M-B).
 * This file guards that specific entry plus the overall shape of the
 * mapping (KNOWN_FORMATS / ALL_VALID_FORMATS derivation) so a future edit
 * to the table can't silently drop or rename an entry.
 */

import {
  LIMITLESS_TO_FORMAT,
  KNOWN_FORMATS,
  ALL_VALID_FORMATS,
  SKIP_FORMATS,
} from "../format";

describe("LIMITLESS_TO_FORMAT", () => {
  it("maps M-B to the Reg M-B Showdown format id", () => {
    expect(LIMITLESS_TO_FORMAT["M-B"]).toBe("gen9championsvgc2026regmb");
  });

  it.each([
    ["M-A", "gen9championsvgc2026regma"],
    ["M-B", "gen9championsvgc2026regmb"],
    ["SVI", "gen9vgc2025regi"],
    ["SVH", "gen9vgc2024regh"],
    ["SVG", "gen9vgc2024regg"],
    ["SVF", "gen9vgc2024regf"],
    ["SVE", "gen9vgc2024rege"],
    ["VGC23", "gen9vgc2023regd"],
    ["23S3", "gen9vgc2023regc"],
    ["23S2", "gen9vgc2023regb"],
    ["23S1", "gen9vgc2023rega"],
    ["VGC22", "gen8vgc2022"],
  ])(
    "maps Limitless code %s to Showdown format id %s",
    (limitlessCode, showdownId) => {
      expect(LIMITLESS_TO_FORMAT[limitlessCode]).toBe(showdownId);
    }
  );
});

describe("KNOWN_FORMATS", () => {
  it("contains M-B as a known Limitless format code", () => {
    expect(KNOWN_FORMATS.has("M-B")).toBe(true);
  });

  it.each(["M-A", "M-B", "SVI", "SVH", "VGC22"])(
    "contains %s",
    (limitlessCode) => {
      expect(KNOWN_FORMATS.has(limitlessCode)).toBe(true);
    }
  );

  it("is exactly the set of keys in LIMITLESS_TO_FORMAT", () => {
    expect([...KNOWN_FORMATS].sort()).toEqual(
      Object.keys(LIMITLESS_TO_FORMAT).sort()
    );
  });
});

describe("ALL_VALID_FORMATS", () => {
  it("contains the Reg M-B Showdown format id", () => {
    expect(ALL_VALID_FORMATS.has("gen9championsvgc2026regmb")).toBe(true);
  });

  it.each(["M-A", "M-B", "SVI"])(
    "contains Limitless code %s (key side)",
    (limitlessCode) => {
      expect(ALL_VALID_FORMATS.has(limitlessCode)).toBe(true);
    }
  );

  it.each([
    "gen9championsvgc2026regma",
    "gen9championsvgc2026regmb",
    "gen9vgc2025regi",
  ])("contains Showdown format id %s (value side)", (showdownId) => {
    expect(ALL_VALID_FORMATS.has(showdownId)).toBe(true);
  });

  it("does not contain an unrelated/unknown format code", () => {
    expect(ALL_VALID_FORMATS.has("NOT_A_REAL_FORMAT")).toBe(false);
  });
});

describe("SKIP_FORMATS", () => {
  it("contains CUSTOM", () => {
    expect(SKIP_FORMATS.has("CUSTOM")).toBe(true);
  });

  it("does not contain a mapped format code like M-B", () => {
    expect(SKIP_FORMATS.has("M-B")).toBe(false);
  });
});
