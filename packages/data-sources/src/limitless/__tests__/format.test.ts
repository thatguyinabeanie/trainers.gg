/**
 * @jest-environment node
 */

import {
  LIMITLESS_TO_FORMAT,
  KNOWN_FORMATS,
  ALL_VALID_FORMATS,
} from "../format";

describe("LIMITLESS_TO_FORMAT", () => {
  it("maps known Limitless codes to Showdown format IDs", () => {
    expect(LIMITLESS_TO_FORMAT["M-A"]).toBe("gen9championsvgc2026regma");
    expect(LIMITLESS_TO_FORMAT["SVI"]).toBe("gen9vgc2025regi");
    expect(LIMITLESS_TO_FORMAT["VGC22"]).toBe("gen8vgc2022");
  });

  it("returns undefined for unknown codes", () => {
    expect(LIMITLESS_TO_FORMAT["CUSTOM"]).toBeUndefined();
    expect(LIMITLESS_TO_FORMAT[""]).toBeUndefined();
  });
});

describe("KNOWN_FORMATS", () => {
  it("contains all Limitless format codes", () => {
    expect(KNOWN_FORMATS.has("M-A")).toBe(true);
    expect(KNOWN_FORMATS.has("SVI")).toBe(true);
    expect(KNOWN_FORMATS.has("VGC22")).toBe(true);
  });

  it("does not contain Showdown format IDs", () => {
    expect(KNOWN_FORMATS.has("gen9championsvgc2026regma")).toBe(false);
  });

  it("matches Object.keys of LIMITLESS_TO_FORMAT", () => {
    expect(KNOWN_FORMATS.size).toBe(Object.keys(LIMITLESS_TO_FORMAT).length);
    for (const key of Object.keys(LIMITLESS_TO_FORMAT)) {
      expect(KNOWN_FORMATS.has(key)).toBe(true);
    }
  });
});

describe("ALL_VALID_FORMATS", () => {
  it("contains both Limitless codes and Showdown IDs", () => {
    expect(ALL_VALID_FORMATS.has("SVI")).toBe(true);
    expect(ALL_VALID_FORMATS.has("gen9vgc2025regi")).toBe(true);
  });

  it("contains every Limitless code and every Showdown ID", () => {
    for (const key of Object.keys(LIMITLESS_TO_FORMAT)) {
      expect(ALL_VALID_FORMATS.has(key)).toBe(true);
    }
    for (const val of Object.values(LIMITLESS_TO_FORMAT)) {
      expect(ALL_VALID_FORMATS.has(val)).toBe(true);
    }
  });
});
