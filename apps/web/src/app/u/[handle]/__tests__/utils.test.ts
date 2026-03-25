import { formatPlacement, formatDate } from "../utils";

// ============================================================================
// formatPlacement
// ============================================================================

describe("formatPlacement", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [101, "101st"],
    [111, "111th"],
  ] as const)("formats %i as %s", (input, expected) => {
    expect(formatPlacement(input)).toBe(expected);
  });

  it.each([
    [5, "5th"],
    [10, "10th"],
    [14, "14th"],
    [20, "20th"],
    [23, "23rd"],
    [100, "100th"],
    [102, "102nd"],
    [103, "103rd"],
    [112, "112th"],
    [113, "113th"],
  ] as const)("also formats %i as %s", (input, expected) => {
    expect(formatPlacement(input)).toBe(expected);
  });
});

// ============================================================================
// formatDate
// ============================================================================

describe("formatDate", () => {
  it("formats a valid ISO date string to human-readable format", () => {
    // Use a date that does not depend on timezone offset
    const result = formatDate("2026-03-25T12:00:00Z");

    // The exact format depends on locale, but should contain month, day, year
    expect(result).toContain("Mar");
    expect(result).toContain("25");
    expect(result).toContain("2026");
  });

  it("formats a date-only string", () => {
    const result = formatDate("2026-01-15");

    expect(result).toContain("Jan");
    expect(result).toContain("2026");
  });

  it("formats dates from different months correctly", () => {
    // Use mid-day UTC to avoid timezone offset shifting the date
    const result = formatDate("2025-12-15T12:00:00Z");

    expect(result).toContain("Dec");
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });
});
