import { COUNTRIES, getCountryName, isValidCountryCode } from "../countries";

describe("COUNTRIES", () => {
  it("contains entries", () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
  });

  it("has at least 190 countries", () => {
    // There are 193 UN member states; the list has ~198 entries
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(190);
  });

  it("has all codes as 2-letter uppercase strings", () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has no duplicate country codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("has non-empty name strings for every entry", () => {
    for (const country of COUNTRIES) {
      expect(country.name.length).toBeGreaterThan(0);
    }
  });

  it("contains well-known countries", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain("US");
    expect(codes).toContain("GB");
    expect(codes).toContain("JP");
    expect(codes).toContain("AU");
    expect(codes).toContain("BR");
    expect(codes).toContain("DE");
    expect(codes).toContain("FR");
  });

  it("is sorted alphabetically by name", () => {
    const names = COUNTRIES.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe("getCountryName", () => {
  it('returns "United States" for code "US"', () => {
    expect(getCountryName("US")).toBe("United States");
  });

  it('returns "United Kingdom" for code "GB"', () => {
    expect(getCountryName("GB")).toBe("United Kingdom");
  });

  it('returns "Japan" for code "JP"', () => {
    expect(getCountryName("JP")).toBe("Japan");
  });

  it('returns "Germany" for code "DE"', () => {
    expect(getCountryName("DE")).toBe("Germany");
  });

  it("returns undefined for an invalid country code", () => {
    expect(getCountryName("INVALID")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getCountryName("")).toBeUndefined();
  });

  it("returns undefined for a lowercase valid code", () => {
    // Country codes are case-sensitive uppercase
    expect(getCountryName("us")).toBeUndefined();
  });

  it("returns undefined for a single letter", () => {
    expect(getCountryName("U")).toBeUndefined();
  });

  it("returns undefined for a 3-letter code", () => {
    expect(getCountryName("USA")).toBeUndefined();
  });
});

describe("isValidCountryCode", () => {
  it("returns true for valid country code US", () => {
    expect(isValidCountryCode("US")).toBe(true);
  });

  it("returns true for valid country code JP", () => {
    expect(isValidCountryCode("JP")).toBe(true);
  });

  it("returns true for valid country code GB", () => {
    expect(isValidCountryCode("GB")).toBe(true);
  });

  it("returns false for invalid code XX", () => {
    expect(isValidCountryCode("XX")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidCountryCode("")).toBe(false);
  });

  it("returns false for a lowercase valid code", () => {
    expect(isValidCountryCode("us")).toBe(false);
  });

  it("returns false for a numeric string", () => {
    expect(isValidCountryCode("12")).toBe(false);
  });

  it("returns false for a 3-letter code", () => {
    expect(isValidCountryCode("USA")).toBe(false);
  });

  it("returns false for a random string", () => {
    expect(isValidCountryCode("hello")).toBe(false);
  });
});
